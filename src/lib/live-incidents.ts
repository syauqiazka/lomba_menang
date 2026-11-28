import fs from 'fs/promises';
import path from 'path';
import {
  getBmkgRealtimeEarthquakes,
  getCachedRegenciesByNameLen,
  matchFeltRegencies,
  normalizeRegencyName,
  type RegencyLookupRef,
} from '@/lib/bmkg-realtime';
import { withSwrCache } from '@/lib/server-cache';
import type {
  DisasterIncidentDTO,
  IncidentCategory,
  IncidentsFeedResponse,
  SpreadRegionDTO,
} from '@/types/map';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots', 'bnpb-2026-11-28');
const PROVINCES_GEOJSON_PATH = path.join(process.cwd(), 'public', 'geo', 'provinces.geojson');

const BNPB_WEEKLY_URL =
  'https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson';
const PU_LAYER_URL =
  'https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13';
const NTT_LAYER_URL =
  'https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40';
const NASA_FIRMS_NOAA20_URL =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv';
const NASA_FIRMS_MODIS_URL =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_SouthEast_Asia_7d.csv';
const USGS_EQ_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5&minmagnitude=4.0&limit=25';
const BMKG_NOWCAST_RSS_URL = 'https://www.bmkg.go.id/alerts/nowcast/id';
const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const MAGMA_V1_URL = 'https://magma.esdm.go.id/v1';
const GDACS_RSS_URL = 'https://www.gdacs.org/xml/rss.xml';

type RegencyRef = RegencyLookupRef;

interface ProvincePolyIndex {
  code: string;
  name: string;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  polys: Array<{
    box: [number, number, number, number];
    rings: number[][][];
  }>;
}

interface PuFeature {
  attributes: {
    uid?: string;
    id_desa_sdi?: string;
    desa?: string;
    kecamatan?: string;
    kabupaten?: string;
    provinsi?: string;
    dt?: number | null;
    name?: string | null;
    lat?: number | null;
    lon?: number | null;
    cause?: string | null;
    damage?: string | null;
    sumber?: string | null;
  };
}

interface MingguanFeature {
  attributes: {
    id?: number | string;
    objectid?: number;
    dt?: number | null;
    kabupaten?: string | null;
    kategori_bencana?: string | null;
    id_kab_sdi?: string | null;
    meninggal?: number | null;
    menderita?: number | null;
    mengungsi?: number | null;
    rumah_rusak?: number | null;
    jembatan_rusak?: number | null;
    kondisi_mutakhir?: string | null;
  };
}

interface NttFeature {
  attributes: {
    id_kab?: string | null;
    provinsi?: string | null;
    kabupaten?: string | null;
    tanggal_update?: number | null;
    meninggal?: number | null;
    luka_sakit_?: number | null;
    mengungsi_?: number | null;
    rumah_rusak?: number | null;
    total_rumah_verif?: number | null;
    jumlah_jalan?: number | null;
  };
}

interface BansorFeature {
  attributes: {
    id_kab_sdi?: string | null;
    kabupaten?: string | null;
    kategori_bencana?: string | null;
    menderita?: number | null;
    mengungsi?: number | null;
    tot_rumah_rusak?: number | null;
    rumah_rusak?: number | null;
  };
}

interface KarhutlaProvFeature {
  attributes: {
    id_prov?: string | null;
    provinsi?: string | null;
    tgl_update?: string | null;
    luas_lahan_terbakar_sipongi_2026?: number | null;
    kualitas_udara_pm25?: string | null;
    kesimpulan?: string | null;
  };
}

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    url?: string | null;
    tsunami?: number | null;
    title?: string | null;
  };
  geometry?: {
    coordinates?: number[];
  };
}

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  FLOOD: 'Banjir',
  LANDSLIDE: 'Longsor & Akses',
  EARTHQUAKE: 'Gempabumi',
  EXTREME_WEATHER: 'Cuaca Ekstrem',
  VOLCANO: 'Gunung Api',
  OTHER: 'Karhutla (Satelit)',
};

let cachedProvinceIndex: ProvincePolyIndex[] | null = null;

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

async function getProvinceIndex(): Promise<ProvincePolyIndex[]> {
  if (cachedProvinceIndex) return cachedProvinceIndex;
  const raw = await fs.readFile(PROVINCES_GEOJSON_PATH, 'utf-8');
  const fc = JSON.parse(raw) as {
    features?: Array<{
      properties?: { code?: string; name?: string };
      geometry?: { type?: string; coordinates?: unknown };
    }>;
  };

  const out: ProvincePolyIndex[] = [];
  for (const ft of fc.features ?? []) {
    const code = String(ft.properties?.code ?? '').trim();
    const name = String(ft.properties?.name ?? '').trim();
    const geom = ft.geometry;
    if (!code || !geom?.coordinates) continue;

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
    const polys: ProvincePolyIndex['polys'] = [];

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

    if (polys.length > 0) {
      out.push({ code, name, minLng, minLat, maxLng, maxLat, polys });
    }
  }

  cachedProvinceIndex = out;
  return out;
}

function findIndonesianProvince(
  lng: number,
  lat: number,
  provIndex: ProvincePolyIndex[]
): { code: string; name: string } | null {
  for (const prov of provIndex) {
    if (lng < prov.minLng || lng > prov.maxLng || lat < prov.minLat || lat > prov.maxLat) {
      continue;
    }
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
      if (!inHole) return { code: prov.code, name: prov.name };
    }
  }
  return null;
}

function findNearestRegencyInProvince(
  lng: number,
  lat: number,
  provCode: string,
  regsByProv: Map<string, RegencyRef[]>
): RegencyRef | null {
  const candidates = regsByProv.get(provCode);
  if (!candidates || candidates.length === 0) return null;
  let best: RegencyRef | null = null;
  let bestD2 = Infinity;
  for (const r of candidates) {
    if (!r.centroid) continue;
    const dx = r.centroid[0] - lng;
    const dy = r.centroid[1] - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = r;
    }
  }
  return best ?? candidates[0];
}

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/●/g, '•')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCode4(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\./g, '').trim();
  return /^\d{4}$/.test(digits) ? digits : null;
}

function codeFromDesaSdi(raw?: string | null): string | null {
  if (!raw) return null;
  const parts = raw.trim().split('.');
  if (parts.length < 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  return parts[0].padStart(2, '0') + parts[1].padStart(2, '0');
}

function classifyPuIncident(name?: string | null, cause?: string | null, damage?: string | null): IncidentCategory {
  const txt = `${name ?? ''} ${stripHtml(cause)} ${stripHtml(damage)}`.toLowerCase();
  if (txt.includes('banjir') || txt.includes('genangan') || txt.includes('luapan') || txt.includes('meluap')) {
    return 'FLOOD';
  }
  if (txt.includes('angin kencang') || txt.includes('cuaca ekstr') || txt.includes('puting beliung')) {
    return 'EXTREME_WEATHER';
  }
  if (
    txt.includes('longsor') ||
    txt.includes('gerakan tanah') ||
    txt.includes('terban') ||
    txt.includes('ambles') ||
    txt.includes('jembatan') ||
    txt.includes('jalan')
  ) {
    return 'LANDSLIDE';
  }
  return 'LANDSLIDE';
}

function classifyWeeklyCategory(raw?: string | null): IncidentCategory {
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('banjir')) return 'FLOOD';
  if (lower.includes('longsor')) return 'LANDSLIDE';
  if (lower.includes('cuaca') || lower.includes('angin')) return 'EXTREME_WEATHER';
  if (lower.includes('gempa')) return 'EARTHQUAKE';
  return 'OTHER';
}

function buildHeaders(accept = 'application/json, text/plain, */*') {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: accept,
  };
}

async function fetchJsonWithTimeout<T>(url: string, options: { revalidate: number; forceRefresh: boolean }): Promise<T> {
  const fetchInit: RequestInit & { next?: { revalidate: number } } = {
    signal: AbortSignal.timeout(4500),
    headers: buildHeaders(),
    ...(options.forceRefresh ? { cache: 'no-store' } : { next: { revalidate: options.revalidate } }),
  };
  const resp = await fetch(url, fetchInit);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} from ${url}`);
  }
  return (await resp.json()) as T;
}

async function fetchTextWithTimeout(url: string, options: { revalidate: number; forceRefresh: boolean }): Promise<string> {
  const fetchInit: RequestInit & { next?: { revalidate: number } } = {
    signal: AbortSignal.timeout(4500),
    headers: buildHeaders('text/csv, text/plain, */*'),
    ...(options.forceRefresh ? { cache: 'no-store' } : { next: { revalidate: options.revalidate } }),
  };
  const resp = await fetch(url, fetchInit);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} from ${url}`);
  }
  return await resp.text();
}

async function readSnapshotJson<T>(filename: string): Promise<T> {
  const raw = await fs.readFile(path.join(SNAPSHOT_DIR, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

async function readSnapshotText(filename: string): Promise<string> {
  return fs.readFile(path.join(SNAPSHOT_DIR, filename), 'utf-8');
}

function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? '';
    }
    rows.push(obj);
  }
  return rows;
}

function parseFirmsTimestamp(acqDate?: string, acqTime?: string): string {
  if (!acqDate || !/^\d{4}-\d{2}-\d{2}$/.test(acqDate)) return new Date().toISOString();
  const padded = (acqTime ?? '0000').replace(/\D/g, '').padStart(4, '0');
  const hh = padded.slice(0, 2);
  const mm = padded.slice(2, 4);
  const dt = new Date(`${acqDate}T${hh}:${mm}:00.000Z`);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
}

function mapFirmsConfidence(raw?: string): 'Tinggi' | 'Sedang' | 'Rendah' | null {
  const val = (raw ?? '').trim().toLowerCase();
  if (!val) return null;
  if (val === 'h' || val === 'high') return 'Tinggi';
  if (val === 'n' || val === 'nominal') return 'Sedang';
  if (val === 'l' || val === 'low') return 'Rendah';
  const pct = Number.parseFloat(val);
  if (Number.isNaN(pct)) return null;
  if (pct >= 80) return 'Tinggi';
  if (pct >= 55) return 'Sedang';
  return 'Rendah';
}

function formatSatelliteLabel(rawSat?: string, sourceType?: 'viirs' | 'modis'): string {
  const s = (rawSat ?? '').trim().toUpperCase();
  if (s === 'N20' || s === 'J1') return 'VIIRS NOAA-20';
  if (s === 'N21' || s === 'J2') return 'VIIRS NOAA-21';
  if (s === 'N' || s === 'NPP') return 'VIIRS Suomi-NPP';
  if (s === 'T' || s === 'TERRA') return 'MODIS Terra';
  if (s === 'A' || s === 'AQUA') return 'MODIS Aqua';
  return sourceType === 'modis' ? `MODIS ${s || ''}`.trim() : `VIIRS ${s || 'NOAA-20'}`.trim();
}

interface NowcastAreaRaw {
  areaDesc: string;
  polygons: string[];
}

interface NowcastAlertRaw {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  cap: {
    event: string;
    severity: string;
    urgency: string;
    effective: string;
    expires: string;
    headline: string;
    description: string;
    instruction: string;
    senderName: string;
    areas: NowcastAreaRaw[];
  } | null;
}

interface MagmaVolcanoRaw {
  ga_code?: string;
  ga_nama_gapi?: string;
  ga_kab_gapi?: string;
  ga_prov_gapi?: string;
  ga_koter_gapi?: string;
  ga_elev_gapi?: number;
  ga_lon_gapi?: number;
  ga_lat_gapi?: number;
  ga_status?: number | string;
  has_vona?: boolean;
  erupt_icon?: boolean;
}

interface GdacsItemRaw {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  eventType: string;
  alertLevel: string;
  eventId: string;
  country: string;
  iso3: string;
  fromDate: string;
  toDate: string;
  lat: number | null;
  lng: number | null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractXmlTag(block: string, localName: string): string {
  const re = new RegExp(`<(?:[\\w-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`, 'i');
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1]) : '';
}

function extractXmlTagBlocks(block: string, localName: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${localName}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function parseCapPolygonRing(raw: string): number[][] | null {
  const tokens = raw.trim().split(/\s+/);
  const ring: number[][] = [];
  for (const tok of tokens) {
    const [latStr, lngStr] = tok.split(',');
    const lat = Number.parseFloat(latStr ?? '');
    const lng = Number.parseFloat(lngStr ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -12 && lat <= 8 && lng >= 94 && lng <= 143) {
      ring.push([lng, lat]);
    }
  }
  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring.length >= 4 ? ring : null;
}

function computeRingCentroid(ring: number[][]): [number, number] {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

function safeIsoDate(raw?: string | null, fallbackIso?: string): string {
  if (!raw) return fallbackIso ?? new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? (fallbackIso ?? new Date().toISOString()) : parsed.toISOString();
}

function isInsideIndonesiaBbox(lng: number, lat: number): boolean {
  return lat >= -12 && lat <= 7 && lng >= 94 && lng <= 142;
}

async function fetchBmkgNowcastLive(options: {
  revalidate: number;
  forceRefresh: boolean;
}): Promise<{ alerts: NowcastAlertRaw[] }> {
  const rssXml = await fetchTextWithTimeout(BMKG_NOWCAST_RSS_URL, options);
  const itemBlocks = extractXmlTagBlocks(rssXml, 'item');
  const baseItems = itemBlocks.slice(0, 12).map((block) => ({
    title: extractXmlTag(block, 'title'),
    link: extractXmlTag(block, 'link'),
    pubDate: extractXmlTag(block, 'pubDate'),
    description: extractXmlTag(block, 'description'),
  }));

  const capResults = await Promise.allSettled(
    baseItems.map((it) =>
      it.link && /^https?:\/\//i.test(it.link) ? fetchTextWithTimeout(it.link, options) : Promise.resolve('')
    )
  );

  const alerts: NowcastAlertRaw[] = baseItems.map((it, idx) => {
    const res = capResults[idx];
    const capXml = res.status === 'fulfilled' ? res.value : '';
    if (!capXml) {
      return { ...it, cap: null };
    }
    const infoBlocks = extractXmlTagBlocks(capXml, 'info');
    const info = infoBlocks[0] ?? '';
    if (!info) {
      return { ...it, cap: null };
    }
    const areaBlocks = extractXmlTagBlocks(info, 'area');
    const areas: NowcastAreaRaw[] = areaBlocks.map((areaBlock) => ({
      areaDesc: extractXmlTag(areaBlock, 'areaDesc'),
      polygons: extractXmlTagBlocks(areaBlock, 'polygon').filter(Boolean),
    }));

    return {
      ...it,
      cap: {
        event: extractXmlTag(info, 'event'),
        severity: extractXmlTag(info, 'severity'),
        urgency: extractXmlTag(info, 'urgency'),
        effective: extractXmlTag(info, 'effective'),
        expires: extractXmlTag(info, 'expires'),
        headline: extractXmlTag(info, 'headline'),
        description: extractXmlTag(info, 'description'),
        instruction: extractXmlTag(info, 'instruction'),
        senderName: extractXmlTag(info, 'senderName'),
        areas,
      },
    };
  });

  return { alerts };
}

async function fetchRainViewerLive(options: {
  revalidate: number;
  forceRefresh: boolean;
}): Promise<{ tileUrl: string; updatedAt: string; host: string; path: string } | null> {
  const data = await fetchJsonWithTimeout<{
    host?: string;
    radar?: { past?: Array<{ time?: number; path?: string }> };
  }>(RAINVIEWER_API_URL, options);

  const host = (data.host ?? 'https://tilecache.rainviewer.com').replace(/\/$/, '');
  const past = data.radar?.past ?? [];
  const latest = past[past.length - 1];
  if (!latest?.path || !latest.time) return null;

  return {
    host,
    path: latest.path,
    tileUrl: `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`,
    updatedAt: new Date(latest.time * 1000).toISOString(),
  };
}

function extractJsonArrayAfterMarker(html: string, marker: string): unknown[] {
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error(`Marker ${marker} not found`);
  const start = html.indexOf('[', idx);
  if (start === -1) throw new Error(`Array start not found after ${marker}`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end === -1) throw new Error(`Unclosed array for ${marker}`);
  const parsed = JSON.parse(html.slice(start, end)) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${marker} did not parse to an array`);
  return parsed;
}

async function fetchMagmaVolcanoesLive(options: {
  revalidate: number;
  forceRefresh: boolean;
}): Promise<{ fetchedAt: string; volcanoes: MagmaVolcanoRaw[] }> {
  const html = await fetchTextWithTimeout(MAGMA_V1_URL, options);
  const volcanoes = extractJsonArrayAfterMarker(html, 'markersGunungApi') as MagmaVolcanoRaw[];
  return {
    fetchedAt: new Date().toISOString(),
    volcanoes,
  };
}

async function fetchGdacsIndonesiaLive(options: {
  revalidate: number;
  forceRefresh: boolean;
}): Promise<{ items: GdacsItemRaw[] }> {
  const rssXml = await fetchTextWithTimeout(GDACS_RSS_URL, options);
  const itemBlocks = extractXmlTagBlocks(rssXml, 'item');
  const items: GdacsItemRaw[] = [];

  for (const block of itemBlocks) {
    const country = extractXmlTag(block, 'country');
    const iso3 = extractXmlTag(block, 'iso3');
    const title = extractXmlTag(block, 'title');
    if (
      !country.toLowerCase().includes('indonesia') &&
      iso3.toUpperCase() !== 'IDN' &&
      !title.toLowerCase().includes('indonesia')
    ) {
      continue;
    }

    let lat = Number.parseFloat(extractXmlTag(block, 'lat'));
    let lng = Number.parseFloat(extractXmlTag(block, 'long'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const point = extractXmlTag(block, 'point').trim().split(/\s+/);
      lat = Number.parseFloat(point[0] ?? '');
      lng = Number.parseFloat(point[1] ?? '');
    }

    items.push({
      title,
      link: extractXmlTag(block, 'link'),
      description: extractXmlTag(block, 'description'),
      pubDate: extractXmlTag(block, 'pubDate'),
      eventType: extractXmlTag(block, 'eventtype'),
      alertLevel: extractXmlTag(block, 'alertlevel'),
      eventId: extractXmlTag(block, 'eventid'),
      country,
      iso3,
      fromDate: extractXmlTag(block, 'fromdate'),
      toDate: extractXmlTag(block, 'todate'),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });
  }

  return { items };
}

export async function getDisasterIncidentsFeed(options?: {
  forceRefresh?: boolean;
  category?: IncidentCategory | 'ALL';
}): Promise<IncidentsFeedResponse> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const fullFeed = await withSwrCache(
    'incidents:all',
    { freshMs: 2 * 60_000, staleMs: 15 * 60_000, forceRefresh },
    () => loadAllDisasterIncidents(forceRefresh)
  );

  if (options?.category && options.category !== 'ALL') {
    return {
      ...fullFeed,
      incidents: fullFeed.incidents.filter((inc) => inc.category === options.category),
    };
  }
  return fullFeed;
}

async function loadAllDisasterIncidents(forceRefresh: boolean): Promise<IncidentsFeedResponse> {
  const nowIso = new Date().toISOString();

  const [sortedRegsByNameLen, provIndex] = await Promise.all([
    getCachedRegenciesByNameLen(),
    getProvinceIndex(),
  ]);

  const regByCode = new Map<string, RegencyRef>();
  const regsByProv = new Map<string, RegencyRef[]>();

  for (const ref of sortedRegsByNameLen) {
    regByCode.set(ref.code, ref);
    if (!regsByProv.has(ref.provinceCode)) regsByProv.set(ref.provinceCode, []);
    regsByProv.get(ref.provinceCode)!.push(ref);
  }

  let nowcastLive = true;
  let magmaLive = true;
  let gdacsLive = true;
  let rainViewerLive = true;
  let bnpbWeeklyLive = true;
  let firmsLive = true;
  let usgsLive = true;

  const [
    bmkgRealtimeResult,
    nowcastRaw,
    rainViewerRadar,
    magmaRaw,
    gdacsRaw,
    bnpbWeeklyRaw,
    firmsNoaa20Csv,
    firmsModisCsv,
    usgsRaw,
    puRaw,
    nttRaw,
    bansorRaw,
    karhutlaRaw,
  ] = await Promise.all([
    getBmkgRealtimeEarthquakes({
      forceRefresh,
      preloadedRegencies: sortedRegsByNameLen,
    }),
    fetchBmkgNowcastLive({
      revalidate: 600,
      forceRefresh,
    }).catch(async () => {
      nowcastLive = false;
      return readSnapshotJson<{ alerts?: NowcastAlertRaw[] }>('bmkg_nowcast_snapshot.json').catch(() => ({
        alerts: [] as NowcastAlertRaw[],
      }));
    }),
    fetchRainViewerLive({
      revalidate: 600,
      forceRefresh,
    }).catch(() => {
      rainViewerLive = false;
      return null;
    }),
    fetchMagmaVolcanoesLive({
      revalidate: 1800,
      forceRefresh,
    }).catch(async () => {
      magmaLive = false;
      return readSnapshotJson<{ fetchedAt?: string; volcanoes?: MagmaVolcanoRaw[] }>('magma_volcanoes.json').catch(
        () => ({ fetchedAt: nowIso, volcanoes: [] as MagmaVolcanoRaw[] })
      );
    }),
    fetchGdacsIndonesiaLive({
      revalidate: 1800,
      forceRefresh,
    }).catch(async () => {
      gdacsLive = false;
      return readSnapshotJson<{ items?: GdacsItemRaw[] }>('gdacs_idn_snapshot.json').catch(() => ({
        items: [] as GdacsItemRaw[],
      }));
    }),
    fetchJsonWithTimeout<{ features?: MingguanFeature[] }>(BNPB_WEEKLY_URL, {
      revalidate: 1800,
      forceRefresh,
    }).catch(async () => {
      bnpbWeeklyLive = false;
      return readSnapshotJson<{ features?: MingguanFeature[] }>('kejadian_bencana_mingguan.json');
    }),
    fetchTextWithTimeout(NASA_FIRMS_NOAA20_URL, {
      revalidate: 1800,
      forceRefresh,
    }).catch(async () => {
      firmsLive = false;
      return readSnapshotText('nasa_firms_noaa20_7d.csv');
    }),
    fetchTextWithTimeout(NASA_FIRMS_MODIS_URL, {
      revalidate: 1800,
      forceRefresh,
    }).catch(async () => {
      firmsLive = false;
      return readSnapshotText('nasa_firms_modis_7d.csv');
    }),
    fetchJsonWithTimeout<{ features?: UsgsFeature[] }>(USGS_EQ_URL, {
      revalidate: 900,
      forceRefresh,
    }).catch(async () => {
      usgsLive = false;
      return readSnapshotJson<{ features?: UsgsFeature[] }>('usgs_earthquakes_idn.json');
    }),
    readSnapshotJson<{ features?: PuFeature[] }>('data_jalan_jembatan_putus_akses_pu.json'),
    readSnapshotJson<{ features?: NttFeature[] }>('mv_gempa_ntt_2026_v2.json'),
    readSnapshotJson<{ features?: BansorFeature[] }>('mv_bansor_sumatera_v4.json'),
    readSnapshotJson<{ features?: KarhutlaProvFeature[] }>('bnpb_karhutla_2026.json').catch(() => ({
      features: [] as KarhutlaProvFeature[],
    })),
  ]);

  if (!rainViewerRadar) {
    rainViewerLive = false;
  }

  const incidents: DisasterIncidentDTO[] = [];

  // --- 1. BMKG InaTEWS Realtime & TEWS Earthquakes ---
  const bmkgEqKeys = bmkgRealtimeResult.eqKeys;
  incidents.push(...bmkgRealtimeResult.response.incidents);

  // --- 2. USGS Earthquakes (deduplicated against BMKG within 3 min & 0.4 deg) ---
  for (const uf of usgsRaw.features ?? []) {
    const c = uf.geometry?.coordinates;
    const props = uf.properties;
    if (!c || c.length < 2 || !props || typeof props.mag !== 'number' || typeof props.time !== 'number') {
      continue;
    }
    const lng = c[0];
    const lat = c[1];
    const depthKm = typeof c[2] === 'number' ? Math.max(1, Math.round(c[2])) : 10;
    const isDuplicate = bmkgEqKeys.some(
      (b) =>
        Math.abs(b.timeMs - props.time!) < 180_000 &&
        Math.abs(b.lng - lng) < 0.4 &&
        Math.abs(b.lat - lat) < 0.4
    );
    if (isDuplicate) continue;

    const coords: [number, number] = [lng, lat];
    const occurredAt = new Date(props.time).toISOString();
    const place = props.place ?? 'Wilayah Indonesia';
    const spreadRegions = matchFeltRegencies('', place, coords, sortedRegsByNameLen);
    const primaryReg = spreadRegions[0];

    incidents.push({
      id: `usgs-${uf.id ?? props.time}`,
      title: `Gempa M ${props.mag.toFixed(1)} — ${place}`,
      category: 'EARTHQUAKE',
      categoryLabel: INCIDENT_CATEGORY_LABEL.EARTHQUAKE,
      coordinates: coords,
      precision: 'EXACT_EPICENTER',
      precisionLabel: 'Episentrum Resmi USGS',
      occurredAt,
      locationText: place,
      regionCode: primaryReg?.code,
      provinceCode: primaryReg?.provinceCode,
      summary: `Deteksi seismik USGS: magnitudo ${props.mag.toFixed(1)}, kedalaman ${depthKm} km.`,
      metrics: {
        magnitude: props.mag.toFixed(1),
        depth: `${depthKm} km`,
        potential: props.tsunami === 1 ? 'Peringatan tsunami USGS' : 'Tidak ada peringatan tsunami USGS',
      },
      spreadRegions,
      spreadExplanation: primaryReg
        ? `Pusat gempa tercatat dekat ${primaryReg.name} pada jaringan pemantauan seismik USGS.`
        : 'Episentrum terdeteksi di perairan Indonesia oleh jaringan seismik USGS.',
      source: {
        title: 'USGS Earthquake Hazards Program — Indonesia M >= 4.0',
        publisher: 'USGS',
        url: props.url || 'https://earthquake.usgs.gov/earthquakes/map/',
        category: 'OFFICIAL',
        isLive: usgsLive,
        updatedAt: nowIso,
      },
    });
  }

  // --- 3. Sumatera Bansor + PU Spread Map ---
  const sumateraSpreadByProv = new Map<string, Map<string, SpreadRegionDTO>>();
  const upsertSumateraSpread = (provCode: string, reg: RegencyRef, summary: string) => {
    if (!sumateraSpreadByProv.has(provCode)) sumateraSpreadByProv.set(provCode, new Map());
    const map = sumateraSpreadByProv.get(provCode)!;
    const prev = map.get(reg.code);
    map.set(reg.code, {
      code: reg.code,
      name: reg.name,
      provinceCode: provCode,
      centroid: reg.centroid,
      summary: prev?.summary ? `${prev.summary} · ${summary}` : summary,
    });
  };

  for (const bf of bansorRaw.features ?? []) {
    const a = bf.attributes;
    const code = normalizeCode4(a.id_kab_sdi);
    const reg = code ? regByCode.get(code) : undefined;
    if (!reg) continue;
    const dmg = a.tot_rumah_rusak ?? a.rumah_rusak ?? 0;
    const meng = a.mengungsi ?? 0;
    const parts: string[] = [];
    if (a.kategori_bencana) parts.push(a.kategori_bencana);
    if (dmg > 0) parts.push(`${dmg} rumah rusak`);
    if (meng > 0) parts.push(`${meng} mengungsi`);
    upsertSumateraSpread(reg.provinceCode, reg, parts.join(', ') || 'Terdampak banjir/longsor');
  }

  const puCountByReg = new Map<string, number>();
  for (const pf of puRaw.features ?? []) {
    const code = codeFromDesaSdi(pf.attributes.id_desa_sdi);
    if (!code) continue;
    puCountByReg.set(code, (puCountByReg.get(code) ?? 0) + 1);
  }
  for (const [code, cnt] of puCountByReg.entries()) {
    const reg = regByCode.get(code);
    if (!reg) continue;
    upsertSumateraSpread(reg.provinceCode, reg, `${cnt} titik akses putus`);
  }

  // --- 4. Exact GPS Points from SITABA Kementerian PU & BNPB ---
  for (let i = 0; i < (puRaw.features ?? []).length; i++) {
    const a = puRaw.features![i].attributes;
    if (typeof a.lon !== 'number' || typeof a.lat !== 'number') continue;
    const code = codeFromDesaSdi(a.id_desa_sdi);
    const reg = code ? regByCode.get(code) : undefined;
    const provCode = reg?.provinceCode ?? code?.slice(0, 2);
    const category = classifyPuIncident(a.name, a.cause, a.damage);
    const cleanCause = stripHtml(a.cause);
    const cleanDmg = stripHtml(a.damage);
    const cleanTitle = a.name?.trim() || `${INCIDENT_CATEGORY_LABEL[category]} — ${a.kabupaten ?? code ?? ''}`;
    const locParts = [a.desa, a.kecamatan, a.kabupaten, a.provinsi].filter(Boolean);
    const spreadMap = provCode ? sumateraSpreadByProv.get(provCode) : undefined;
    const spreadRegions = spreadMap
      ? Array.from(spreadMap.values()).slice(0, 15)
      : reg
        ? [
            {
              code: reg.code,
              name: reg.name,
              provinceCode: reg.provinceCode,
              centroid: reg.centroid,
              summary: `${puCountByReg.get(reg.code) ?? 1} titik gangguan akses`,
            },
          ]
        : [];

    incidents.push({
      id: `pu-${a.uid ?? i}`,
      title: cleanTitle,
      category,
      categoryLabel: INCIDENT_CATEGORY_LABEL[category],
      coordinates: [a.lon, a.lat],
      precision: 'OFFICIAL_GPS_POINT',
      precisionLabel: 'Titik GPS Desa/Infrastruktur (SITABA PU & BNPB)',
      occurredAt: a.dt ? new Date(a.dt).toISOString() : '2025-12-01T00:00:00.000Z',
      locationText: locParts.join(', ') || a.provinsi || 'Sumatera',
      regionCode: reg?.code ?? code ?? undefined,
      provinceCode: provCode,
      summary:
        [cleanCause ? `Penyebab: ${cleanCause}` : '', cleanDmg ? `Dampak: ${cleanDmg}` : '']
          .filter(Boolean)
          .join(' · ') || 'Titik gangguan akses jalan/jembatan resmi SITABA PU & BNPB.',
      spreadRegions,
      spreadExplanation:
        provCode && spreadRegions.length > 1
          ? `Rangkaian banjir, longsor, dan gangguan akses di ${a.provinsi ?? 'provinsi ini'} tercatat meluas ke ${spreadRegions.length} kab/kota pada data BNPB & Kementerian PU.`
          : 'Tercatat pada kabupaten/kota lokasi titik kejadian.',
      source: {
        title: a.sumber?.trim() || 'SITABA Kementerian PU & BNPB — Jalan/Jembatan Putus Akses',
        publisher: 'Kementerian PU & BNPB',
        url: PU_LAYER_URL,
        category: 'OFFICIAL',
        isLive: false,
        updatedAt: '2026-11-28T00:00:00.000Z',
      },
    });
  }

  // --- 5. BNPB Kejadian Bencana Mingguan ---
  const weeklySpreadGroups = new Map<string, SpreadRegionDTO[]>();
  const weeklyItems: Array<{ a: MingguanFeature['attributes']; reg: RegencyRef; category: IncidentCategory }> = [];

  for (const wf of bnpbWeeklyRaw.features ?? []) {
    const a = wf.attributes;
    const code = normalizeCode4(a.id_kab_sdi);
    const reg = code ? regByCode.get(code) : undefined;
    if (!reg || !reg.centroid) continue;
    const category = classifyWeeklyCategory(a.kategori_bencana);
    weeklyItems.push({ a, reg, category });

    const gKey = `${reg.provinceCode}|${category}`;
    if (!weeklySpreadGroups.has(gKey)) weeklySpreadGroups.set(gKey, []);
    const arr = weeklySpreadGroups.get(gKey)!;
    if (!arr.some((item) => item.code === reg.code)) {
      arr.push({
        code: reg.code,
        name: reg.name,
        provinceCode: reg.provinceCode,
        centroid: reg.centroid,
        summary: `${a.menderita ?? 0} terdampak, ${a.mengungsi ?? 0} mengungsi`,
      });
    }
  }

  for (let i = 0; i < weeklyItems.length; i++) {
    const { a, reg, category } = weeklyItems[i];
    const gKey = `${reg.provinceCode}|${category}`;
    const spreadRegions = weeklySpreadGroups.get(gKey) ?? [];
    const cleanKm = stripHtml(a.kondisi_mutakhir);

    incidents.push({
      id: `bnpb-weekly-${a.id ?? a.objectid ?? i}-${reg.code}`,
      title: `${a.kategori_bencana ?? INCIDENT_CATEGORY_LABEL[category]} — ${reg.name}`,
      category,
      categoryLabel: INCIDENT_CATEGORY_LABEL[category],
      coordinates: reg.centroid!,
      precision: 'REGENCY_CENTROID',
      precisionLabel: 'Centroid Resmi Kab/Kota (BIG/BNPB)',
      occurredAt: a.dt ? new Date(a.dt).toISOString() : nowIso,
      locationText: reg.name,
      regionCode: reg.code,
      provinceCode: reg.provinceCode,
      summary: cleanKm || `Laporan mingguan resmi BNPB di ${reg.name}.`,
      metrics: {
        affectedCount: a.menderita ?? undefined,
        displacedCount: a.mengungsi ?? undefined,
        fatalitiesCount: a.meninggal ?? undefined,
        damagedHouses: a.rumah_rusak ?? undefined,
      },
      spreadRegions,
      spreadExplanation:
        spreadRegions.length > 1
          ? `Kejadian mingguan kategori ${a.kategori_bencana ?? INCIDENT_CATEGORY_LABEL[category]} di provinsi yang sama juga melanda ${spreadRegions.length} kab/kota.`
          : `Tercatat pada laporan mingguan BNPB di ${reg.name}.`,
      source: {
        title: 'BNPB Geoportal — Kejadian Bencana Mingguan Nasional',
        publisher: 'BNPB',
        url: 'https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25',
        category: 'OFFICIAL',
        isLive: bnpbWeeklyLive,
        updatedAt: nowIso,
      },
    });
  }

  // --- 6. BNPB Gempabumi NTT 2026 ---
  const nttSpread: SpreadRegionDTO[] = [];
  const nttItems: Array<{ a: NttFeature['attributes']; reg: RegencyRef }> = [];
  for (const nf of nttRaw.features ?? []) {
    const a = nf.attributes;
    const code = normalizeCode4(a.id_kab);
    const reg = code ? regByCode.get(code) : undefined;
    if (!reg || !reg.centroid) continue;
    nttItems.push({ a, reg });
    nttSpread.push({
      code: reg.code,
      name: reg.name,
      provinceCode: reg.provinceCode,
      centroid: reg.centroid,
      summary: `${a.rumah_rusak ?? 0} rumah rusak, ${a.mengungsi_ ?? 0} mengungsi`,
    });
  }

  for (const { a, reg } of nttItems) {
    incidents.push({
      id: `bnpb-ntt-2026-${reg.code}`,
      title: `Dampak Gempabumi NTT 2026 — ${reg.name}`,
      category: 'EARTHQUAKE',
      categoryLabel: INCIDENT_CATEGORY_LABEL.EARTHQUAKE,
      coordinates: reg.centroid!,
      precision: 'REGENCY_CENTROID',
      precisionLabel: 'Centroid Resmi Kab/Kota (BIG/BNPB)',
      occurredAt: a.tanggal_update ? new Date(a.tanggal_update).toISOString() : '2026-08-15T04:58:00.000Z',
      locationText: `${reg.name}, ${a.provinsi ?? ''}`.trim(),
      regionCode: reg.code,
      provinceCode: reg.provinceCode,
      summary: `BNPB mencatat ${a.rumah_rusak ?? 0} rumah rusak (${a.total_rumah_verif ?? 0} terverifikasi), ${a.mengungsi_ ?? 0} pengungsi, dan ${a.jumlah_jalan ?? 0} ruas jalan terdampak.`,
      metrics: {
        displacedCount: a.mengungsi_ ?? undefined,
        fatalitiesCount: a.meninggal ?? undefined,
        damagedHouses: a.rumah_rusak ?? undefined,
      },
      spreadRegions: nttSpread,
      spreadExplanation: `Dampak gempabumi Flores NTT Agustus 2026 meluas ke ${nttSpread.length} kabupaten/kota lintas Provinsi NTT, NTB, dan Sulawesi Selatan.`,
      source: {
        title: 'BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026',
        publisher: 'BNPB',
        url: NTT_LAYER_URL,
        category: 'OFFICIAL',
        isLive: false,
        updatedAt: '2026-11-28T00:00:00.000Z',
      },
    });
  }

  // --- 7. Live NASA FIRMS Satellite Karhutla Hotspots + BNPB Karhutla 2026 Context ---
  const karhutlaCtxByProv = new Map<string, KarhutlaProvFeature['attributes']>();
  for (const kf of karhutlaRaw.features ?? []) {
    const pid = String(kf.attributes.id_prov ?? '').trim().padStart(2, '0');
    if (pid) karhutlaCtxByProv.set(pid, kf.attributes);
  }

  interface ParsedHotspot {
    lng: number;
    lat: number;
    provCode: string;
    provName: string;
    reg: RegencyRef | null;
    satellite: string;
    confidence: 'Tinggi' | 'Sedang';
    frp?: number;
    brightness?: number;
    occurredAt: string;
    wibDate: string;
  }

  const toWibDate = (iso: string): string => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const rawHotspots: ParsedHotspot[] = [];
  const viirsCells = new Set<string>();

  for (const row of parseCsvRows(firmsNoaa20Csv)) {
    const lat = Number.parseFloat(row.latitude);
    const lng = Number.parseFloat(row.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    if (lat < -11.5 || lat > 6.5 || lng < 94.5 || lng > 141.5) continue;

    const conf = mapFirmsConfidence(row.confidence);
    if (!conf || conf === 'Rendah') continue;

    const occurredAt = parseFirmsTimestamp(row.acq_date, row.acq_time);
    const wibDate = toWibDate(occurredAt);
    const cellKey = `${wibDate}|${Math.round(lat * 50)}|${Math.round(lng * 50)}`;
    if (viirsCells.has(cellKey)) continue;

    const prov = findIndonesianProvince(lng, lat, provIndex);
    if (!prov) continue;

    viirsCells.add(cellKey);
    const reg = findNearestRegencyInProvince(lng, lat, prov.code, regsByProv);
    const frpVal = Number.parseFloat(row.frp);
    const brightVal = Number.parseFloat(row.bright_ti4);

    rawHotspots.push({
      lng,
      lat,
      provCode: prov.code,
      provName: prov.name,
      reg,
      satellite: formatSatelliteLabel(row.satellite, 'viirs'),
      confidence: conf,
      frp: Number.isFinite(frpVal) ? frpVal : undefined,
      brightness: Number.isFinite(brightVal) ? brightVal : undefined,
      occurredAt,
      wibDate,
    });
  }

  for (const row of parseCsvRows(firmsModisCsv)) {
    const lat = Number.parseFloat(row.latitude);
    const lng = Number.parseFloat(row.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    if (lat < -11.5 || lat > 6.5 || lng < 94.5 || lng > 141.5) continue;

    const conf = mapFirmsConfidence(row.confidence);
    if (!conf || conf === 'Rendah') continue;

    const occurredAt = parseFirmsTimestamp(row.acq_date, row.acq_time);
    const wibDate = toWibDate(occurredAt);
    const cellKey = `${wibDate}|${Math.round(lat * 50)}|${Math.round(lng * 50)}`;
    if (viirsCells.has(cellKey)) continue;

    const prov = findIndonesianProvince(lng, lat, provIndex);
    if (!prov) continue;

    viirsCells.add(cellKey);
    const reg = findNearestRegencyInProvince(lng, lat, prov.code, regsByProv);
    const frpVal = Number.parseFloat(row.frp);
    const brightVal = Number.parseFloat(row.brightness);

    rawHotspots.push({
      lng,
      lat,
      provCode: prov.code,
      provName: prov.name,
      reg,
      satellite: formatSatelliteLabel(row.satellite, 'modis'),
      confidence: conf,
      frp: Number.isFinite(frpVal) ? frpVal : undefined,
      brightness: Number.isFinite(brightVal) ? brightVal : undefined,
      occurredAt,
      wibDate,
    });
  }

  // Cap per day (300 hotspots/day sorted by high confidence then FRP) so 7-day rolling window stays evenly represented & fast
  const hotspotsByDay = new Map<string, ParsedHotspot[]>();
  for (const h of rawHotspots) {
    if (!hotspotsByDay.has(h.wibDate)) hotspotsByDay.set(h.wibDate, []);
    hotspotsByDay.get(h.wibDate)!.push(h);
  }
  const hotspots: ParsedHotspot[] = [];
  const regHotspotCountByProv = new Map<string, Map<string, { reg: RegencyRef; count: number }>>();
  for (const dayRows of hotspotsByDay.values()) {
    dayRows.sort((a, b) => {
      const ca = a.confidence === 'Tinggi' ? 1 : 0;
      const cb = b.confidence === 'Tinggi' ? 1 : 0;
      if (ca !== cb) return cb - ca;
      return (b.frp ?? 0) - (a.frp ?? 0);
    });
    for (const h of dayRows.slice(0, 300)) {
      hotspots.push(h);
      if (h.reg) {
        if (!regHotspotCountByProv.has(h.provCode)) regHotspotCountByProv.set(h.provCode, new Map());
        const m = regHotspotCountByProv.get(h.provCode)!;
        const existing = m.get(h.reg.code);
        if (existing) existing.count += 1;
        else m.set(h.reg.code, { reg: h.reg, count: 1 });
      }
    }
  }

  // Precompute top 4 hotspot regencies per province for compact, grounded spreadRegions
  const topSpreadByProv = new Map<string, SpreadRegionDTO[]>();
  const totalHotspotsByProv = new Map<string, number>();
  for (const [provCode, m] of regHotspotCountByProv.entries()) {
    const sorted = Array.from(m.values()).sort((a, b) => b.count - a.count);
    const totalProv = sorted.reduce((acc, item) => acc + item.count, 0);
    totalHotspotsByProv.set(provCode, totalProv);
    topSpreadByProv.set(
      provCode,
      sorted.slice(0, 4).map((item) => ({
        code: item.reg.code,
        name: item.reg.name,
        provinceCode: provCode,
        centroid: item.reg.centroid,
        summary: `${item.count} titik panas satelit (7 hari)`,
      }))
    );
  }

  for (let i = 0; i < hotspots.length; i++) {
    const h = hotspots[i];
    const provCtx = karhutlaCtxByProv.get(h.provCode);
    const topProvSpread = topSpreadByProv.get(h.provCode) ?? [];
    const primarySpread: SpreadRegionDTO[] = h.reg
      ? [
          {
            code: h.reg.code,
            name: h.reg.name,
            provinceCode: h.provCode,
            centroid: h.reg.centroid,
            summary: `${regHotspotCountByProv.get(h.provCode)?.get(h.reg.code)?.count ?? 1} titik panas (7 hari)`,
          },
          ...topProvSpread.filter((sr) => sr.code !== h.reg!.code).slice(0, 2),
        ]
      : topProvSpread.slice(0, 3);

    const provTotal = totalHotspotsByProv.get(h.provCode) ?? 1;
    const burnedHa =
      typeof provCtx?.luas_lahan_terbakar_sipongi_2026 === 'number'
        ? provCtx.luas_lahan_terbakar_sipongi_2026
        : undefined;
    const pm25 = provCtx?.kualitas_udara_pm25?.trim() || undefined;

    incidents.push({
      id: `firms-${h.satellite.replace(/\s+/g, '')}-${h.lat.toFixed(4)}-${h.lng.toFixed(4)}-${i}`,
      title: `Titik Panas ${h.satellite} — ${h.reg?.name ?? h.provName}`,
      category: 'OTHER',
      categoryLabel: INCIDENT_CATEGORY_LABEL.OTHER,
      coordinates: [h.lng, h.lat],
      precision: 'SATELLITE_HOTSPOT',
      precisionLabel: `Satelit ${h.satellite}`,
      occurredAt: h.occurredAt,
      locationText: h.reg ? `${h.provName} — ${h.reg.name}` : h.provName,
      regionCode: h.reg?.code,
      provinceCode: h.provCode,
      summary: `Anomali termal satelit ${h.satellite} dengan kepercayaan ${h.confidence}${typeof h.frp === 'number' ? ` dan FRP ${h.frp.toFixed(1)} MW` : ''}.${provCtx?.kesimpulan ? ` Konteks BNPB ${h.provName}: ${provCtx.kesimpulan}` : ''}`,
      metrics: {
        satellite: h.satellite,
        confidence: h.confidence,
        frp: h.frp,
        brightness: h.brightness,
        burnedAreaHa: burnedHa,
        airQualityPm25: pm25,
      },
      spreadRegions: primarySpread,
      spreadExplanation: `${h.provName} mencatat ${provTotal} titik panas kepercayaan Sedang/Tinggi dalam 7 hari terakhir pada pantauan satelit NASA FIRMS.`,
      source: {
        title: `NASA EOSDIS FIRMS (${h.satellite})${provCtx ? ' & BNPB Karhutla 2026' : ''}`,
        publisher: 'NASA FIRMS',
        url: 'https://firms.modaps.eosdis.nasa.gov/map/',
        category: 'OFFICIAL',
        isLive: firmsLive,
        updatedAt: nowIso,
      },
    });
  }

  // --- 7. BMKG Peringatan Dini Cuaca Ekstrem Real-Time (CAP 1.2) ---
  const nowcastFeatures: GeoJSON.Feature[] = [];
  const nowcastAlerts = nowcastRaw.alerts ?? [];

  for (let i = 0; i < nowcastAlerts.length; i++) {
    const alert = nowcastAlerts[i];
    const headline = alert.cap?.headline || alert.title;
    if (!headline) continue;

    const areas = alert.cap?.areas ?? [];
    const areaDesc = areas.map((a) => a.areaDesc).filter(Boolean).join(', ');
    const alertId = `bmkg-nowcast-${i}-${normalizeRegencyName(headline).slice(0, 24).replace(/\s+/g, '-')}`;

    let largestRing: number[][] | null = null;
    for (const area of areas) {
      for (const polyRaw of area.polygons ?? []) {
        const ring = parseCapPolygonRing(polyRaw);
        if (!ring) continue;
        nowcastFeatures.push({
          type: 'Feature',
          properties: {
            alertId,
            headline,
            areaDesc: area.areaDesc || headline,
            severity: alert.cap?.severity || 'Moderate',
            expires: alert.cap?.expires || '',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        });
        if (!largestRing || ring.length > largestRing.length) {
          largestRing = ring;
        }
      }
    }

    let coords: [number, number] | null = largestRing ? computeRingCentroid(largestRing) : null;
    const provMatch = coords
      ? findIndonesianProvince(coords[0], coords[1], provIndex)
      : provIndex.find((p) =>
          normalizeRegencyName(`${areaDesc} ${headline}`).includes(normalizeRegencyName(p.name))
        ) ?? null;

    let primaryReg: RegencyRef | null = null;
    if (coords && provMatch) {
      primaryReg = findNearestRegencyInProvince(coords[0], coords[1], provMatch.code, regsByProv);
    } else if (provMatch) {
      const provRegs = regsByProv.get(provMatch.code) ?? [];
      primaryReg = provRegs.find((r) => r.centroid) ?? null;
      if (!coords && primaryReg?.centroid) coords = primaryReg.centroid;
    }

    if (!coords) continue;

    const matchedSpread = matchFeltRegencies(
      `${areaDesc} ${alert.cap?.description ?? alert.description ?? ''}`,
      headline,
      coords,
      sortedRegsByNameLen
    );
    const spreadRegions = matchedSpread.slice(0, 8);
    if (spreadRegions.length === 0 && primaryReg?.centroid) {
      spreadRegions.push({
        code: primaryReg.code,
        name: primaryReg.name,
        provinceCode: primaryReg.provinceCode,
        centroid: primaryReg.centroid,
        summary: alert.cap?.event || 'Peringatan dini cuaca ekstrem BMKG',
      });
    }

    const descriptionText = (alert.cap?.description || alert.description || headline).replace(/\s+/g, ' ').trim();
    incidents.push({
      id: alertId,
      title: headline,
      category: 'EXTREME_WEATHER',
      categoryLabel: INCIDENT_CATEGORY_LABEL.EXTREME_WEATHER,
      coordinates: coords,
      precision: largestRing ? 'BMKG_NOWCAST_AREA' : 'REGENCY_CENTROID',
      precisionLabel: largestRing ? 'Poligon CAP Resmi BMKG' : 'Wilayah Peringatan BMKG',
      occurredAt: safeIsoDate(alert.cap?.effective || alert.pubDate, nowIso),
      locationText: areaDesc || provMatch?.name || primaryReg?.name || 'Indonesia',
      regionCode: primaryReg?.code,
      provinceCode: provMatch?.code ?? primaryReg?.provinceCode,
      summary: descriptionText.slice(0, 420),
      metrics: {
        potential: alert.cap?.event || 'Hujan Lebat / Cuaca Ekstrem',
        validUntil: alert.cap?.expires ? safeIsoDate(alert.cap.expires, nowIso) : undefined,
      },
      spreadRegions,
      spreadExplanation:
        spreadRegions.length > 0
          ? `Peringatan dini BMKG Nowcast (CAP 1.2) mencakup area poligon cuaca ekstrem sekitar ${spreadRegions.map((s) => s.name).join(', ')}.`
          : 'Peringatan dini cuaca ekstrem aktif berdasarkan CAP 1.2 BMKG.',
      source: {
        title: 'BMKG Nowcast CAP 1.2',
        publisher: 'BMKG',
        url: alert.link || BMKG_NOWCAST_RSS_URL,
        category: 'OFFICIAL',
        isLive: nowcastLive,
        updatedAt: nowIso,
      },
    });
  }

  // --- 8. PVMBG MAGMA Indonesia — Gunung Api Aktif Level II–IV ---
  for (const v of magmaRaw.volcanoes ?? []) {
    const statusNum = Number(v.ga_status ?? 0);
    if (!Number.isFinite(statusNum) || statusNum < 2) continue;
    const lat = Number(v.ga_lat_gapi);
    const lng = Number(v.ga_lon_gapi);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !v.ga_nama_gapi) continue;

    const alertLevel =
      statusNum >= 4
        ? 'Level IV (Awas)'
        : statusNum === 3
          ? 'Level III (Siaga)'
          : 'Level II (Waspada)';

    const provMatch = findIndonesianProvince(lng, lat, provIndex);
    const kabMatched = matchFeltRegencies(
      `${v.ga_kab_gapi ?? ''} ${v.ga_koter_gapi ?? ''}`,
      v.ga_prov_gapi ?? '',
      [lng, lat],
      sortedRegsByNameLen
    );
    const primaryReg =
      kabMatched[0]
        ? regByCode.get(kabMatched[0].code) ?? null
        : provMatch
          ? findNearestRegencyInProvince(lng, lat, provMatch.code, regsByProv)
          : null;

    const spreadRegions = kabMatched.slice(0, 6);
    if (spreadRegions.length === 0 && primaryReg?.centroid) {
      spreadRegions.push({
        code: primaryReg.code,
        name: primaryReg.name,
        provinceCode: primaryReg.provinceCode,
        centroid: primaryReg.centroid,
        summary: `Wilayah sekitar pos pengamatan ${v.ga_nama_gapi}`,
      });
    }

    const elev = typeof v.ga_elev_gapi === 'number' ? v.ga_elev_gapi : undefined;
    const hasVona = Boolean(v.has_vona);
    const koterText = v.ga_koter_gapi?.trim();

    incidents.push({
      id: `magma-${(v.ga_code ?? v.ga_nama_gapi).toString().toLowerCase().replace(/\s+/g, '-')}`,
      title: `Gunung ${v.ga_nama_gapi} — ${alertLevel}`,
      category: 'VOLCANO',
      categoryLabel: INCIDENT_CATEGORY_LABEL.VOLCANO,
      coordinates: [lng, lat],
      precision: 'OFFICIAL_VOLCANO_STATION',
      precisionLabel: 'Koordinat Kawah Resmi PVMBG MAGMA',
      occurredAt: safeIsoDate(magmaRaw.fetchedAt, nowIso),
      locationText: [v.ga_kab_gapi, v.ga_prov_gapi].filter(Boolean).join(', ') || 'Indonesia',
      regionCode: primaryReg?.code,
      provinceCode: provMatch?.code ?? primaryReg?.provinceCode,
      summary: `Tingkat aktivitas Gunung ${v.ga_nama_gapi}${elev ? ` (${elev} mdpl)` : ''} berada pada ${alertLevel}.${hasVona ? ' Peringatan penerbangan (VONA) sedang aktif.' : ''}${v.erupt_icon ? ' Terpantau peningkatan aktivitas erupsi/lontaran abu.' : ''}${koterText ? ` Wilayah terdekat: ${koterText}.` : ''}`,
      metrics: {
        alertLevel,
        elevationM: elev,
        hasVona,
        potential: v.erupt_icon
          ? 'Potensi awan panas, lontaran material vulkanik, atau sebaran abu'
          : `Pemantauan ${alertLevel} oleh Pos Pengamatan Gunung Api PVMBG`,
      },
      spreadRegions,
      spreadExplanation:
        spreadRegions.length > 0
          ? `Kawasan rawan gunungapi & kota terdekat mencakup ${spreadRegions.map((s) => s.name).join(', ')}. Aktifkan lapisan inaRISK Gunungapi untuk melihat KRB resmi.`
          : 'Titik pos pengamatan resmi PVMBG MAGMA Indonesia (KESDM).',
      source: {
        title: 'PVMBG MAGMA Indonesia (KESDM)',
        publisher: 'PVMBG MAGMA',
        url: 'https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas',
        category: 'OFFICIAL',
        isLive: magmaLive,
        updatedAt: nowIso,
      },
    });
  }

  // --- 9. GDACS (UN OCHA & European Commission Copernicus) Indonesia Alerts ---
  for (const g of gdacsRaw.items ?? []) {
    if (typeof g.lat !== 'number' || typeof g.lng !== 'number') continue;
    if (!isInsideIndonesiaBbox(g.lng, g.lat)) continue;

    const evType = g.eventType.toUpperCase();
    const gTimeMs = new Date(safeIsoDate(g.toDate || g.pubDate || g.fromDate, nowIso)).getTime();
    if (evType === 'EQ') {
      const dupBmkg = bmkgEqKeys.some(
        (b) =>
          Math.abs(b.timeMs - gTimeMs) < 6 * 3600_000 &&
          Math.hypot(b.lng - g.lng!, b.lat - g.lat!) < 0.8
      );
      if (dupBmkg) continue;
    }

    const category: IncidentCategory =
      evType === 'FL'
        ? 'FLOOD'
        : evType === 'EQ'
          ? 'EARTHQUAKE'
          : evType === 'VO'
            ? 'VOLCANO'
            : evType === 'WF'
              ? 'OTHER'
              : 'EXTREME_WEATHER';

    const provMatch = findIndonesianProvince(g.lng, g.lat, provIndex);
    const primaryReg = provMatch
      ? findNearestRegencyInProvince(g.lng, g.lat, provMatch.code, regsByProv)
      : null;

    const spreadRegions = matchFeltRegencies(
      `${g.country} ${g.description}`,
      g.title,
      [g.lng, g.lat],
      sortedRegsByNameLen
    ).slice(0, 6);

    incidents.push({
      id: `gdacs-${evType.toLowerCase() || 'alert'}-${g.eventId || Math.abs(Math.round(g.lat * 100))}`,
      title: `GDACS: ${g.title}`,
      category,
      categoryLabel: INCIDENT_CATEGORY_LABEL[category],
      coordinates: [g.lng, g.lat],
      precision: 'SATELLITE_HOTSPOT',
      precisionLabel: 'Deteksi Multi-Satelit Global GDACS (UN/EC)',
      occurredAt: safeIsoDate(g.toDate || g.pubDate || g.fromDate, nowIso),
      locationText: primaryReg ? `${primaryReg.name}, ${provMatch?.name ?? ''}`.trim() : g.country || 'Indonesia',
      regionCode: primaryReg?.code,
      provinceCode: provMatch?.code ?? primaryReg?.provinceCode,
      summary: `${g.description || g.title} (Level Peringatan GDACS: ${g.alertLevel || 'Green'}).`,
      metrics: {
        gdacsAlert: g.alertLevel || 'Green',
        potential: `Global Disaster Alert and Coordination System (${evType})`,
      },
      spreadRegions,
      spreadExplanation:
        'Dipantau melalui jaringan satelit & koordinasi internasional UN OCHA / Copernicus Emergency Management Service.',
      source: {
        title: 'GDACS (UN OCHA & Copernicus)',
        publisher: 'GDACS UN/EC',
        url: g.link || GDACS_RSS_URL,
        category: 'OFFICIAL',
        isLive: gdacsLive,
        updatedAt: nowIso,
      },
    });
  }

  incidents.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const countsByCategory: Record<IncidentCategory, number> = {
    FLOOD: 0,
    LANDSLIDE: 0,
    EARTHQUAKE: 0,
    EXTREME_WEATHER: 0,
    VOLCANO: 0,
    OTHER: 0,
  };
  const dateSet = new Set<string>();
  for (const inc of incidents) {
    countsByCategory[inc.category] += 1;
    dateSet.add(toWibDate(inc.occurredAt));
  }
  const datesAvailable = Array.from(dateSet)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 14);

  return {
    updatedAt: nowIso,
    bmkgRealtimeUpdatedAt: bmkgRealtimeResult.response.updatedAt,
    bmkgRealtimeCount: bmkgRealtimeResult.response.totalCount,
    liveStatus: {
      bmkg:
        bmkgRealtimeResult.response.liveStatus.inatews === 'live' ||
        bmkgRealtimeResult.response.liveStatus.tews === 'live'
          ? 'live'
          : 'snapshot',
      bmkgInatews: bmkgRealtimeResult.response.liveStatus.inatews,
      bmkgNowcast: nowcastLive ? 'live' : 'snapshot',
      magmaVolcano: magmaLive ? 'live' : 'snapshot',
      gdacs: gdacsLive ? 'live' : 'snapshot',
      rainViewer: rainViewerLive ? 'live' : 'unavailable',
      bnpbWeekly: bnpbWeeklyLive ? 'live' : 'snapshot',
      nasaFirms: firmsLive ? 'live' : 'snapshot',
      usgs: usgsLive ? 'live' : 'snapshot',
      puAccess: 'snapshot',
      nttGempa: 'snapshot',
    },
    weatherRadar: rainViewerRadar,
    nowcastPolygons: {
      type: 'FeatureCollection',
      features: nowcastFeatures,
    },
    datesAvailable,
    countsByCategory,
    incidents,
  };
}
