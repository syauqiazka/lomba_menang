import fs from 'fs/promises';
import path from 'path';
import type {
  PublicStatus,
  RegionDetailDTO,
  RegionMapDTO,
  SourceCategory,
  StatDTO,
} from '@/types/map';
import type { MapSummaryCounts } from '@/lib/map-data';
import type { NationalStatItem, NationalStatsBundle, SourceRegistryRow } from '@/lib/site-data';
import type { RegencyLookupRef } from '@/lib/bmkg-realtime';

const GEO_PROVINCES_PATH = path.join(process.cwd(), 'public', 'geo', 'provinces.geojson');
const GEO_REGENCIES_DIR = path.join(process.cwd(), 'public', 'geo', 'regencies');
const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'snapshots', 'bnpb-2026-11-28');
const IMPORT_BATCH_ID = 'bnpb-gis-snapshot-2026-11-28';
const SNAPSHOT_ACCESS_DATE = new Date('2026-11-28T00:00:00.000Z');

const STATUS_PRIORITY: Record<PublicStatus, number> = {
  AKSES_TERISOLIR: 3,
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: 2,
  BELUM_TERVERIFIKASI: 1,
};

function pickHigherStatus(a?: PublicStatus, b?: PublicStatus): PublicStatus | undefined {
  if (!a) return b;
  if (!b) return a;
  return STATUS_PRIORITY[a] >= STATUS_PRIORITY[b] ? a : b;
}

function normalizeRegencyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bkabupaten\b|\bkab\.?\b|\bkota\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
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
  if (parts.length < 2) return null;
  if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  return parts[0].padStart(2, '0') + parts[1].padStart(2, '0');
}

function stripHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/●/g, '•')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIntNonNeg(val?: number | null): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return Math.max(0, Math.round(val));
}

function addOpt(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function maxDateMs(msList: Array<number | null | undefined>, fallback: Date): Date {
  const valid = msList.filter((m): m is number => typeof m === 'number' && m > 0);
  if (valid.length === 0) return fallback;
  return new Date(Math.max(...valid));
}

function minDateMs(msList: Array<number | null | undefined>, fallback: Date): Date {
  const valid = msList.filter((m): m is number => typeof m === 'number' && m > 0);
  if (valid.length === 0) return fallback;
  return new Date(Math.min(...valid));
}

function mapWeeklyCategory(raw?: string | null): { eventName: string; type: string } {
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('banjir')) {
    return { eventName: 'Banjir Mingguan Nasional (Nov 2026)', type: 'FLOOD' };
  }
  if (lower.includes('cuaca ekstrem') || lower.includes('angin')) {
    return { eventName: 'Cuaca Ekstrem Mingguan Nasional (Nov 2026)', type: 'EXTREME_WEATHER' };
  }
  if (lower.includes('longsor')) {
    return { eventName: 'Tanah Longsor Mingguan Nasional (Nov 2026)', type: 'LANDSLIDE' };
  }
  if (lower.includes('kebakaran')) {
    return { eventName: 'Karhutla Mingguan Nasional (Nov 2026)', type: 'OTHER' };
  }
  return { eventName: 'Kejadian Bencana Mingguan Lainnya (Nov 2026)', type: 'OTHER' };
}

function computeGeoCentroid(geometry: unknown): [number, number] | undefined {
  if (!geometry || typeof geometry !== 'object') return undefined;
  const g = geometry as { type?: string; coordinates?: unknown };
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const visit = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      const lng = node[0];
      const lat = node[1];
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      return;
    }
    for (const child of node) {
      visit(child);
    }
  };

  visit(g.coordinates);
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return undefined;
  return [
    Number(((minLng + maxLng) / 2).toFixed(5)),
    Number(((minLat + maxLat) / 2).toFixed(5)),
  ];
}

interface StoredProvince {
  code: string;
  name: string;
  centroid?: [number, number];
}

interface StoredRegency {
  code: string;
  name: string;
  parentCode: string;
  centroid?: [number, number];
}

interface StoredImpact {
  id: string;
  eventId: string;
  eventName: string;
  eventType: string;
  eventNature: string;
  occurredAt: Date;
  regionCode: string;
  regionName: string;
  parentCode: string;
  status: PublicStatus;
  affectedCount?: number;
  displacedCount?: number;
  injuredCount?: number;
  fatalitiesCount?: number;
  damagedHouses?: number;
  notes: string;
  source: {
    id: string;
    title: string;
    publisher: string;
    category: SourceCategory;
    url?: string;
    publicationDate?: Date;
    accessDate: Date;
  };
}

interface LocalSnapshotStore {
  provinces: StoredProvince[];
  regencies: StoredRegency[];
  provinceByCode: Map<string, StoredProvince>;
  regencyByCode: Map<string, StoredRegency>;
  regenciesByProvince: Map<string, StoredRegency[]>;
  impactsByRegion: Map<string, StoredImpact[]>;
  impactsByProvince: Map<string, StoredImpact[]>;
  statsByRegion: Map<string, StatDTO[]>;
  nationalStats: NationalStatItem[];
  sources: SourceRegistryRow[];
  regencyLookupRefs: RegencyLookupRef[];
}

interface NttAttr {
  id_kab?: string | null;
  tanggal_update?: number | null;
  meninggal?: number | null;
  luka_sakit_?: number | null;
  menderita_?: number | null;
  mengungsi_?: number | null;
  mengungsi_mandiri?: number | null;
  mengungsi_terpusat?: number | null;
  rumah_rusak?: number | null;
  total_rumah_verif?: number | null;
  jumlah_jalan?: number | null;
}

interface BansorAttr {
  dt?: number | null;
  kategori_bencana?: string | null;
  id_kab_sdi?: string | null;
  meninggal?: number | null;
  luka_sakit?: number | null;
  menderita?: number | null;
  mengungsi?: number | null;
  tot_rumah_rusak?: number | null;
  rumah_rusak?: number | null;
  jembatan_rusak?: number | null;
  huntap_usul?: number | null;
  huntap_terbangun?: number | null;
  huntara_usul?: number | null;
  huntara_terbangun?: number | null;
  dth_usul?: number | null;
  dth_transfer?: number | null;
}

interface MingguanAttr {
  dt?: number | null;
  kategori_bencana?: string | null;
  id_kab_sdi?: string | null;
  meninggal?: number | null;
  luka_sakit?: number | null;
  menderita?: number | null;
  mengungsi?: number | null;
  rumah_rusak?: number | null;
  jembatan_rusak?: number | null;
  kondisi_mutakhir?: string | null;
}

interface PuAttr {
  id_desa_sdi?: string | null;
  dt?: number | null;
  damage?: string | null;
  sumber?: string | null;
}

const globalForFallback = globalThis as unknown as {
  __localDbFallbackPromise?: Promise<LocalSnapshotStore>;
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function buildLocalSnapshotStore(): Promise<LocalSnapshotStore> {
  const [provGeo, regencyFiles, nttRaw, bansorRaw, mingRaw, puRaw] = await Promise.all([
    readJsonFile<{
      features?: Array<{ properties?: { code?: string; name?: string }; geometry?: unknown }>;
    }>(GEO_PROVINCES_PATH),
    fs.readdir(GEO_REGENCIES_DIR),
    readJsonFile<{ features?: Array<{ attributes?: NttAttr }> }>(
      path.join(SNAPSHOT_DIR, 'mv_gempa_ntt_2026_v2.json')
    ).catch(() => ({ features: [] })),
    readJsonFile<{ features?: Array<{ attributes?: BansorAttr }> }>(
      path.join(SNAPSHOT_DIR, 'mv_bansor_sumatera_v4.json')
    ).catch(() => ({ features: [] })),
    readJsonFile<{ features?: Array<{ attributes?: MingguanAttr }> }>(
      path.join(SNAPSHOT_DIR, 'kejadian_bencana_mingguan.json')
    ).catch(() => ({ features: [] })),
    readJsonFile<{ features?: Array<{ attributes?: PuAttr }> }>(
      path.join(SNAPSHOT_DIR, 'data_jalan_jembatan_putus_akses_pu.json')
    ).catch(() => ({ features: [] })),
  ]);

  const provinces: StoredProvince[] = (provGeo.features ?? [])
    .filter((f) => f.properties?.code && f.properties?.name)
    .map((f) => ({
      code: String(f.properties!.code),
      name: String(f.properties!.name),
      centroid: computeGeoCentroid(f.geometry),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const regencyGeoList = await Promise.all(
    regencyFiles
      .filter((fn) => fn.endsWith('.geojson'))
      .map((fn) =>
        readJsonFile<{
          features?: Array<{
            properties?: {
              code?: string;
              name?: string;
              parentCode?: string;
              provinceCode?: string;
            };
            geometry?: unknown;
          }>;
        }>(path.join(GEO_REGENCIES_DIR, fn))
      )
  );

  const regencies: StoredRegency[] = [];
  for (const fc of regencyGeoList) {
    for (const f of fc.features ?? []) {
      const code = f.properties?.code ? String(f.properties.code) : '';
      const name = f.properties?.name ? String(f.properties.name) : '';
      if (!code || !name) continue;
      const parentCode = String(
        f.properties?.parentCode ?? f.properties?.provinceCode ?? code.slice(0, 2)
      );
      regencies.push({
        code,
        name,
        parentCode,
        centroid: computeGeoCentroid(f.geometry),
      });
    }
  }
  regencies.sort((a, b) => a.name.localeCompare(b.name));

  const provinceByCode = new Map(provinces.map((p) => [p.code, p]));
  const regencyByCode = new Map(regencies.map((r) => [r.code, r]));
  const regenciesByProvince = new Map<string, StoredRegency[]>();
  for (const reg of regencies) {
    if (!regenciesByProvince.has(reg.parentCode)) regenciesByProvince.set(reg.parentCode, []);
    regenciesByProvince.get(reg.parentCode)!.push(reg);
  }

  const nttAttrs = (nttRaw.features ?? []).map((f) => f.attributes ?? {});
  const bansorAttrs = (bansorRaw.features ?? []).map((f) => f.attributes ?? {});
  const mingAttrs = (mingRaw.features ?? []).map((f) => f.attributes ?? {});
  const puAttrs = (puRaw.features ?? []).map((f) => f.attributes ?? {});

  const nttLatestDate = maxDateMs(
    nttAttrs.map((a) => a.tanggal_update),
    SNAPSHOT_ACCESS_DATE
  );
  const bansorLatestDate = maxDateMs(
    bansorAttrs.map((a) => a.dt),
    SNAPSHOT_ACCESS_DATE
  );
  const mingLatestDate = maxDateMs(
    mingAttrs.map((a) => a.dt),
    SNAPSHOT_ACCESS_DATE
  );
  const puLatestDate = maxDateMs(
    puAttrs.map((a) => a.dt),
    SNAPSHOT_ACCESS_DATE
  );

  const srcNtt: SourceRegistryRow = {
    id: 'local-src-ntt-2026',
    title: 'BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026 (mv_gempa_ntt_2026_v2)',
    publisher: 'BNPB',
    url: 'https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40',
    category: 'OFFICIAL',
    publicationDate: nttLatestDate,
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Layanan spasial resmi BNPB yang memuat data korban jiwa, pengungsi (mandiri/terpusat), kerusakan rumah & verifikasi, serta akses jalan per kabupaten pasca gempa M 7,7 Flores NTT Agustus 2026.',
    importBatchId: IMPORT_BATCH_ID,
  };
  const srcBansor: SourceRegistryRow = {
    id: 'local-src-bansor-sumatera',
    title: 'BNPB Geoportal — Data Banjir dan Longsor Sumatera (MV_Bansor_Sumatera_v4)',
    publisher: 'BNPB',
    url: 'https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0',
    category: 'OFFICIAL',
    publicationDate: bansorLatestDate,
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Layanan resmi dashboard Banjir & Longsor Sumatera BNPB memuat jumlah terdampak, mengungsi, rumah rusak, jembatan rusak, usulan & realisasi huntap/huntara/DTH.',
    importBatchId: IMPORT_BATCH_ID,
  };
  const srcMingguan: SourceRegistryRow = {
    id: 'local-src-mingguan',
    title: 'BNPB Geoportal — Kejadian Bencana Mingguan Nasional (Kejadian_Bencana_Mingguan)',
    publisher: 'BNPB',
    url: 'https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25',
    category: 'OFFICIAL',
    publicationDate: mingLatestDate,
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Layanan resmi BNPB untuk kejadian bencana mingguan di seluruh Indonesia beserta kondisi mutakhir dan dampak wilayah per kabupaten/kota.',
    importBatchId: IMPORT_BATCH_ID,
  };
  const srcPu: SourceRegistryRow = {
    id: 'local-src-pu-akses',
    title: 'SITABA Kementerian PU & BNPB — Data Jalan dan Jembatan Putus Akses',
    publisher: 'Kementerian PU & BNPB',
    url: 'https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13',
    category: 'OFFICIAL',
    publicationDate: puLatestDate,
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Kompilasi SITABA Kementerian PU, Direktorat PERB BNPB, dan Pusdalops BNPB atas 341 titik jalan dan jembatan putus akses di Sumatera.',
    importBatchId: IMPORT_BATCH_ID,
  };
  const srcBig: SourceRegistryRow = {
    id: 'local-src-big-batas',
    title: 'BIG & BPS — Batas Administrasi Provinsi & Kabupaten/Kota Indonesia (38/514)',
    publisher: 'BIG / BPS',
    url: 'https://tanahair.indonesia.go.id',
    category: 'OFFICIAL',
    publicationDate: new Date('2024-01-01T00:00:00.000Z'),
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Referensi batas wilayah resmi 38 provinsi dan 514 kabupaten/kota di Indonesia yang digunakan sebagai poligon dan kode SDI.',
    importBatchId: IMPORT_BATCH_ID,
  };
  const srcBmkg: SourceRegistryRow = {
    id: 'local-src-bmkg-inatews',
    title: 'BMKG InaTEWS — Realtime Seismik & Peringatan Dini Tsunami Indonesia',
    publisher: 'BMKG',
    url: 'https://inatews.bmkg.go.id/eng/realtime',
    category: 'OFFICIAL',
    publicationDate: SNAPSHOT_ACCESS_DATE,
    accessDate: SNAPSHOT_ACCESS_DATE,
    description:
      'Feed seismik realtime SeisComP InaTEWS (live30event.xml, lastQL.json) serta buletin gempabumi TEWS resmi BMKG.',
    importBatchId: IMPORT_BATCH_ID,
  };

  const sources: SourceRegistryRow[] = [
    srcNtt,
    srcBansor,
    srcMingguan,
    srcPu,
    srcBig,
    srcBmkg,
  ];

  const impactsByRegion = new Map<string, StoredImpact[]>();
  const impactsByProvince = new Map<string, StoredImpact[]>();
  const statsByRegion = new Map<string, StatDTO[]>();

  const pushImpact = (imp: StoredImpact) => {
    if (!impactsByRegion.has(imp.regionCode)) impactsByRegion.set(imp.regionCode, []);
    impactsByRegion.get(imp.regionCode)!.push(imp);
    if (!impactsByProvince.has(imp.parentCode)) impactsByProvince.set(imp.parentCode, []);
    impactsByProvince.get(imp.parentCode)!.push(imp);
  };

  const pushStat = (regionCode: string, stat: StatDTO) => {
    if (!statsByRegion.has(regionCode)) statsByRegion.set(regionCode, []);
    statsByRegion.get(regionCode)!.push(stat);
  };

  const toImpactSrc = (s: SourceRegistryRow) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher ?? 'Resmi',
    category: 'OFFICIAL' as SourceCategory,
    url: s.url ?? undefined,
    publicationDate: s.publicationDate ?? undefined,
    accessDate: s.accessDate,
  });

  // 1. PU Severed Access -> AKSES_TERISOLIR
  const puEarliest = minDateMs(
    puAttrs.map((a) => a.dt),
    new Date('2025-11-23T00:00:00.000Z')
  );
  const puByCode = new Map<
    string,
    { count: number; sources: Set<string>; samples: string[]; latestMs: number }
  >();
  for (const a of puAttrs) {
    const code = codeFromDesaSdi(a.id_desa_sdi);
    if (!code || !regencyByCode.has(code)) continue;
    const entry = puByCode.get(code) ?? {
      count: 0,
      sources: new Set<string>(),
      samples: [],
      latestMs: puLatestDate.getTime(),
    };
    entry.count += 1;
    if (a.sumber) entry.sources.add(a.sumber.trim());
    const cleanDmg = stripHtml(a.damage);
    if (cleanDmg && entry.samples.length < 2) {
      entry.samples.push(cleanDmg.slice(0, 140));
    }
    if (typeof a.dt === 'number' && a.dt > entry.latestMs) entry.latestMs = a.dt;
    puByCode.set(code, entry);
  }

  for (const [code, info] of puByCode.entries()) {
    const reg = regencyByCode.get(code)!;
    const srcText = Array.from(info.sources).join(', ') || 'SITABA Kementerian PU & BNPB';
    const sampleText =
      info.samples.length > 0 ? ` Contoh laporan: ${info.samples.join(' | ')}` : '';
    pushImpact({
      id: `local-imp-pu-${code}`,
      eventId: 'local-ev-pu-sumatera',
      eventName: 'Putus Akses Jalan dan Jembatan Sumatera (PU & BNPB)',
      eventType: 'LANDSLIDE',
      eventNature: 'ENVIRONMENTAL',
      occurredAt: puEarliest,
      regionCode: reg.code,
      regionName: reg.name,
      parentCode: reg.parentCode,
      status: 'AKSES_TERISOLIR',
      notes: `Tercatat ${info.count} titik jalan/jembatan putus akses (sumber: ${srcText}).${sampleText}`,
      source: toImpactSrc(srcPu),
    });
    pushStat(reg.code, {
      key: 'pu_severed_access_points',
      label: 'Titik Jalan/Jembatan Putus Akses',
      value: String(info.count),
      unit: 'titik',
      asOfDate: new Date(info.latestMs).toISOString(),
      source: { title: srcPu.title, category: 'OFFICIAL', url: srcPu.url ?? undefined },
    });
  }

  // 2. NTT 2026 Earthquake
  let nttSumDamagedHouses = 0;
  let nttSumDisplaced = 0;
  const nttOccurredAt = new Date('2026-08-15T04:58:00.000Z');

  for (const a of nttAttrs) {
    const code = normalizeCode4(a.id_kab);
    if (!code) continue;
    const reg = regencyByCode.get(code);
    if (!reg) continue;

    const rr = toIntNonNeg(a.rumah_rusak);
    const verif = toIntNonNeg(a.total_rumah_verif) ?? 0;
    const meng = toIntNonNeg(a.mengungsi_);
    const mandiri = toIntNonNeg(a.mengungsi_mandiri) ?? 0;
    const terpusat = toIntNonNeg(a.mengungsi_terpusat) ?? 0;
    const jalan = toIntNonNeg(a.jumlah_jalan) ?? 0;
    const updDate = a.tanggal_update ? new Date(a.tanggal_update) : nttLatestDate;

    nttSumDamagedHouses += rr ?? 0;
    nttSumDisplaced += meng ?? 0;

    let status: PublicStatus;
    let notes: string;
    if (jalan > 0) {
      status = 'AKSES_TERISOLIR';
      notes = `Tercatat ${jalan} ruas jalan terdampak, ${rr ?? 0} rumah rusak (${verif} terverifikasi), dan ${meng ?? 0} pengungsi (${mandiri} mandiri, ${terpusat} terpusat).`;
    } else if ((meng ?? 0) > 0 && verif > 0) {
      status = 'DILAPORKAN_BELUM_MENERIMA_BANTUAN';
      notes = `Tercatat ${meng ?? 0} pengungsi (${mandiri} mandiri, ${terpusat} terpusat) serta ${rr ?? 0} rumah rusak (${verif} terverifikasi) yang memerlukan dukungan hunian/logistik.`;
    } else {
      status = 'BELUM_TERVERIFIKASI';
      notes = `Laporan awal BNPB mencatat ${rr ?? 0} rumah rusak dengan total rumah terverifikasi = ${verif} per pembaruan ${updDate.toISOString().slice(0, 10)}.`;
    }

    pushImpact({
      id: `local-imp-ntt-${code}`,
      eventId: 'local-ev-ntt-2026',
      eventName: 'Gempabumi Flores NTT Agustus 2026',
      eventType: 'EARTHQUAKE',
      eventNature: 'GEOLOGICAL',
      occurredAt: nttOccurredAt,
      regionCode: reg.code,
      regionName: reg.name,
      parentCode: reg.parentCode,
      status,
      affectedCount: toIntNonNeg(a.menderita_) ?? undefined,
      displacedCount: meng ?? undefined,
      injuredCount: toIntNonNeg(a.luka_sakit_) ?? undefined,
      fatalitiesCount: toIntNonNeg(a.meninggal) ?? undefined,
      damagedHouses: rr ?? undefined,
      notes,
      source: toImpactSrc(srcNtt),
    });

    if (jalan > 0) {
      pushStat(reg.code, {
        key: 'ntt_damaged_roads',
        label: 'Ruas Jalan Terdampak',
        value: String(jalan),
        unit: 'ruas',
        asOfDate: updDate.toISOString(),
        source: { title: srcNtt.title, category: 'OFFICIAL', url: srcNtt.url ?? undefined },
      });
    }
    pushStat(reg.code, {
      key: 'ntt_verified_houses',
      label: 'Rumah Rusak Terverifikasi',
      value: String(verif),
      unit: 'unit',
      asOfDate: updDate.toISOString(),
      source: { title: srcNtt.title, category: 'OFFICIAL', url: srcNtt.url ?? undefined },
    });
  }

  // 3. Bansor Sumatera
  const bansorEarliest = minDateMs(
    bansorAttrs.map((a) => a.dt),
    new Date('2025-11-23T00:00:00.000Z')
  );
  const bansorByCode = new Map<
    string,
    {
      affected: number | null;
      displaced: number | null;
      injured: number | null;
      fatalities: number | null;
      damagedHouses: number | null;
      huntapUsul: number;
      huntapBuilt: number;
      huntaraUsul: number;
      huntaraBuilt: number;
      dthUsul: number;
      dthTransfer: number;
      categories: Set<string>;
      latestMs: number;
    }
  >();

  for (const a of bansorAttrs) {
    const code = normalizeCode4(a.id_kab_sdi);
    if (!code || !regencyByCode.has(code)) continue;
    const prev = bansorByCode.get(code) ?? {
      affected: null,
      displaced: null,
      injured: null,
      fatalities: null,
      damagedHouses: null,
      huntapUsul: 0,
      huntapBuilt: 0,
      huntaraUsul: 0,
      huntaraBuilt: 0,
      dthUsul: 0,
      dthTransfer: 0,
      categories: new Set<string>(),
      latestMs: bansorLatestDate.getTime(),
    };
    prev.affected = addOpt(prev.affected, toIntNonNeg(a.menderita));
    prev.displaced = addOpt(prev.displaced, toIntNonNeg(a.mengungsi));
    prev.injured = addOpt(prev.injured, toIntNonNeg(a.luka_sakit));
    prev.fatalities = addOpt(prev.fatalities, toIntNonNeg(a.meninggal));
    prev.damagedHouses = addOpt(
      prev.damagedHouses,
      toIntNonNeg(a.tot_rumah_rusak ?? a.rumah_rusak)
    );
    prev.huntapUsul += a.huntap_usul ?? 0;
    prev.huntapBuilt += a.huntap_terbangun ?? 0;
    prev.huntaraUsul += a.huntara_usul ?? 0;
    prev.huntaraBuilt += a.huntara_terbangun ?? 0;
    prev.dthUsul += a.dth_usul ?? 0;
    prev.dthTransfer += a.dth_transfer ?? 0;
    if (a.kategori_bencana) prev.categories.add(a.kategori_bencana);
    if (typeof a.dt === 'number' && a.dt > prev.latestMs) prev.latestMs = a.dt;
    bansorByCode.set(code, prev);
  }

  for (const [code, agg] of bansorByCode.entries()) {
    const reg = regencyByCode.get(code)!;
    const hasAidGap =
      agg.huntapUsul > agg.huntapBuilt ||
      agg.huntaraUsul > agg.huntaraBuilt ||
      agg.dthUsul > agg.dthTransfer ||
      (agg.displaced ?? 0) > 0;
    const status: PublicStatus = hasAidGap
      ? 'DILAPORKAN_BELUM_MENERIMA_BANTUAN'
      : 'BELUM_TERVERIFIKASI';

    const cats = Array.from(agg.categories).join(' & ') || 'Banjir/Longsor';
    const gapParts: string[] = [];
    if (agg.huntapUsul > agg.huntapBuilt) {
      gapParts.push(`Huntap usul ${agg.huntapUsul} / terbangun ${agg.huntapBuilt}`);
    }
    if (agg.huntaraUsul > agg.huntaraBuilt) {
      gapParts.push(`Huntara usul ${agg.huntaraUsul} / terbangun ${agg.huntaraBuilt}`);
    }
    if (agg.dthUsul > agg.dthTransfer) {
      gapParts.push(`DTH usul ${agg.dthUsul} / tersalur ${agg.dthTransfer}`);
    }
    if ((agg.displaced ?? 0) > 0) {
      gapParts.push(`Pengungsi tercatat ${agg.displaced} jiwa`);
    }

    const notes = hasAidGap
      ? `Rekap BNPB (${cats}): ${gapParts.join('; ')}. Total terdampak ${agg.affected ?? 0} jiwa, rumah rusak ${agg.damagedHouses ?? 0} unit.`
      : `Rekap BNPB (${cats}): ${agg.affected ?? 0} jiwa terdampak, ${agg.damagedHouses ?? 0} rumah rusak; belum ada laporan kebutuhan huntap/DTH terbuka pada layer ini.`;

    pushImpact({
      id: `local-imp-bansor-${code}`,
      eventId: 'local-ev-bansor-sumatera',
      eventName: 'Banjir dan Longsor Sumatera (BNPB)',
      eventType: 'FLOOD',
      eventNature: 'ENVIRONMENTAL',
      occurredAt: bansorEarliest,
      regionCode: reg.code,
      regionName: reg.name,
      parentCode: reg.parentCode,
      status,
      affectedCount: agg.affected ?? undefined,
      displacedCount: agg.displaced ?? undefined,
      injuredCount: agg.injured ?? undefined,
      fatalitiesCount: agg.fatalities ?? undefined,
      damagedHouses: agg.damagedHouses ?? undefined,
      notes,
      source: toImpactSrc(srcBansor),
    });

    if (agg.huntapUsul > 0) {
      pushStat(reg.code, {
        key: 'bansor_huntap_gap',
        label: 'Realisasi vs Usulan Huntap (BNPB)',
        value: `${agg.huntapBuilt}/${agg.huntapUsul}`,
        unit: 'unit',
        asOfDate: new Date(agg.latestMs).toISOString(),
        source: { title: srcBansor.title, category: 'OFFICIAL', url: srcBansor.url ?? undefined },
      });
    } else if ((agg.damagedHouses ?? 0) > 0) {
      pushStat(reg.code, {
        key: 'bansor_damaged_houses',
        label: 'Total Rumah Rusak (BNPB Sumatera)',
        value: String(agg.damagedHouses),
        unit: 'unit',
        asOfDate: new Date(agg.latestMs).toISOString(),
        source: { title: srcBansor.title, category: 'OFFICIAL', url: srcBansor.url ?? undefined },
      });
    }
  }

  // 4. Weekly National BNPB
  const mingByEventAndCode = new Map<
    string,
    {
      eventName: string;
      eventType: string;
      code: string;
      affected: number | null;
      displaced: number | null;
      injured: number | null;
      fatalities: number | null;
      damagedHouses: number | null;
      bridges: number;
      conditions: string[];
      latestMs: number;
      minMs: number;
    }
  >();

  for (const a of mingAttrs) {
    const code = normalizeCode4(a.id_kab_sdi);
    if (!code || !regencyByCode.has(code)) continue;
    const mapped = mapWeeklyCategory(a.kategori_bencana);
    const compKey = `${mapped.eventName}|${mapped.type}|${code}`;
    const prev = mingByEventAndCode.get(compKey) ?? {
      eventName: mapped.eventName,
      eventType: mapped.type,
      code,
      affected: null,
      displaced: null,
      injured: null,
      fatalities: null,
      damagedHouses: null,
      bridges: 0,
      conditions: [],
      latestMs: mingLatestDate.getTime(),
      minMs: new Date('2026-11-16T00:00:00.000Z').getTime(),
    };
    prev.affected = addOpt(prev.affected, toIntNonNeg(a.menderita));
    prev.displaced = addOpt(prev.displaced, toIntNonNeg(a.mengungsi));
    prev.injured = addOpt(prev.injured, toIntNonNeg(a.luka_sakit));
    prev.fatalities = addOpt(prev.fatalities, toIntNonNeg(a.meninggal));
    prev.damagedHouses = addOpt(prev.damagedHouses, toIntNonNeg(a.rumah_rusak));
    prev.bridges += a.jembatan_rusak ?? 0;
    const cleanKm = stripHtml(a.kondisi_mutakhir);
    if (cleanKm) prev.conditions.push(cleanKm);
    if (typeof a.dt === 'number') {
      if (a.dt > prev.latestMs) prev.latestMs = a.dt;
      if (a.dt > 0 && a.dt < prev.minMs) prev.minMs = a.dt;
    }
    mingByEventAndCode.set(compKey, prev);
  }

  for (const [compKey, item] of mingByEventAndCode.entries()) {
    const reg = regencyByCode.get(item.code)!;
    const joinedCond = item.conditions.join(' | ');
    const lowerCond = joinedCond.toLowerCase();

    let status: PublicStatus;
    if (
      item.bridges > 0 ||
      /terisolir|terputus|jalan putus|jembatan putus|akses tertutup/.test(lowerCond)
    ) {
      status = 'AKSES_TERISOLIR';
    } else if (
      (item.displaced ?? 0) > 0 ||
      /menunggu perbaikan|belum menerima|membutuhkan bantuan/.test(lowerCond)
    ) {
      status = 'DILAPORKAN_BELUM_MENERIMA_BANTUAN';
    } else {
      status = 'BELUM_TERVERIFIKASI';
    }

    const condSnippet = joinedCond
      ? ` Kondisi mutakhir BNPB: ${joinedCond.slice(0, 220)}`
      : '';
    pushImpact({
      id: `local-imp-weekly-${compKey}`,
      eventId: `local-ev-weekly-${item.eventType.toLowerCase()}`,
      eventName: item.eventName,
      eventType: item.eventType,
      eventNature: 'ENVIRONMENTAL',
      occurredAt: new Date(item.minMs),
      regionCode: reg.code,
      regionName: reg.name,
      parentCode: reg.parentCode,
      status,
      affectedCount: item.affected ?? undefined,
      displacedCount: item.displaced ?? undefined,
      injuredCount: item.injured ?? undefined,
      fatalitiesCount: item.fatalities ?? undefined,
      damagedHouses: item.damagedHouses ?? undefined,
      notes: `Laporan mingguan BNPB: terdampak ${item.affected ?? 0} jiwa, mengungsi ${item.displaced ?? 0} jiwa.${condSnippet}`,
      source: toImpactSrc(srcMingguan),
    });

    if ((item.affected ?? 0) > 0) {
      pushStat(reg.code, {
        key: 'weekly_affected_population',
        label: 'Penduduk Terdampak (BNPB Mingguan)',
        value: String(item.affected),
        unit: 'jiwa',
        asOfDate: new Date(item.latestMs).toISOString(),
        source: {
          title: srcMingguan.title,
          category: 'OFFICIAL',
          url: srcMingguan.url ?? undefined,
        },
      });
    }
  }

  for (const list of impactsByRegion.values()) {
    list.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
  for (const list of impactsByProvince.values()) {
    list.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  const toNationalSource = (s: SourceRegistryRow) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    category: s.category,
    publicationDate: s.publicationDate,
    accessDate: s.accessDate,
    url: s.url,
  });

  const nationalStats: NationalStatItem[] = [
    {
      key: 'pu_bnpb_severed_access_points',
      label: 'Titik Jalan & Jembatan Putus Akses',
      value: String(puAttrs.length),
      unit: 'titik',
      asOfDate: puLatestDate,
      source: toNationalSource(srcPu),
    },
    {
      key: 'ntt_2026_total_damaged_houses',
      label: 'Rumah Rusak Gempa Flores NTT 2026',
      value: String(nttSumDamagedHouses),
      unit: 'unit',
      asOfDate: nttLatestDate,
      source: toNationalSource(srcNtt),
    },
    {
      key: 'ntt_2026_total_displaced',
      label: 'Warga Mengungsi Gempa Flores NTT 2026',
      value: String(nttSumDisplaced),
      unit: 'jiwa',
      asOfDate: nttLatestDate,
      source: toNationalSource(srcNtt),
    },
  ];

  const regencyLookupRefs: RegencyLookupRef[] = regencies
    .map((r) => ({
      code: r.code,
      name: r.name,
      normalizedName: normalizeRegencyName(r.name),
      provinceCode: r.parentCode,
      centroid: r.centroid,
    }))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);

  return {
    provinces,
    regencies,
    provinceByCode,
    regencyByCode,
    regenciesByProvince,
    impactsByRegion,
    impactsByProvince,
    statsByRegion,
    nationalStats,
    sources,
    regencyLookupRefs,
  };
}

async function getStore(): Promise<LocalSnapshotStore> {
  if (!globalForFallback.__localDbFallbackPromise) {
    globalForFallback.__localDbFallbackPromise = buildLocalSnapshotStore().catch((err) => {
      globalForFallback.__localDbFallbackPromise = undefined;
      throw err;
    });
  }
  return globalForFallback.__localDbFallbackPromise;
}

function highestStatusForList(list?: StoredImpact[]): PublicStatus | undefined {
  if (!list || list.length === 0) return undefined;
  let best: PublicStatus | undefined;
  for (const imp of list) {
    best = pickHigherStatus(best, imp.status);
  }
  return best;
}

export async function getFallbackMapRegions(filters?: {
  status?: PublicStatus;
  provinceCode?: string;
}): Promise<RegionMapDTO[]> {
  const store = await getStore();
  const filteredProvs = filters?.provinceCode
    ? store.provinces.filter((p) => p.code === filters.provinceCode)
    : store.provinces;

  return filteredProvs.map((prov) => {
    const provImpacts = (store.impactsByProvince.get(prov.code) ?? []).filter((imp) =>
      filters?.status ? imp.status === filters.status : true
    );
    return {
      code: prov.code,
      name: prov.name,
      level: 'province' as const,
      status: highestStatusForList(provImpacts),
      stats: store.statsByRegion.get(prov.code) ?? [],
      centroid: prov.centroid,
    };
  });
}

export async function getFallbackAllProvinceCodes(): Promise<string[]> {
  const store = await getStore();
  return store.provinces.map((p) => p.code);
}

export async function getFallbackRegenciesForProvince(
  provinceCode: string
): Promise<RegionMapDTO[]> {
  const store = await getStore();
  const regs = store.regenciesByProvince.get(provinceCode) ?? [];
  return regs.map((reg) => ({
    code: reg.code,
    name: reg.name,
    level: 'regency' as const,
    parentCode: reg.parentCode,
    status: highestStatusForList(store.impactsByRegion.get(reg.code)),
    stats: store.statsByRegion.get(reg.code) ?? [],
    centroid: reg.centroid,
  }));
}

export async function getFallbackAllMapRegencies(): Promise<RegionMapDTO[]> {
  const store = await getStore();
  return store.regencies.map((reg) => ({
    code: reg.code,
    name: reg.name,
    level: 'regency' as const,
    parentCode: reg.parentCode,
    status: highestStatusForList(store.impactsByRegion.get(reg.code)),
    centroid: reg.centroid,
  }));
}

export async function getFallbackRegionDetail(code: string): Promise<RegionDetailDTO | null> {
  const store = await getStore();
  const prov = store.provinceByCode.get(code);
  const reg = prov ? undefined : store.regencyByCode.get(code);

  if (!prov && !reg) return null;

  const isProvince = Boolean(prov);
  const regionCode = prov ? prov.code : reg!.code;
  const regionName = prov ? prov.name : reg!.name;
  const parentCode = reg?.parentCode;
  const centroid = prov ? prov.centroid : reg!.centroid;

  const directImpacts = store.impactsByRegion.get(regionCode) ?? [];
  const childImpacts =
    isProvince && directImpacts.length === 0
      ? (store.impactsByProvince.get(regionCode) ?? []).slice(0, 25)
      : [];

  const impacts = directImpacts.length > 0 ? directImpacts : childImpacts;
  const isProvinceRollup = isProvince && directImpacts.length === 0 && childImpacts.length > 0;

  return {
    code: regionCode,
    name: regionName,
    level: isProvince ? 'province' : 'regency',
    parentCode,
    status: highestStatusForList(impacts),
    stats: store.statsByRegion.get(regionCode) ?? [],
    centroid,
    eventImpacts: impacts.map((i) => ({
      eventId: isProvinceRollup ? `${i.eventId}-${i.id}` : i.eventId,
      eventName: isProvinceRollup ? `${i.regionName} — ${i.eventName}` : i.eventName,
      eventType: i.eventType,
      eventNature: i.eventNature,
      occurredAt: i.occurredAt.toISOString(),
      status: i.status,
      affectedCount: i.affectedCount,
      displacedCount: i.displacedCount,
      injuredCount: i.injuredCount,
      fatalitiesCount: i.fatalitiesCount,
      damagedHouses: i.damagedHouses,
      notes: i.notes,
      source: {
        title: i.source.title,
        category: i.source.category,
        url: i.source.url,
        publicationDate: i.source.publicationDate?.toISOString(),
        accessDate: i.source.accessDate.toISOString(),
      },
    })),
  };
}

export async function getFallbackMapSummaryCounts(): Promise<MapSummaryCounts> {
  const store = await getStore();
  let aksesTerisolir = 0;
  let belumMenerimaBantuan = 0;
  let belumTerverifikasi = 0;

  for (const reg of store.regencies) {
    const st = highestStatusForList(store.impactsByRegion.get(reg.code));
    if (st === 'AKSES_TERISOLIR') aksesTerisolir++;
    else if (st === 'DILAPORKAN_BELUM_MENERIMA_BANTUAN') belumMenerimaBantuan++;
    else if (st === 'BELUM_TERVERIFIKASI') belumTerverifikasi++;
  }

  const provinceCount = store.provinces.length;
  const regencyCount = store.regencies.length;
  const activeStatusCount = aksesTerisolir + belumMenerimaBantuan + belumTerverifikasi;
  const tidakAdaLaporan = Math.max(0, regencyCount - activeStatusCount);

  return {
    provinceCount,
    regencyCount,
    activeStatusCount,
    sourceCount: store.sources.length,
    statusCounts: {
      tidakAdaLaporan,
      belumMenerimaBantuan,
      aksesTerisolir,
      belumTerverifikasi,
    },
  };
}

export async function getFallbackNationalStatsBundle(): Promise<NationalStatsBundle> {
  const [store, summary] = await Promise.all([getStore(), getFallbackMapSummaryCounts()]);
  return {
    dbStats: store.nationalStats,
    provinceCount: summary.provinceCount,
    regencyCount: summary.regencyCount,
    sourceCount: summary.sourceCount,
  };
}

export async function getFallbackSourcesRegistry(): Promise<SourceRegistryRow[]> {
  const store = await getStore();
  return store.sources;
}

export async function getFallbackRegenciesByNameLen(): Promise<RegencyLookupRef[]> {
  const store = await getStore();
  return store.regencyLookupRefs;
}
