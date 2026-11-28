import fs from 'fs/promises';
import path from 'path';
import type { IncidentCategory } from '@/types/map';
import type {
  DailyTrendPoint,
  ProvinceTrendReportStatus,
  ProvinceTrendRow,
  TrendCategory,
  TrendRange,
  TrendsResponse,
} from '@/types/trends';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots', 'bnpb-2026-11-28');
const PROVINCES_GEOJSON_PATH = path.join(process.cwd(), 'public', 'geo', 'provinces.geojson');

const EONET_2Y_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=730&bbox=94.5,6.5,141.5,-11.5&limit=500';
const NASA_FIRMS_NOAA20_7D_URL =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv';
const NASA_FIRMS_MODIS_7D_URL =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_SouthEast_Asia_7d.csv';
const BMKG_TERKINI_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
const BMKG_DIRASAKAN_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
const BMKG_NOWCAST_RSS_URL = 'https://www.bmkg.go.id/alerts/nowcast/id';
const BNPB_WEEKLY_URL =
  'https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson';
const MAGMA_V1_URL = 'https://magma.esdm.go.id/v1';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const TREND_CATEGORY_LABEL: Record<TrendCategory, string> = {
  ALL: 'Semua Bencana',
  FLOOD: 'Banjir',
  LANDSLIDE: 'Longsor & Akses',
  EARTHQUAKE: 'Gempabumi',
  EXTREME_WEATHER: 'Cuaca Ekstrem',
  VOLCANO: 'Gunung Api',
  OTHER: 'Karhutla (Titik Panas)',
};

interface ProvinceGeoIndex {
  code: string;
  name: string;
  normalizedName: string;
  centroid: [number, number];
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  polys: Array<{
    box: [number, number, number, number];
    rings: number[][][];
  }>;
}

interface TrendEventRecord {
  timeMs: number;
  wibDate: string;
  category: IncidentCategory;
  provinceCode: string | null;
}

interface UsgsCompactSnapshot {
  events?: Array<{ t: number; lng: number; lat: number; mag?: number | null }>;
}

interface EonetEventRaw {
  closed?: string | null;
  categories?: Array<{ id?: string; title?: string }>;
  geometry?: Array<{
    date?: string;
    type?: string;
    coordinates?: unknown;
  }>;
}

interface GdacsFeatureRaw {
  geometry?: { coordinates?: unknown };
  properties?: {
    eventtype?: string;
    fromdate?: string;
    todate?: string;
    country?: string;
  };
}

let cachedProvGeoIndex: ProvinceGeoIndex[] | null = null;

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bprovinsi\b|\bprov\.?\b|\bdaerah istimewa\b|\bdi\b/g, ' ')
    .replace(/\bkep\.?\b/g, 'kepulauan')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-18) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

async function getProvinceGeoIndex(): Promise<ProvinceGeoIndex[]> {
  if (cachedProvGeoIndex) return cachedProvGeoIndex;
  const raw = await fs.readFile(PROVINCES_GEOJSON_PATH, 'utf-8');
  const fc = JSON.parse(raw) as {
    features?: Array<{
      properties?: { code?: string; name?: string };
      geometry?: { type?: string; coordinates?: unknown };
    }>;
  };

  const out: ProvinceGeoIndex[] = [];
  for (const ft of fc.features ?? []) {
    const code = String(ft.properties?.code ?? '').trim();
    const name = String(ft.properties?.name ?? '').trim();
    const geom = ft.geometry;
    if (!code || !name || !geom?.coordinates) continue;

    const rawPolys =
      geom.type === 'Polygon'
        ? [geom.coordinates as number[][][]]
        : geom.type === 'MultiPolygon'
          ? (geom.coordinates as number[][][][])
          : [];

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    const polys: ProvinceGeoIndex['polys'] = [];

    for (const rings of rawPolys) {
      const outer = rings[0];
      if (!outer || outer.length < 4) continue;
      let pMinLng = Infinity;
      let pMinLat = Infinity;
      let pMaxLng = -Infinity;
      let pMaxLat = -Infinity;
      for (const pt of outer) {
        if (pt[0] < pMinLng) pMinLng = pt[0];
        if (pt[0] > pMaxLng) pMaxLng = pt[0];
        if (pt[1] < pMinLat) pMinLat = pt[1];
        if (pt[1] > pMaxLat) pMaxLat = pt[1];
      }
      if (pMinLng < minLng) minLng = pMinLng;
      if (pMaxLng > maxLng) maxLng = pMaxLng;
      if (pMinLat < minLat) minLat = pMinLat;
      if (pMaxLat > maxLat) maxLat = pMaxLat;
      polys.push({ box: [pMinLng, pMinLat, pMaxLng, pMaxLat], rings });
    }

    if (polys.length > 0 && Number.isFinite(minLng)) {
      out.push({
        code,
        name,
        normalizedName: normalizeText(name),
        centroid: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        minLng,
        minLat,
        maxLng,
        maxLat,
        polys,
      });
    }
  }

  out.sort((a, b) => a.name.localeCompare(b.name, 'id'));
  cachedProvGeoIndex = out;
  return out;
}

function resolveProvinceCodeForCoord(
  lng: number,
  lat: number,
  provIndex: ProvinceGeoIndex[],
  allowNearestDeg = 3.0
): string | null {
  for (const prov of provIndex) {
    if (lng < prov.minLng || lng > prov.maxLng || lat < prov.minLat || lat > prov.maxLat) continue;
    for (const poly of prov.polys) {
      const [bx0, by0, bx1, by1] = poly.box;
      if (lng < bx0 || lng > bx1 || lat < by0 || lat > by1) continue;
      if (!pointInRing(lng, lat, poly.rings[0])) continue;
      let inHole = false;
      for (let h = 1; h < poly.rings.length; h++) {
        if (pointInRing(lng, lat, poly.rings[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return prov.code;
    }
  }

  if (allowNearestDeg <= 0) return null;
  let bestCode: string | null = null;
  let bestDistSq = allowNearestDeg * allowNearestDeg;
  for (const prov of provIndex) {
    const dx = prov.centroid[0] - lng;
    const dy = prov.centroid[1] - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      bestCode = prov.code;
    }
  }
  return bestCode;
}

function toWibDateFromMs(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatShortYmd(ymd: string, withShortYear = false): string {
  const [y, m, d] = ymd.split('-').map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return ymd;
  if (withShortYear && Number.isFinite(y)) {
    return `${d} ${SHORT_MONTHS[m - 1]} '${String(y).slice(-2)}`;
  }
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

function formatShortYmdWithYear(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12) return ymd;
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

function extractRssAlertsForTrends(xml: string): Array<{ title: string; pubDate: string }> {
  const items: Array<{ title: string; pubDate: string }> = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  const pick = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
  };
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    items.push({ title: pick(m[1], 'title'), pubDate: pick(m[1], 'pubDate') });
  }
  return items;
}

function buildHeaders(accept = 'application/json, text/plain, */*') {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: accept,
  };
}

async function fetchJsonTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: buildHeaders(),
    next: { revalidate: 1800 },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return (await resp.json()) as T;
}

async function fetchTextTimeout(url: string, timeoutMs = 9000): Promise<string> {
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: buildHeaders('text/csv, text/plain, text/html, */*'),
    next: { revalidate: 1800 },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  return await resp.text();
}

async function readSnapJson<T>(fname: string): Promise<T> {
  const raw = await fs.readFile(path.join(SNAPSHOT_DIR, fname), 'utf-8');
  return JSON.parse(raw) as T;
}

async function readSnapText(fname: string): Promise<string> {
  return fs.readFile(path.join(SNAPSHOT_DIR, fname), 'utf-8');
}

function extractPointCoord(coordsRaw: unknown, geomType?: string): [number, number] | null {
  if (!coordsRaw) return null;
  if (geomType === 'Polygon' && Array.isArray(coordsRaw)) {
    const outer = (coordsRaw as number[][][])[0];
    if (Array.isArray(outer) && outer.length > 0) {
      let minLng = Infinity;
      let maxLng = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      for (const pt of outer) {
        if (!Array.isArray(pt) || pt.length < 2) continue;
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
      if (Number.isFinite(minLng)) return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
    }
  }
  if (Array.isArray(coordsRaw) && typeof coordsRaw[0] === 'number' && typeof coordsRaw[1] === 'number') {
    return [coordsRaw[0], coordsRaw[1]];
  }
  return null;
}

function isInsideIndonesiaBbox(lng: number, lat: number): boolean {
  return lat >= -11.8 && lat <= 6.8 && lng >= 94.2 && lng <= 141.8;
}

async function fetchUsgs2yLive(nowMs: number): Promise<UsgsCompactSnapshot> {
  const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const startIso = toIso(nowMs - 730 * 86_400_000);
  const midIso = toIso(nowMs - 365 * 86_400_000);
  const endIso = toIso(nowMs);

  const chunks = await Promise.all([
    fetchJsonTimeout<{
      features?: Array<{ properties?: { time?: number; mag?: number }; geometry?: { coordinates?: number[] } }>;
    }>(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5&minmagnitude=4.0&starttime=${startIso}&endtime=${midIso}&limit=10000`,
      10000
    ),
    fetchJsonTimeout<{
      features?: Array<{ properties?: { time?: number; mag?: number }; geometry?: { coordinates?: number[] } }>;
    }>(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5&minmagnitude=4.0&starttime=${midIso}&endtime=${endIso}&limit=10000`,
      10000
    ),
  ]);

  const events: Array<{ t: number; lng: number; lat: number; mag?: number | null }> = [];
  for (const chunk of chunks) {
    for (const ft of chunk.features ?? []) {
      const t = ft.properties?.time;
      const coords = ft.geometry?.coordinates;
      if (typeof t !== 'number' || !coords || coords.length < 2) continue;
      events.push({
        t,
        lng: coords[0],
        lat: coords[1],
        mag: typeof ft.properties?.mag === 'number' ? ft.properties.mag : null,
      });
    }
  }
  return { events };
}

async function fetchGdacs2yLive(nowMs: number): Promise<{ features: GdacsFeatureRaw[] }> {
  const fromIso = new Date(nowMs - 730 * 86_400_000).toISOString().slice(0, 10);
  const toIso = new Date(nowMs).toISOString().slice(0, 10);
  const types = ['FL', 'TC', 'VO', 'WF'];
  const results = await Promise.all(
    types.map((ev) =>
      fetchJsonTimeout<{ features?: GdacsFeatureRaw[] }>(
        `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=${fromIso}&toDate=${toIso}&alertlevel=Green;Orange;Red&country=Indonesia&eventlist=${ev}&limit=500`,
        9000
      )
    )
  );
  const features: GdacsFeatureRaw[] = [];
  for (const res of results) {
    if (res.features) features.push(...res.features);
  }
  return { features };
}

function extractMagmaJsonArray(html: string): Array<{
  ga_lon_gapi?: number;
  ga_lat_gapi?: number;
  ga_prov_gapi?: string;
  ga_status?: number | string;
}> {
  const markerIdx = html.indexOf('markersGunungApi');
  if (markerIdx === -1) throw new Error('markersGunungApi not found');
  const start = html.indexOf('[', markerIdx);
  if (start === -1) throw new Error('Array start not found');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1));
      }
    }
  }
  throw new Error('Unclosed MAGMA array');
}

function mapEonetCategory(catId?: string): IncidentCategory | null {
  switch ((catId ?? '').toLowerCase()) {
    case 'floods':
      return 'FLOOD';
    case 'severestorms':
      return 'EXTREME_WEATHER';
    case 'volcanoes':
      return 'VOLCANO';
    case 'wildfires':
      return 'OTHER';
    case 'landslides':
      return 'LANDSLIDE';
    default:
      return null;
  }
}

function mapGdacsCategory(evType?: string): IncidentCategory | null {
  switch ((evType ?? '').toUpperCase()) {
    case 'FL':
      return 'FLOOD';
    case 'TC':
    case 'ST':
      return 'EXTREME_WEATHER';
    case 'VO':
      return 'VOLCANO';
    case 'WF':
      return 'OTHER';
    default:
      return null;
  }
}

function classifyMingguan(raw?: string | null): IncidentCategory {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('banjir')) return 'FLOOD';
  if (s.includes('longsor')) return 'LANDSLIDE';
  if (s.includes('cuaca') || s.includes('angin')) return 'EXTREME_WEATHER';
  if (s.includes('gempa')) return 'EARTHQUAKE';
  return 'OTHER';
}

function classifyPuCause(cause?: string | null, damage?: string | null): IncidentCategory {
  const s = `${cause ?? ''} ${damage ?? ''}`.toLowerCase();
  if (s.includes('banjir') || s.includes('genangan') || s.includes('luapan')) return 'FLOOD';
  if (s.includes('angin') || s.includes('cuaca')) return 'EXTREME_WEATHER';
  return 'LANDSLIDE';
}

function parseFirmsTimestampMs(acqDate?: string, acqTime?: string): number {
  if (!acqDate) return Date.now();
  const padded = (acqTime ?? '0000').padStart(4, '0');
  const iso = `${acqDate.trim()}T${padded.slice(0, 2)}:${padded.slice(2, 4)}:00Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Date.now() : ms;
}

function computeProvinceReport(weekly4: [number, number, number, number]): {
  status: ProvinceTrendReportStatus;
  label: string;
} {
  const [w4, w3, w2, w1] = weekly4;
  if (w4 === 0 && w3 === 0 && w2 === 0 && w1 === 0) {
    return { status: 'NO_DATA', label: 'Tidak ada kejadian' };
  }
  if (w1 > w2) {
    let streak = 1;
    if (w2 > w3) {
      streak = 2;
      if (w3 > w4) streak = 3;
    }
    if (streak >= 2) {
      return {
        status: 'WORSENING_STREAK',
        label: `▲ Memburuk ${streak} minggu berturut-turut`,
      };
    }
    return { status: 'WORSENING', label: '▲ Memburuk minggu ini' };
  }
  if (w1 < w2) {
    let streak = 1;
    if (w2 < w3) {
      streak = 2;
      if (w3 < w4) streak = 3;
    }
    if (streak >= 2) {
      return {
        status: 'IMPROVING_STREAK',
        label: `▼ Membaik ${streak} minggu berturut-turut`,
      };
    }
    return { status: 'IMPROVING', label: '▼ Membaik minggu ini' };
  }
  return { status: 'STABLE', label: 'Stabil' };
}

function calcPctAndRatio(
  curr: number,
  prev: number
): { pct: number | null; ratio: number | null } {
  if (prev === 0) {
    return curr === 0 ? { pct: 0, ratio: null } : { pct: null, ratio: null };
  }
  const pct = Math.round(((curr - prev) / prev) * 100);
  const ratio = curr / prev >= 3 ? Math.round(curr / prev) : null;
  return { pct, ratio };
}

export async function getDisasterTrends(options?: {
  category?: TrendCategory;
  rangeDays?: TrendRange;
}): Promise<TrendsResponse> {
  const category: TrendCategory = options?.category ?? 'ALL';
  const rangeDays: TrendRange = options?.rangeDays ?? 30;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayWib = toWibDateFromMs(nowMs);

  const provIndex = await getProvinceGeoIndex();
  const provByNormName = new Map(provIndex.map((p) => [p.normalizedName, p.code]));
  const matchProvByName = (raw?: string | null): string | null => {
    if (!raw) return null;
    const norm = normalizeText(raw);
    if (!norm) return null;
    if (provByNormName.has(norm)) return provByNormName.get(norm)!;
    for (const p of provIndex) {
      if (norm.includes(p.normalizedName) || p.normalizedName.includes(norm)) {
        return p.code;
      }
    }
    return null;
  };

  let usgsLive = true;
  let eonetLive = true;
  let gdacsLive = true;
  let firms7dLive = true;
  let bnpbWeeklyLive = true;
  let bmkgLive = true;
  let magmaLive = true;

  const [
    usgsRaw,
    eonetRaw,
    gdacsRaw,
    firmsNoaaCsv,
    firmsModisCsv,
    bnpbWeeklyRaw,
    puRaw,
    bmkgTerkini,
    bmkgDirasakan,
    bmkgNowcastAlerts,
    magmaList,
  ] = await Promise.all([
    fetchUsgs2yLive(nowMs).catch(async () => {
      usgsLive = false;
      return readSnapJson<UsgsCompactSnapshot>('usgs_2y_idn.json');
    }),
    fetchJsonTimeout<{ events?: EonetEventRaw[] }>(EONET_2Y_URL, 9000).catch(async () => {
      eonetLive = false;
      return readSnapJson<{ events?: EonetEventRaw[] }>('eonet_2y_idn.json');
    }),
    fetchGdacs2yLive(nowMs).catch(async () => {
      gdacsLive = false;
      return readSnapJson<{ features?: GdacsFeatureRaw[] }>('gdacs_2y_idn.json');
    }),
    fetchTextTimeout(NASA_FIRMS_NOAA20_7D_URL, 10000).catch(async () => {
      firms7dLive = false;
      return readSnapText('nasa_firms_noaa20_7d.csv');
    }),
    fetchTextTimeout(NASA_FIRMS_MODIS_7D_URL, 10000).catch(async () => {
      firms7dLive = false;
      return readSnapText('nasa_firms_modis_7d.csv');
    }),
    fetchJsonTimeout<{
      features?: Array<{
        attributes: { dt?: number | null; kategori_bencana?: string | null; id_kab_sdi?: string | null };
      }>;
    }>(BNPB_WEEKLY_URL, 7000).catch(async () => {
      bnpbWeeklyLive = false;
      return readSnapJson<{
        features?: Array<{
          attributes: { dt?: number | null; kategori_bencana?: string | null; id_kab_sdi?: string | null };
        }>;
      }>('kejadian_bencana_mingguan.json');
    }),
    readSnapJson<{
      features?: Array<{
        attributes: {
          dt?: number | null;
          cause?: string | null;
          damage?: string | null;
          lat?: number | null;
          lon?: number | null;
          id_desa_sdi?: string | null;
          provinsi?: string | null;
        };
      }>;
    }>('data_jalan_jembatan_putus_akses_pu.json').catch(() => ({ features: [] })),
    fetchJsonTimeout<{ Infogempa?: { gempa?: Array<{ DateTime?: string; Coordinates?: string }> } }>(
      BMKG_TERKINI_URL,
      6000
    ).catch(async () => {
      bmkgLive = false;
      return readSnapJson<{ Infogempa?: { gempa?: Array<{ DateTime?: string; Coordinates?: string }> } }>(
        'bmkg_gempaterkini.json'
      );
    }),
    fetchJsonTimeout<{ Infogempa?: { gempa?: Array<{ DateTime?: string; Coordinates?: string }> } }>(
      BMKG_DIRASAKAN_URL,
      6000
    ).catch(async () => {
      bmkgLive = false;
      return readSnapJson<{ Infogempa?: { gempa?: Array<{ DateTime?: string; Coordinates?: string }> } }>(
        'bmkg_gempadirasakan.json'
      );
    }),
    fetchTextTimeout(BMKG_NOWCAST_RSS_URL, 6000)
      .then((xml) => extractRssAlertsForTrends(xml))
      .catch(async () => {
        const snap = await readSnapJson<{
          alerts?: Array<{
            title?: string;
            pubDate?: string;
            cap?: { headline?: string; effective?: string; areas?: Array<{ areaDesc?: string }> } | null;
          }>;
        }>('bmkg_nowcast_snapshot.json').catch(() => ({ alerts: [] }));
        return (snap.alerts ?? []).map((a) => ({
          title: `${a.cap?.headline ?? a.title ?? ''} ${a.cap?.areas?.map((ar) => ar.areaDesc).join(' ') ?? ''}`.trim(),
          pubDate: a.cap?.effective || a.pubDate || '',
        }));
      }),
    fetchTextTimeout(MAGMA_V1_URL, 7000)
      .then((html) => extractMagmaJsonArray(html))
      .catch(async () => {
        magmaLive = false;
        const snap = await readSnapJson<{
          volcanoes?: Array<{
            ga_lon_gapi?: number;
            ga_lat_gapi?: number;
            ga_prov_gapi?: string;
            ga_status?: number | string;
          }>;
        }>('magma_volcanoes.json');
        return snap.volcanoes ?? [];
      }),
  ]);

  const useFirmsHotspotStream = category === 'OTHER' && rangeDays === 7;
  const records: TrendEventRecord[] = [];

  if (useFirmsHotspotStream) {
    // Exact 7-day NASA FIRMS VIIRS NOAA-20 + MODIS Indonesia satellite hotspots
    const seenCells = new Set<string>();
    const ingestCsv = (csvText: string) => {
      const lines = csvText.trim().split(/\r?\n/);
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim());
      const iLat = headers.indexOf('latitude');
      const iLng = headers.indexOf('longitude');
      const iDate = headers.indexOf('acq_date');
      const iTime = headers.indexOf('acq_time');
      const iConf = headers.indexOf('confidence');
      if (iLat === -1 || iLng === -1 || iDate === -1) return;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length <= Math.max(iLat, iLng, iDate)) continue;
        const lat = Number.parseFloat(cols[iLat]);
        const lng = Number.parseFloat(cols[iLng]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideIndonesiaBbox(lng, lat)) continue;

        const confRaw = (cols[iConf] ?? '').trim().toLowerCase();
        if (confRaw === 'l' || confRaw === 'low') continue;
        const confNum = Number.parseFloat(confRaw);
        if (Number.isFinite(confNum) && confNum < 55) continue;

        const provCode = resolveProvinceCodeForCoord(lng, lat, provIndex, 0);
        if (!provCode) continue;

        const timeMs = parseFirmsTimestampMs(cols[iDate], iTime >= 0 ? cols[iTime] : '0000');
        const wibDate = toWibDateFromMs(timeMs);
        const key = `${wibDate}|${Math.round(lat * 100)}|${Math.round(lng * 100)}`;
        if (seenCells.has(key)) continue;
        seenCells.add(key);

        records.push({
          timeMs,
          wibDate,
          category: 'OTHER',
          provinceCode: provCode,
        });
      }
    };

    ingestCsv(firmsNoaaCsv);
    ingestCsv(firmsModisCsv);
  } else {
    // Multi-hazard continuous 730-day verified event stream
    const eqCoords: Array<{ timeMs: number; lng: number; lat: number }> = [];

    if (category === 'ALL' || category === 'EARTHQUAKE') {
      for (const ev of usgsRaw.events ?? []) {
        if (typeof ev.t !== 'number') continue;
        const provCode = resolveProvinceCodeForCoord(ev.lng, ev.lat, provIndex, 3.0);
        eqCoords.push({ timeMs: ev.t, lng: ev.lng, lat: ev.lat });
        records.push({
          timeMs: ev.t,
          wibDate: toWibDateFromMs(ev.t),
          category: 'EARTHQUAKE',
          provinceCode: provCode,
        });
      }

      for (const eq of [...(bmkgDirasakan.Infogempa?.gempa ?? []), ...(bmkgTerkini.Infogempa?.gempa ?? [])]) {
        if (!eq.DateTime || !eq.Coordinates) continue;
        const ms = Date.parse(eq.DateTime);
        const parts = eq.Coordinates.split(',').map((s) => Number.parseFloat(s.trim()));
        if (Number.isNaN(ms) || parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) continue;
        const lat = parts[0];
        const lng = parts[1];
        const dup = eqCoords.some(
          (u) => Math.abs(u.timeMs - ms) < 2 * 3600_000 && Math.hypot(u.lng - lng, u.lat - lat) < 0.8
        );
        if (dup) continue;
        eqCoords.push({ timeMs: ms, lng, lat });
        records.push({
          timeMs: ms,
          wibDate: toWibDateFromMs(ms),
          category: 'EARTHQUAKE',
          provinceCode: resolveProvinceCodeForCoord(lng, lat, provIndex, 3.0),
        });
      }
    }

    const eonetTrack: Array<{ timeMs: number; lng: number; lat: number; cat: IncidentCategory }> = [];
    for (const ev of eonetRaw.events ?? []) {
      const cat = mapEonetCategory(ev.categories?.[0]?.id);
      if (!cat) continue;
      if (category !== 'ALL' && cat !== category) continue;

      const geoms = ev.geometry ?? [];
      const firstGeom = geoms[0];
      if (!firstGeom?.date) continue;
      const pt = extractPointCoord(firstGeom.coordinates, firstGeom.type);
      if (!pt || !isInsideIndonesiaBbox(pt[0], pt[1])) continue;
      const ms = Date.parse(firstGeom.date);
      if (Number.isNaN(ms)) continue;

      eonetTrack.push({ timeMs: ms, lng: pt[0], lat: pt[1], cat });
      records.push({
        timeMs: ms,
        wibDate: toWibDateFromMs(ms),
        category: cat,
        provinceCode: resolveProvinceCodeForCoord(pt[0], pt[1], provIndex, 2.5),
      });
    }

    for (const ft of gdacsRaw.features ?? []) {
      const cat = mapGdacsCategory(ft.properties?.eventtype);
      if (!cat) continue;
      if (category !== 'ALL' && cat !== category) continue;

      const coords = ft.geometry?.coordinates;
      if (!Array.isArray(coords) || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') continue;
      const lng = coords[0];
      const lat = coords[1];
      if (!isInsideIndonesiaBbox(lng, lat)) continue;

      const dateRaw = ft.properties?.fromdate || ft.properties?.todate;
      if (!dateRaw) continue;
      const ms = Date.parse(dateRaw.endsWith('Z') ? dateRaw : `${dateRaw}Z`);
      if (Number.isNaN(ms)) continue;

      const dupEonet = eonetTrack.some(
        (e) => e.cat === cat && Math.abs(e.timeMs - ms) < 48 * 3600_000 && Math.hypot(e.lng - lng, e.lat - lat) < 1.2
      );
      if (dupEonet) continue;

      records.push({
        timeMs: ms,
        wibDate: toWibDateFromMs(ms),
        category: cat,
        provinceCode: resolveProvinceCodeForCoord(lng, lat, provIndex, 2.5),
      });
    }

    // BNPB Mingguan
    for (const ft of bnpbWeeklyRaw.features ?? []) {
      const a = ft.attributes;
      if (typeof a.dt !== 'number') continue;
      const cat = classifyMingguan(a.kategori_bencana);
      if (category !== 'ALL' && cat !== category) continue;
      const provCode = a.id_kab_sdi ? String(a.id_kab_sdi).replace(/\./g, '').slice(0, 2) : null;
      records.push({
        timeMs: a.dt,
        wibDate: toWibDateFromMs(a.dt),
        category: cat,
        provinceCode: provCode && provIndex.some((p) => p.code === provCode) ? provCode : null,
      });
    }

    // SITABA Kementerian PU (Landslide / Flood road & bridge cut-offs)
    if (category === 'ALL' || category === 'LANDSLIDE' || category === 'FLOOD' || category === 'EXTREME_WEATHER') {
      for (const ft of puRaw.features ?? []) {
        const a = ft.attributes;
        if (typeof a.dt !== 'number') continue;
        const cat = classifyPuCause(a.cause, a.damage);
        if (category !== 'ALL' && cat !== category) continue;
        let provCode: string | null = null;
        if (typeof a.lon === 'number' && typeof a.lat === 'number' && isInsideIndonesiaBbox(a.lon, a.lat)) {
          provCode = resolveProvinceCodeForCoord(a.lon, a.lat, provIndex, 1.0);
        }
        if (!provCode && a.id_desa_sdi) {
          const candidate = String(a.id_desa_sdi).split('.')[0]?.padStart(2, '0');
          if (candidate && provIndex.some((p) => p.code === candidate)) provCode = candidate;
        }
        if (!provCode && a.provinsi) {
          provCode = matchProvByName(a.provinsi);
        }
        records.push({
          timeMs: a.dt,
          wibDate: toWibDateFromMs(a.dt),
          category: cat,
          provinceCode: provCode,
        });
      }
    }

    // PVMBG MAGMA elevated active volcanoes (counted once on latest update day if not already in EONET/GDACS)
    if (category === 'ALL' || category === 'VOLCANO') {
      for (const v of magmaList) {
        const st = Number(v.ga_status ?? 0);
        if (!Number.isFinite(st) || st < 2) continue;
        const lng = Number(v.ga_lon_gapi);
        const lat = Number(v.ga_lat_gapi);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        const provCode =
          resolveProvinceCodeForCoord(lng, lat, provIndex, 1.5) ?? matchProvByName(v.ga_prov_gapi);
        records.push({
          timeMs: nowMs,
          wibDate: todayWib,
          category: 'VOLCANO',
          provinceCode: provCode,
        });
      }
    }

    // BMKG Nowcast CAP extreme weather alerts
    if (category === 'ALL' || category === 'EXTREME_WEATHER') {
      for (const alert of bmkgNowcastAlerts) {
        if (!alert.title) continue;
        const parsedMs = alert.pubDate ? Date.parse(alert.pubDate) : NaN;
        const timeMs = Number.isNaN(parsedMs) ? nowMs : parsedMs;
        records.push({
          timeMs,
          wibDate: toWibDateFromMs(timeMs),
          category: 'EXTREME_WEATHER',
          provinceCode: matchProvByName(alert.title),
        });
      }
    }
  }

  // Always anchor to current Indonesian calendar date (2026); only step back 1 day for rolling FIRMS 7d if latest UTC day hasn't crossed WIB midnight
  let maxDate = '';
  for (const r of records) {
    if (r.wibDate <= todayWib && r.wibDate > maxDate) {
      maxDate = r.wibDate;
    }
  }
  const yesterdayWib = addDaysYmd(todayWib, -1);
  const anchorDate =
    useFirmsHotspotStream && maxDate && maxDate >= yesterdayWib ? maxDate : todayWib;

  // Build lookup of counts per date and per (province, date)
  const dailyTotals = new Map<string, number>();
  const provDateCounts = new Map<string, Map<string, number>>();
  for (const p of provIndex) provDateCounts.set(p.code, new Map());

  for (const r of records) {
    if (r.wibDate > anchorDate) continue;
    dailyTotals.set(r.wibDate, (dailyTotals.get(r.wibDate) ?? 0) + 1);
    if (r.provinceCode && provDateCounts.has(r.provinceCode)) {
      const pm = provDateCounts.get(r.provinceCode)!;
      pm.set(r.wibDate, (pm.get(r.wibDate) ?? 0) + 1);
    }
  }

  const hasPrevYearComparison = !useFirmsHotspotStream;
  const dailySeries: DailyTrendPoint[] = [];
  let totalRangeCount = 0;
  let peakDay: { date: string; label: string; count: number } | null = null;

  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    const date = addDaysYmd(anchorDate, -offset);
    const label = formatShortYmd(date, rangeDays === 365);
    const count = dailyTotals.get(date) ?? 0;
    const prevDate = addDaysYmd(date, -365);
    const prevYearCount = hasPrevYearComparison ? (dailyTotals.get(prevDate) ?? 0) : undefined;

    totalRangeCount += count;
    if (!peakDay || count > peakDay.count) {
      peakDay = { date, label: formatShortYmdWithYear(date), count };
    }
    dailySeries.push({ date, label, count, prevYearCount });
  }

  const sumWindow = (map: Map<string, number>, startOffsetNeg: number, endOffsetNeg: number): number => {
    let total = 0;
    for (let off = startOffsetNeg; off <= endOffsetNeg; off++) {
      total += map.get(addDaysYmd(anchorDate, off)) ?? 0;
    }
    return total;
  };

  const last7dCount = sumWindow(dailyTotals, -6, 0);
  const prev7dCount = hasPrevYearComparison ? sumWindow(dailyTotals, -13, -7) : 0;
  const prevYear7dCount = hasPrevYearComparison ? sumWindow(dailyTotals, -371, -365) : 0;

  const weekCmp = hasPrevYearComparison
    ? calcPctAndRatio(last7dCount, prev7dCount)
    : { pct: null, ratio: null };
  const yearCmp = hasPrevYearComparison
    ? calcPctAndRatio(last7dCount, prevYear7dCount)
    : { pct: null, ratio: null };

  let worseStreak2Plus = 0;
  let betterStreak2Plus = 0;

  const provinces: ProvinceTrendRow[] = provIndex.map((prov) => {
    const pm = provDateCounts.get(prov.code)!;
    const count7d = sumWindow(pm, -6, 0);
    const prev7d = hasPrevYearComparison ? sumWindow(pm, -13, -7) : 0;
    const count30d = hasPrevYearComparison ? sumWindow(pm, -29, 0) : count7d;
    const prevYear7d = hasPrevYearComparison ? sumWindow(pm, -371, -365) : 0;
    const w4 = hasPrevYearComparison ? sumWindow(pm, -27, -21) : 0;
    const w3 = hasPrevYearComparison ? sumWindow(pm, -20, -14) : 0;
    const w2 = hasPrevYearComparison ? sumWindow(pm, -13, -7) : 0;
    const w1 = count7d;
    const weekly4: [number, number, number, number] = [w4, w3, w2, w1];

    const report = hasPrevYearComparison
      ? computeProvinceReport(weekly4)
      : count7d > 0
        ? { status: 'STABLE' as const, label: 'Terpantau 7 hari terakhir' }
        : { status: 'NO_DATA' as const, label: 'Tidak ada titik panas' };

    if (report.status === 'WORSENING_STREAK') worseStreak2Plus += 1;
    if (report.status === 'IMPROVING_STREAK') betterStreak2Plus += 1;

    const pWeek = hasPrevYearComparison ? calcPctAndRatio(count7d, prev7d) : { pct: null, ratio: null };
    const pYear = hasPrevYearComparison
      ? calcPctAndRatio(count7d, prevYear7d)
      : { pct: null, ratio: null };

    return {
      code: prov.code,
      name: prov.name,
      count7d,
      prev7d,
      diff7d: count7d - prev7d,
      pctVsPrevWeek: pWeek.pct,
      count30d,
      prevYear7d,
      pctVsPrevYear: pYear.pct,
      ratioVsPrevYear: pYear.ratio,
      weekly4,
      reportStatus: report.status,
      reportLabel: report.label,
    };
  });

  provinces.sort((a, b) => b.count7d - a.count7d || b.count30d - a.count30d || a.name.localeCompare(b.name, 'id'));

  const topIncreases = hasPrevYearComparison
    ? [...provinces]
        .filter((p) => p.diff7d > 0)
        .sort((a, b) => b.diff7d - a.diff7d || b.count7d - a.count7d)
        .slice(0, 5)
    : provinces.filter((p) => p.count7d > 0).slice(0, 5);

  const sourceSummary = useFirmsHotspotStream
    ? 'Satelit NASA EOSDIS FIRMS (VIIRS NOAA-20 & MODIS Terra/Aqua) 7 hari terakhir pada tingkat kepercayaan Sedang/Tinggi. Pilih rentang 30/90/365 hari untuk tren kejadian Karhutla 2 tahun & perbandingan tahun lalu.'
    : 'Agregasi historis USGS Earthquake Program (M4.0+, 2 tahun), NASA EONET v3 (730 hari), GDACS (UN OCHA & Copernicus, 2 tahun), BMKG TEWS, PVMBG MAGMA Indonesia, BNPB Kejadian Mingguan, dan SITABA Kementerian PU.';

  return {
    updatedAt: nowIso,
    dataUntilDate: anchorDate,
    dataUntilLabel: formatShortYmdWithYear(anchorDate),
    category,
    categoryLabel: TREND_CATEGORY_LABEL[category],
    rangeDays,
    unitLabel: useFirmsHotspotStream
      ? 'titik panas'
      : category === 'OTHER'
        ? 'kejadian karhutla'
        : 'kejadian',
    hasPrevYearComparison,
    periodLabels: {
      current7d: `${formatShortYmd(addDaysYmd(anchorDate, -6))} – ${formatShortYmdWithYear(anchorDate)}`,
      prev7d: `${formatShortYmd(addDaysYmd(anchorDate, -13))} – ${formatShortYmdWithYear(addDaysYmd(anchorDate, -7))}`,
      prevYear7d: `${formatShortYmd(addDaysYmd(anchorDate, -371))} – ${formatShortYmdWithYear(addDaysYmd(anchorDate, -365))}`,
    },
    summary: {
      last7dCount,
      prev7dCount,
      pctVsPrevWeek: weekCmp.pct,
      prevYear7dCount,
      pctVsPrevYear: yearCmp.pct,
      ratioVsPrevYear: yearCmp.ratio,
      totalRangeCount,
      avgPerDay: Math.round(totalRangeCount / rangeDays),
      peakDay,
    },
    dailySeries,
    topIncreases,
    provinces,
    streakCounts: {
      worseStreak2Plus,
      betterStreak2Plus,
    },
    liveStatus: {
      usgs: usgsLive ? 'live' : 'snapshot',
      eonet: eonetLive ? 'live' : 'snapshot',
      gdacs: gdacsLive ? 'live' : 'snapshot',
      nasaFirms7d: firms7dLive ? 'live' : 'snapshot',
      bnpbWeekly: bnpbWeeklyLive ? 'live' : 'snapshot',
      bmkg: bmkgLive ? 'live' : 'snapshot',
      magmaVolcano: magmaLive ? 'live' : 'snapshot',
      puAccess: 'snapshot',
    },
    sourceSummary,
  };
}
