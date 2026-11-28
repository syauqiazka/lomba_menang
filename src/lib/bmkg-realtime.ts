import fs from 'fs/promises';
import path from 'path';
import { prisma, runDbQuery } from '@/lib/prisma';
import { getFallbackRegenciesByNameLen } from '@/lib/local-db-fallback';
import type {
  DisasterIncidentDTO,
  RealtimeEarthquakesResponse,
  SpreadRegionDTO,
} from '@/types/map';

export const INATEWS_LIVE30_URL = 'https://cdn.bmkg.go.id/live30event.xml';
export const INATEWS_LAST_QL_URL = 'https://cdn.bmkg.go.id/lastQL.json';
export const BMKG_AUTOGEMPA_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
export const BMKG_TERKINI_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
export const BMKG_DIRASAKAN_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
export const INATEWS_DETAIL_BASE_URL = 'https://inatews.bmkg.go.id/web/detail2';
export const BMKG_SHAKEMAP_BASE_URL = 'https://static.bmkg.go.id/';

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots', 'bnpb-2026-11-28');

const CHROME_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/xml, text/xml, application/json, text/plain, */*',
};

export interface RegencyLookupRef {
  code: string;
  name: string;
  normalizedName: string;
  provinceCode: string;
  centroid?: [number, number];
}

export interface InatewsLiveEvent {
  eventId: string;
  status: string;
  occurredAt: string;
  lat: number;
  lng: number;
  depthKm: number;
  magnitude: number;
  focalMechanism?: string;
  area: string;
  phaseCount?: number;
}

export interface BmkgTewsGempaItem {
  Tanggal?: string;
  Jam?: string;
  DateTime?: string;
  Coordinates?: string;
  Magnitude?: string;
  Kedalaman?: string;
  Wilayah?: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
}

export interface BmkgRealtimeResult {
  response: RealtimeEarthquakesResponse;
  eqKeys: Array<{ timeMs: number; lng: number; lat: number }>;
}

const REGENCY_CACHE_TTL_MS = 30 * 60_000;
let cachedRegenciesByNameLen: RegencyLookupRef[] | null = null;
let cachedRegenciesAt = 0;

const RESPONSE_CACHE_TTL_MS = 8_000;
const RESPONSE_STALE_TTL_MS = 5 * 60_000;
const FORCE_COOLDOWN_MS = 4_000;
let cachedResult: BmkgRealtimeResult | null = null;
let cachedResultAt = 0;
let lastForcedAt = 0;
let inflightBmkg: Promise<BmkgRealtimeResult> | null = null;

export function normalizeRegencyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bkabupaten\b|\bkab\.?\b|\bkota\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCentroid(raw: unknown): [number, number] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as { coordinates?: unknown };
  if (
    Array.isArray(c.coordinates) &&
    typeof c.coordinates[0] === 'number' &&
    typeof c.coordinates[1] === 'number'
  ) {
    return [c.coordinates[0], c.coordinates[1]];
  }
  return undefined;
}

/**
 * Checks whether coordinates lie within the Indonesian seismic monitoring region
 * (covers Sabang–Merauke + nearby subduction trenches inside the map viewport).
 */
export function isIndonesiaSeismicRegion(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lat >= -14 &&
    lat <= 8.5 &&
    lng >= 92 &&
    lng <= 144
  );
}

/**
 * Parses InaTEWS UTC timestamps such as:
 * - "2026/11/28  11:07:21.119" (live30event.xml)
 * - "2026-11-28 11:07:20.791561" (lastQL.json)
 */
export function parseInatewsWaktuUtc(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\//g, '-').replace(/\s+/g, ' ');
  const m = cleaned.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z|\+00:00)?$/i
  );
  if (!m) return null;

  const ms = (m[3] ?? '000').slice(0, 3).padEnd(3, '0');
  const isoCandidate = `${m[1]}T${m[2]}.${ms}Z`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatInatewsStatusLabel(status?: string): string {
  const norm = (status ?? '').trim().toLowerCase();
  if (norm === 'confirmed' || norm === 'm') {
    return 'Terkonfirmasi (InaTEWS)';
  }
  if (norm === 'automatic' || norm === 'preliminary' || norm === 'a') {
    return 'Deteksi Otomatis (Preliminary)';
  }
  return status?.trim() || 'Terkonfirmasi';
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

function extractXmlTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1]) : '';
}

/**
 * Parses BMKG InaTEWS live30event.xml feed and filters to Indonesian seismic coordinates.
 */
export function parseInatewsLive30Xml(xmlText: string): InatewsLiveEvent[] {
  if (!xmlText || !xmlText.includes('<gempa>')) return [];
  const events: InatewsLiveEvent[] = [];
  const gempaRegex = /<gempa>([\s\S]*?)<\/gempa>/gi;
  let match: RegExpExecArray | null;

  while ((match = gempaRegex.exec(xmlText)) !== null) {
    const block = match[1];
    const eventId = extractXmlTag(block, 'eventid');
    const occurredAt = parseInatewsWaktuUtc(extractXmlTag(block, 'waktu'));
    const lat = Number.parseFloat(extractXmlTag(block, 'lintang'));
    const lng = Number.parseFloat(extractXmlTag(block, 'bujur'));
    const depthKm = Number.parseFloat(extractXmlTag(block, 'dalam'));
    const magnitude = Number.parseFloat(extractXmlTag(block, 'mag'));

    if (
      !eventId ||
      !occurredAt ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(depthKm) ||
      !Number.isFinite(magnitude)
    ) {
      continue;
    }

    if (!isIndonesiaSeismicRegion(lng, lat)) continue;

    const focalRaw = extractXmlTag(block, 'fokal');
    events.push({
      eventId,
      status: extractXmlTag(block, 'status') || 'confirmed',
      occurredAt,
      lat,
      lng,
      depthKm: Math.max(1, Math.round(depthKm)),
      magnitude,
      focalMechanism: focalRaw && focalRaw !== 'undetermined' ? focalRaw : undefined,
      area: extractXmlTag(block, 'area') || 'Wilayah Indonesia',
    });
  }

  return events;
}

/**
 * Parses BMKG InaTEWS lastQL.json GeoJSON FeatureCollection (latest Quick Location).
 */
export function parseInatewsLastQlJson(raw: unknown): InatewsLiveEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const fc = raw as {
    features?: Array<{
      properties?: {
        id?: string;
        time?: string;
        mag?: string | number;
        place?: string;
        fase?: string | number;
        status?: string;
        depth?: string | number;
      };
      geometry?: {
        coordinates?: Array<string | number>;
      };
    }>;
  };

  const feat = fc.features?.[0];
  if (!feat?.properties || !feat.geometry?.coordinates) return null;

  const props = feat.properties;
  const coords = feat.geometry.coordinates;
  const lng = Number.parseFloat(String(coords[0] ?? ''));
  const lat = Number.parseFloat(String(coords[1] ?? ''));
  const magnitude = Number.parseFloat(String(props.mag ?? ''));
  const depthKm = Number.parseFloat(String(props.depth ?? ''));
  const occurredAt = parseInatewsWaktuUtc(props.time);
  const eventId = String(props.id ?? '').trim();

  if (
    !eventId ||
    !occurredAt ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(magnitude) ||
    !Number.isFinite(depthKm)
  ) {
    return null;
  }

  if (!isIndonesiaSeismicRegion(lng, lat)) return null;

  const faseParsed = Number.parseInt(String(props.fase ?? ''), 10);

  return {
    eventId,
    status: String(props.status ?? 'M').trim() || 'M',
    occurredAt,
    lat,
    lng,
    depthKm: Math.max(1, Math.round(depthKm)),
    magnitude,
    area: String(props.place ?? '').trim() || 'Wilayah Indonesia',
    phaseCount: Number.isFinite(faseParsed) ? faseParsed : undefined,
  };
}

export function matchFeltRegencies(
  feltText: string,
  wilayahText: string,
  coords: [number, number],
  sortedRegsByNameLen: RegencyLookupRef[]
): SpreadRegionDTO[] {
  const haystack = normalizeRegencyName(`${feltText} ${wilayahText}`);
  const matched = new Map<string, SpreadRegionDTO>();

  if (haystack) {
    const paddedHay = ` ${haystack} `;
    for (const reg of sortedRegsByNameLen) {
      if (reg.normalizedName.length < 4) continue;
      const needle = ` ${reg.normalizedName} `;
      if (paddedHay.includes(needle)) {
        matched.set(reg.code, {
          code: reg.code,
          name: reg.name,
          provinceCode: reg.provinceCode,
          centroid: reg.centroid,
          summary: feltText ? `MMI: ${feltText}` : wilayahText,
        });
      }
      if (matched.size >= 10) break;
    }
  }

  if (matched.size === 0) {
    let best: RegencyLookupRef | null = null;
    let bestDistSq = 1.8 * 1.8;
    for (const reg of sortedRegsByNameLen) {
      if (!reg.centroid) continue;
      const dx = reg.centroid[0] - coords[0];
      const dy = reg.centroid[1] - coords[1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = reg;
      }
    }
    if (best) {
      matched.set(best.code, {
        code: best.code,
        name: best.name,
        provinceCode: best.provinceCode,
        centroid: best.centroid,
        summary: 'Kab/Kota terdekat dari episentrum resmi',
      });
    }
  }

  return Array.from(matched.values());
}

export async function getCachedRegenciesByNameLen(): Promise<RegencyLookupRef[]> {
  const now = performance.now();
  if (cachedRegenciesByNameLen && now - cachedRegenciesAt < REGENCY_CACHE_TTL_MS) {
    return cachedRegenciesByNameLen;
  }

  const list = await runDbQuery(
    async () => {
      const dbRegions = await prisma.region.findMany({
        where: { level: 'REGENCY_CITY' },
        select: { code: true, name: true, parentCode: true, centroid: true },
      });

      const mapped: RegencyLookupRef[] = dbRegions.map((r) => ({
        code: r.code,
        name: r.name,
        normalizedName: normalizeRegencyName(r.name),
        provinceCode: r.parentCode ?? r.code.slice(0, 2),
        centroid: parseCentroid(r.centroid),
      }));

      mapped.sort((a, b) => b.normalizedName.length - a.normalizedName.length);
      return mapped;
    },
    () => getFallbackRegenciesByNameLen(),
    { label: 'bmkg:regencies' }
  );

  cachedRegenciesByNameLen = list;
  cachedRegenciesAt = performance.now();
  return list;
}

function parseBmkgCoordinates(raw?: string): [number, number] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => Number.parseFloat(s.trim()));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[1], parts[0]];
}

async function fetchLiveText(url: string, accept: string): Promise<string> {
  const resp = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
    headers: {
      ...CHROME_HEADERS,
      Accept: accept,
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} from ${url}`);
  }
  return resp.text();
}

async function fetchLiveJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
    headers: {
      ...CHROME_HEADERS,
      Accept: 'application/json, text/plain, */*',
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} from ${url}`);
  }
  return (await resp.json()) as T;
}

async function readSnapshotJson<T>(filename: string): Promise<T> {
  const raw = await fs.readFile(path.join(SNAPSHOT_DIR, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

async function readSnapshotTextSafe(filename: string): Promise<string> {
  try {
    return await fs.readFile(path.join(SNAPSHOT_DIR, filename), 'utf-8');
  } catch {
    return '';
  }
}

function buildShakemapUrl(shakemap?: string): string | undefined {
  const clean = shakemap?.trim();
  if (!clean) return undefined;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${BMKG_SHAKEMAP_BASE_URL}${clean.replace(/^\/+/, '')}`;
}

/**
 * Fetches live earthquake telemetry from BMKG InaTEWS Realtime (live30event.xml & lastQL.json),
 * enriched with official BMKG TEWS bulletins (autogempa, gempadirasakan, gempaterkini).
 */
export async function getBmkgRealtimeEarthquakes(options?: {
  forceRefresh?: boolean;
  preloadedRegencies?: RegencyLookupRef[];
}): Promise<BmkgRealtimeResult> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const now = performance.now();

  if (forceRefresh && cachedResult && now - lastForcedAt < FORCE_COOLDOWN_MS) {
    return cachedResult;
  }
  if (!forceRefresh && cachedResult) {
    const age = now - cachedResultAt;
    if (age < RESPONSE_CACHE_TTL_MS) {
      return cachedResult;
    }
    if (age < RESPONSE_STALE_TTL_MS) {
      if (!inflightBmkg) {
        void loadBmkgRealtimeEarthquakes(false, options?.preloadedRegencies).catch(() => undefined);
      }
      return cachedResult;
    }
  }

  if (inflightBmkg) {
    return inflightBmkg;
  }

  return loadBmkgRealtimeEarthquakes(forceRefresh, options?.preloadedRegencies);
}

async function loadBmkgRealtimeEarthquakes(
  forceRefresh: boolean,
  preloadedRegencies?: RegencyLookupRef[]
): Promise<BmkgRealtimeResult> {
  if (inflightBmkg) return inflightBmkg;

  const task = (async () => {
    let inatewsLive = true;
    let tewsLive = true;

    const [
      regsByNameLen,
      live30Xml,
      lastQlRaw,
      autogempaRaw,
      dirasakanRaw,
      terkiniRaw,
    ] = await Promise.all([
      preloadedRegencies
        ? Promise.resolve(preloadedRegencies)
        : getCachedRegenciesByNameLen(),
      fetchLiveText(INATEWS_LIVE30_URL, 'application/xml, text/xml, */*').catch(async () => {
        inatewsLive = false;
        return readSnapshotTextSafe('bmkg_inatews_live30event.xml');
      }),
      fetchLiveJson<unknown>(INATEWS_LAST_QL_URL).catch(() => null),
      fetchLiveJson<{ Infogempa?: { gempa?: BmkgTewsGempaItem } }>(BMKG_AUTOGEMPA_URL).catch(
        () => null
      ),
      fetchLiveJson<{ Infogempa?: { gempa?: BmkgTewsGempaItem[] } }>(BMKG_DIRASAKAN_URL).catch(
        async () => {
          tewsLive = false;
          return readSnapshotJson<{ Infogempa?: { gempa?: BmkgTewsGempaItem[] } }>(
            'bmkg_gempadirasakan.json'
          ).catch(() => ({ Infogempa: { gempa: [] } }));
        }
      ),
      fetchLiveJson<{ Infogempa?: { gempa?: BmkgTewsGempaItem[] } }>(BMKG_TERKINI_URL).catch(
        async () => {
          tewsLive = false;
          return readSnapshotJson<{ Infogempa?: { gempa?: BmkgTewsGempaItem[] } }>(
            'bmkg_gempaterkini.json'
          ).catch(() => ({ Infogempa: { gempa: [] } }));
        }
      ),
    ]);

    const nowIso = new Date().toISOString();

    // 1. Parse InaTEWS live30event.xml + merge lastQL.json
    const inatewsEvents = parseInatewsLive30Xml(live30Xml);
    const lastQlEvent = parseInatewsLastQlJson(lastQlRaw);

    if (lastQlEvent) {
      const existing = inatewsEvents.find((ev) => ev.eventId === lastQlEvent.eventId);
      if (existing) {
        if (typeof lastQlEvent.phaseCount === 'number') {
          existing.phaseCount = lastQlEvent.phaseCount;
        }
      } else {
        inatewsEvents.unshift(lastQlEvent);
      }
    } else if (inatewsEvents.length === 0) {
      inatewsLive = false;
    }

    // 2. Deduplicate TEWS bulletins (autogempa + dirasakan + terkini)
    const mergedTewsMap = new Map<string, BmkgTewsGempaItem>();
    const tewsCandidates: BmkgTewsGempaItem[] = [];
    if (autogempaRaw?.Infogempa?.gempa) {
      tewsCandidates.push(autogempaRaw.Infogempa.gempa);
    }
    tewsCandidates.push(...(dirasakanRaw.Infogempa?.gempa ?? []));
    tewsCandidates.push(...(terkiniRaw.Infogempa?.gempa ?? []));

    for (const item of tewsCandidates) {
      const key = `${item.DateTime ?? ''}|${item.Coordinates ?? ''}`;
      if (!mergedTewsMap.has(key)) {
        mergedTewsMap.set(key, { ...item });
      } else {
        const existing = mergedTewsMap.get(key)!;
        if (!existing.Dirasakan && item.Dirasakan) existing.Dirasakan = item.Dirasakan;
        if (!existing.Potensi && item.Potensi) existing.Potensi = item.Potensi;
        if (!existing.Shakemap && item.Shakemap) existing.Shakemap = item.Shakemap;
        if (!existing.Wilayah && item.Wilayah) existing.Wilayah = item.Wilayah;
      }
    }

    const tewsItems = Array.from(mergedTewsMap.values()).map((item) => {
      const coords = parseBmkgCoordinates(item.Coordinates);
      const occurredAt = item.DateTime ? new Date(item.DateTime).toISOString() : nowIso;
      const timeMs = new Date(occurredAt).getTime();
      return { item, coords, occurredAt, timeMs, consumed: false };
    });

    const incidents: DisasterIncidentDTO[] = [];
    const eqKeys: Array<{ timeMs: number; lng: number; lat: number }> = [];

    // 3. Emit InaTEWS Realtime events (enriched with TEWS Wilayah/MMI/Potensi/Shakemap when matched)
    for (const ev of inatewsEvents) {
      const evTimeMs = new Date(ev.occurredAt).getTime();
      const coords: [number, number] = [ev.lng, ev.lat];
      eqKeys.push({ timeMs: evTimeMs, lng: ev.lng, lat: ev.lat });

      let matchedTews: (typeof tewsItems)[number] | undefined;
      for (const candidate of tewsItems) {
        if (candidate.consumed || !candidate.coords) continue;
        const dt = Math.abs(candidate.timeMs - evTimeMs);
        const dLng = Math.abs(candidate.coords[0] - ev.lng);
        const dLat = Math.abs(candidate.coords[1] - ev.lat);
        if (dt <= 180_000 && dLng <= 0.45 && dLat <= 0.45) {
          matchedTews = candidate;
          candidate.consumed = true;
          break;
        }
      }

      const tews = matchedTews?.item;
      const felt = tews?.Dirasakan?.trim() || '';
      const displayLocation = tews?.Wilayah?.trim() || ev.area;
      const magStr = ev.magnitude.toFixed(1);
      const depthStr = tews?.Kedalaman?.trim() || `${ev.depthKm} km`;
      const eventStatusLabel = formatInatewsStatusLabel(ev.status);
      const shakemapUrl = buildShakemapUrl(tews?.Shakemap);

      const spreadRegions = matchFeltRegencies(felt, displayLocation, coords, regsByNameLen);
      const primaryReg = spreadRegions[0];

      const summaryParts = [
        `Kedalaman ${depthStr}`,
        `Status ${eventStatusLabel}`,
      ];
      if (typeof ev.phaseCount === 'number') {
        summaryParts.push(`${ev.phaseCount} fase stasiun`);
      }
      if (tews?.Potensi?.trim()) {
        summaryParts.push(tews.Potensi.trim());
      } else if (ev.focalMechanism === 'mt_yes') {
        summaryParts.push('Analisis Moment Tensor tersedia di InaTEWS');
      }

      incidents.push({
        id: `bmkg-rt-${ev.eventId}`,
        title: `Gempa M ${magStr} — ${displayLocation}`,
        category: 'EARTHQUAKE',
        categoryLabel: 'Gempabumi',
        coordinates: coords,
        precision: 'EXACT_EPICENTER',
        precisionLabel: 'Episentrum Realtime InaTEWS BMKG',
        occurredAt: ev.occurredAt,
        locationText: displayLocation,
        regionCode: primaryReg?.code,
        provinceCode: primaryReg?.provinceCode,
        summary: `${summaryParts.join(' · ')}.`,
        metrics: {
          magnitude: magStr,
          depth: depthStr,
          feltAreas: felt || undefined,
          potential: tews?.Potensi?.trim() || undefined,
          eventId: ev.eventId,
          eventStatus: eventStatusLabel,
          focalMechanism: ev.focalMechanism,
          phaseCount: ev.phaseCount,
          shakemapUrl,
        },
        spreadRegions,
        spreadExplanation: felt
          ? `Wilayah merasakan getaran (skala MMI resmi BMKG): ${felt}.`
          : primaryReg
            ? `Pusat gempa realtime InaTEWS dekat ${primaryReg.name}; tidak ada laporan getaran MMI pada buletin dirasakan BMKG.`
            : 'Episentrum terpantau pada jaringan sensor seismik realtime BMKG InaTEWS.',
        source: {
          title: 'BMKG InaTEWS Realtime (live30event.xml)',
          publisher: 'BMKG InaTEWS',
          url: `${INATEWS_DETAIL_BASE_URL}?name=${encodeURIComponent(ev.eventId)}`,
          category: 'OFFICIAL',
          isLive: inatewsLive,
          updatedAt: nowIso,
        },
      });
    }

    // 4. Preserve remaining unconsumed TEWS events (older M>=5 or felt quakes beyond rolling 200 events)
    for (const entry of tewsItems) {
      if (entry.consumed || !entry.coords) continue;
      const eq = entry.item;
      const coords = entry.coords;
      eqKeys.push({ timeMs: entry.timeMs, lng: coords[0], lat: coords[1] });

      const felt = eq.Dirasakan?.trim() || '';
      const wilayah = eq.Wilayah?.trim() || 'Indonesia';
      const spreadRegions = matchFeltRegencies(felt, wilayah, coords, regsByNameLen);
      const primaryReg = spreadRegions[0];

      incidents.push({
        id: `bmkg-tews-${entry.occurredAt}-${coords[0].toFixed(2)}-${coords[1].toFixed(2)}`,
        title: `Gempa M ${eq.Magnitude ?? '?'} — ${wilayah}`,
        category: 'EARTHQUAKE',
        categoryLabel: 'Gempabumi',
        coordinates: coords,
        precision: 'EXACT_EPICENTER',
        precisionLabel: 'Episentrum Resmi BMKG TEWS',
        occurredAt: entry.occurredAt,
        locationText: wilayah,
        regionCode: primaryReg?.code,
        provinceCode: primaryReg?.provinceCode,
        summary: `Kedalaman ${eq.Kedalaman ?? '-'}. ${eq.Potensi ?? ''}`.trim(),
        metrics: {
          magnitude: eq.Magnitude,
          depth: eq.Kedalaman,
          feltAreas: felt || undefined,
          potential: eq.Potensi,
          shakemapUrl: buildShakemapUrl(eq.Shakemap),
        },
        spreadRegions,
        spreadExplanation: felt
          ? `Wilayah merasakan getaran (skala MMI resmi BMKG): ${felt}.`
          : primaryReg
            ? `Pusat gempa dekat ${primaryReg.name}; tidak ada laporan getaran daratan pada daftar dirasakan BMKG.`
            : 'Episentrum berada di laut lepas tanpa laporan dampak daratan pada feed BMKG.',
        source: {
          title: 'BMKG TEWS — Gempa Bumi Terkini & Dirasakan',
          publisher: 'BMKG TEWS',
          url: 'https://data.bmkg.go.id/gempabumi/',
          category: 'OFFICIAL',
          isLive: tewsLive,
          updatedAt: nowIso,
        },
      });
    }

    incidents.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    const response: RealtimeEarthquakesResponse = {
      updatedAt: nowIso,
      liveStatus: {
        inatews: inatewsLive ? 'live' : 'snapshot',
        tews: tewsLive ? 'live' : 'snapshot',
      },
      totalCount: incidents.length,
      latestEarthquake: incidents[0] ?? null,
      incidents,
    };

    const result: BmkgRealtimeResult = { response, eqKeys };
    cachedResult = result;
    cachedResultAt = performance.now();
    if (forceRefresh) lastForcedAt = cachedResultAt;

    return result;
  })();

  inflightBmkg = task;
  try {
    return await task;
  } finally {
    inflightBmkg = null;
  }
}
