import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import {
  DisasterType,
  EventNature,
  PrismaClient,
  PublicStatus,
  SourceCategory,
} from "@prisma/client";
import { z } from "zod";

const SNAPSHOT_DIR = path.resolve(__dirname, "..", "data", "snapshots", "bnpb-2026-11-28");
const IMPORT_BATCH_ID = "bnpb-gis-snapshot-2026-11-28";
const SNAPSHOT_ACCESS_DATE = new Date("2026-11-28T00:00:00.000Z");

const prisma = new PrismaClient();

const NttFeatureSchema = z.object({
  attributes: z.object({
    id_kab: z.string().nullable().optional(),
    provinsi: z.string().nullable().optional(),
    kabupaten: z.string().nullable().optional(),
    tanggal_update: z.number().nullable().optional(),
    jenis_bencana: z.string().nullable().optional(),
    meninggal: z.number().nullable().optional(),
    luka_sakit_: z.number().nullable().optional(),
    menderita_: z.number().nullable().optional(),
    mengungsi_: z.number().nullable().optional(),
    mengungsi_mandiri: z.number().nullable().optional(),
    mengungsi_terpusat: z.number().nullable().optional(),
    rumah_rusak: z.number().nullable().optional(),
    total_rumah_verif: z.number().nullable().optional(),
    jumlah_jalan: z.number().nullable().optional(),
  }),
});

const BansorFeatureSchema = z.object({
  attributes: z.object({
    dt: z.number().nullable().optional(),
    kabupaten: z.string().nullable().optional(),
    provinsi: z.string().nullable().optional(),
    kategori_bencana: z.string().nullable().optional(),
    id_kab_sdi: z.string().nullable().optional(),
    meninggal: z.number().nullable().optional(),
    luka_sakit: z.number().nullable().optional(),
    menderita: z.number().nullable().optional(),
    mengungsi: z.number().nullable().optional(),
    tot_rumah_rusak: z.number().nullable().optional(),
    rumah_rusak: z.number().nullable().optional(),
    jembatan_rusak: z.number().nullable().optional(),
    huntap_usul: z.number().nullable().optional(),
    huntap_terbangun: z.number().nullable().optional(),
    huntara_usul: z.number().nullable().optional(),
    huntara_terbangun: z.number().nullable().optional(),
    dth_usul: z.number().nullable().optional(),
    dth_transfer: z.number().nullable().optional(),
  }),
});

const MingguanFeatureSchema = z.object({
  attributes: z.object({
    dt: z.number().nullable().optional(),
    kabupaten: z.string().nullable().optional(),
    kategori_bencana: z.string().nullable().optional(),
    id_kab_sdi: z.string().nullable().optional(),
    meninggal: z.number().nullable().optional(),
    luka_sakit: z.number().nullable().optional(),
    menderita: z.number().nullable().optional(),
    mengungsi: z.number().nullable().optional(),
    rumah_rusak: z.number().nullable().optional(),
    jembatan_rusak: z.number().nullable().optional(),
    kondisi_mutakhir: z.string().nullable().optional(),
  }),
});

const PuAksesFeatureSchema = z.object({
  attributes: z.object({
    id_desa_sdi: z.string().nullable().optional(),
    kabupaten: z.string().nullable().optional(),
    provinsi: z.string().nullable().optional(),
    dt: z.number().nullable().optional(),
    name: z.string().nullable().optional(),
    damage: z.string().nullable().optional(),
    sumber: z.string().nullable().optional(),
  }),
});

function normalizeCode4(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\./g, "").trim();
  return /^\d{4}$/.test(digits) ? digits : null;
}

function codeFromDesaSdi(raw?: string | null): string | null {
  if (!raw) return null;
  const parts = raw.trim().split(".");
  if (parts.length < 2) return null;
  if (!/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  return parts[0].padStart(2, "0") + parts[1].padStart(2, "0");
}

function stripHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/●/g, "•")
    .replace(/\s+/g, " ")
    .trim();
}

function toIntNonNeg(val?: number | null): number | null {
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  return Math.max(0, Math.round(val));
}

function addOpt(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

function maxDateMs(msList: Array<number | null | undefined>, fallback: Date): Date {
  const valid = msList.filter((m): m is number => typeof m === "number" && m > 0);
  if (valid.length === 0) return fallback;
  return new Date(Math.max(...valid));
}

function minDateMs(msList: Array<number | null | undefined>, fallback: Date): Date {
  const valid = msList.filter((m): m is number => typeof m === "number" && m > 0);
  if (valid.length === 0) return fallback;
  return new Date(Math.min(...valid));
}

async function upsertSource(input: {
  title: string;
  publisher: string;
  url: string;
  publicationDate: Date;
  description: string;
}): Promise<string> {
  const existing = await prisma.source.findFirst({
    where: { title: input.title, publisher: input.publisher },
    select: { id: true },
  });
  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: {
        url: input.url,
        category: SourceCategory.OFFICIAL,
        publicationDate: input.publicationDate,
        accessDate: SNAPSHOT_ACCESS_DATE,
        description: input.description,
        importBatchId: IMPORT_BATCH_ID,
      },
    });
    return existing.id;
  }
  const created = await prisma.source.create({
    data: {
      title: input.title,
      publisher: input.publisher,
      url: input.url,
      category: SourceCategory.OFFICIAL,
      publicationDate: input.publicationDate,
      accessDate: SNAPSHOT_ACCESS_DATE,
      description: input.description,
      importBatchId: IMPORT_BATCH_ID,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertEvent(input: {
  name: string;
  type: DisasterType;
  nature: EventNature;
  occurredAt: Date;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const existing = await prisma.disasterEvent.findFirst({
    where: { name: input.name, type: input.type, occurredAt: input.occurredAt },
    select: { id: true },
  });
  if (existing) {
    await prisma.disasterEvent.update({
      where: { id: existing.id },
      data: {
        nature: input.nature,
        description: input.description,
        metadata: input.metadata as never,
      },
    });
    return existing.id;
  }
  const created = await prisma.disasterEvent.create({
    data: {
      name: input.name,
      type: input.type,
      nature: input.nature,
      occurredAt: input.occurredAt,
      description: input.description,
      metadata: input.metadata as never,
    },
    select: { id: true },
  });
  return created.id;
}

async function runInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

function mapWeeklyCategory(raw?: string | null): { eventName: string; type: DisasterType } {
  const lower = (raw ?? "").toLowerCase();
  if (lower.includes("banjir")) {
    return { eventName: "Banjir Mingguan Nasional (Nov 2026)", type: DisasterType.FLOOD };
  }
  if (lower.includes("cuaca ekstrem") || lower.includes("angin")) {
    return { eventName: "Cuaca Ekstrem Mingguan Nasional (Nov 2026)", type: DisasterType.EXTREME_WEATHER };
  }
  if (lower.includes("longsor")) {
    return { eventName: "Tanah Longsor Mingguan Nasional (Nov 2026)", type: DisasterType.LANDSLIDE };
  }
  if (lower.includes("kebakaran")) {
    return { eventName: "Karhutla Mingguan Nasional (Nov 2026)", type: DisasterType.OTHER };
  }
  return { eventName: "Kejadian Bencana Mingguan Lainnya (Nov 2026)", type: DisasterType.OTHER };
}

async function main() {
  const [nttRaw, bansorRaw, mingRaw, puRaw] = await Promise.all([
    fs.readFile(path.join(SNAPSHOT_DIR, "mv_gempa_ntt_2026_v2.json"), "utf-8").then(JSON.parse),
    fs.readFile(path.join(SNAPSHOT_DIR, "mv_bansor_sumatera_v4.json"), "utf-8").then(JSON.parse),
    fs.readFile(path.join(SNAPSHOT_DIR, "kejadian_bencana_mingguan.json"), "utf-8").then(JSON.parse),
    fs.readFile(path.join(SNAPSHOT_DIR, "data_jalan_jembatan_putus_akses_pu.json"), "utf-8").then(JSON.parse),
  ]);

  const nttFeatures = z.array(NttFeatureSchema).parse(nttRaw.features ?? []);
  const bansorFeatures = z.array(BansorFeatureSchema).parse(bansorRaw.features ?? []);
  const mingFeatures = z.array(MingguanFeatureSchema).parse(mingRaw.features ?? []);
  const puFeatures = z.array(PuAksesFeatureSchema).parse(puRaw.features ?? []);

  const regions = await prisma.region.findMany({
    where: { level: "REGENCY_CITY" },
    select: { id: true, code: true, name: true, parentCode: true },
  });
  const regionMap = new Map(regions.map((r) => [r.code, r]));
  const unmatchedCodes = new Set<string>();

  // 1. Upsert 4 Official Sources
  const nttLatestDate = maxDateMs(
    nttFeatures.map((f) => f.attributes.tanggal_update),
    SNAPSHOT_ACCESS_DATE
  );
  const bansorLatestDate = maxDateMs(
    bansorFeatures.map((f) => f.attributes.dt),
    SNAPSHOT_ACCESS_DATE
  );
  const mingLatestDate = maxDateMs(
    mingFeatures.map((f) => f.attributes.dt),
    SNAPSHOT_ACCESS_DATE
  );
  const puLatestDate = maxDateMs(
    puFeatures.map((f) => f.attributes.dt),
    SNAPSHOT_ACCESS_DATE
  );

  const srcNttId = await upsertSource({
    title: "BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026 (mv_gempa_ntt_2026_v2)",
    publisher: "BNPB",
    url: "https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40",
    publicationDate: nttLatestDate,
    description:
      "Layanan spasial resmi BNPB yang memuat data korban jiwa, pengungsi (mandiri/terpusat), kerusakan rumah & verifikasi, serta akses jalan per kabupaten pasca gempa M 7,7 Flores NTT Agustus 2026.",
  });
  const srcBansorId = await upsertSource({
    title: "BNPB Geoportal — Data Banjir dan Longsor Sumatera (MV_Bansor_Sumatera_v4)",
    publisher: "BNPB",
    url: "https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0",
    publicationDate: bansorLatestDate,
    description:
      "Layanan resmi dashboard Banjir & Longsor Sumatera BNPB memuat jumlah terdampak, mengungsi, rumah rusak, jembatan rusak, usulan & realisasi huntap/huntara/DTH.",
  });
  const srcMingguanId = await upsertSource({
    title: "BNPB Geoportal — Kejadian Bencana Mingguan Nasional (Kejadian_Bencana_Mingguan)",
    publisher: "BNPB",
    url: "https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25",
    publicationDate: mingLatestDate,
    description:
      "Layanan resmi BNPB untuk kejadian bencana mingguan di seluruh Indonesia beserta kondisi mutakhir dan dampak wilayah per kabupaten/kota.",
  });
  const srcPuId = await upsertSource({
    title: "SITABA Kementerian PU & BNPB — Data Jalan dan Jembatan Putus Akses",
    publisher: "Kementerian PU & BNPB",
    url: "https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13",
    publicationDate: puLatestDate,
    description:
      "Kompilasi SITABA Kementerian PU, Direktorat PERB BNPB, dan Pusdalops BNPB atas 341 titik jalan dan jembatan putus akses di Sumatera.",
  });

  // 2. Upsert DisasterEvents
  const evNttId = await upsertEvent({
    name: "Gempabumi Flores NTT Agustus 2026",
    type: DisasterType.EARTHQUAKE,
    nature: EventNature.GEOLOGICAL,
    occurredAt: new Date("2026-08-15T04:58:00.000Z"),
    description: "Gempabumi tektonik sesar naik busur belakang Flores (NTT, NTB, Sulsel selatan).",
    metadata: { sourceLayer: "mv_gempa_ntt_2026_v2", snapshotAccessDate: "2026-11-28" },
  });

  const bansorEarliest = minDateMs(
    bansorFeatures.map((f) => f.attributes.dt),
    new Date("2025-11-23T00:00:00.000Z")
  );
  const evBansorId = await upsertEvent({
    name: "Banjir dan Longsor Sumatera (BNPB)",
    type: DisasterType.FLOOD,
    nature: EventNature.ENVIRONMENTAL,
    occurredAt: bansorEarliest,
    description:
      "Rangkaian kejadian banjir bandang dan longsor di Aceh, Sumatera Utara, dan Sumatera Barat beserta pemantauan huntap/huntara/DTH.",
    metadata: { sourceLayer: "MV_Bansor_Sumatera_v4", snapshotAccessDate: "2026-11-28" },
  });

  const puEarliest = minDateMs(
    puFeatures.map((f) => f.attributes.dt),
    new Date("2025-11-23T00:00:00.000Z")
  );
  const evPuId = await upsertEvent({
    name: "Putus Akses Jalan dan Jembatan Sumatera (PU & BNPB)",
    type: DisasterType.LANDSLIDE,
    nature: EventNature.ENVIRONMENTAL,
    occurredAt: puEarliest,
    description: "Titik infrastruktur jalan dan jembatan terputus/terdampak bencana di Aceh, Sumut, Sumbar, dan Riau.",
    metadata: { sourceLayer: "Data_Jalan_Jembatan_Putus_Akses_PU", snapshotAccessDate: "2026-11-28" },
  });

  const weeklyEventsMap = new Map<string, { id: string; type: DisasterType; minDt: Date }>();
  const weeklyGroupedByEvent = new Map<string, Array<(typeof mingFeatures)[number]["attributes"]>>();

  for (const f of mingFeatures) {
    const a = f.attributes;
    const mapped = mapWeeklyCategory(a.kategori_bencana);
    const key = `${mapped.eventName}|${mapped.type}`;
    if (!weeklyGroupedByEvent.has(key)) weeklyGroupedByEvent.set(key, []);
    weeklyGroupedByEvent.get(key)!.push(a);
  }

  for (const [key, rows] of weeklyGroupedByEvent.entries()) {
    const [eventName, typeStr] = key.split("|");
    const type = typeStr as DisasterType;
    const minDt = minDateMs(
      rows.map((r) => r.dt),
      new Date("2026-11-16T00:00:00.000Z")
    );
    const evId = await upsertEvent({
      name: eventName,
      type,
      nature: EventNature.ENVIRONMENTAL,
      occurredAt: minDt,
      description: `Kejadian mingguan resmi BNPB kategori ${eventName.replace(" Mingguan Nasional (Nov 2026)", "")}.`,
      metadata: { sourceLayer: "Kejadian_Bencana_Mingguan", snapshotAccessDate: "2026-11-28" },
    });
    weeklyEventsMap.set(key, { id: evId, type, minDt });
  }

  // 3. Build EventImpact upserts
  interface ImpactPayload {
    eventId: string;
    regionId: string;
    status: PublicStatus;
    affectedCount: number | null;
    displacedCount: number | null;
    injuredCount: number | null;
    fatalitiesCount: number | null;
    damagedHouses: number | null;
    notes: string;
    sourceId: string;
  }
  const impactPayloads: ImpactPayload[] = [];

  interface StatPayload {
    sourceId: string;
    eventId: string | null;
    regionId: string | null;
    key: string;
    label: string;
    value: string;
    unit: string;
    asOfDate: Date;
    metadata?: Record<string, unknown>;
  }
  const statPayloads: StatPayload[] = [];

  // 3a. PU Jalan/Jembatan Putus -> AKSES_TERISOLIR per regency
  const puByCode = new Map<
    string,
    { count: number; sources: Set<string>; samples: string[]; latestMs: number }
  >();
  for (const f of puFeatures) {
    const a = f.attributes;
    const code = codeFromDesaSdi(a.id_desa_sdi);
    if (!code) continue;
    if (!regionMap.has(code)) {
      unmatchedCodes.add(code);
      continue;
    }
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
    if (typeof a.dt === "number" && a.dt > entry.latestMs) entry.latestMs = a.dt;
    puByCode.set(code, entry);
  }

  for (const [code, info] of puByCode.entries()) {
    const reg = regionMap.get(code)!;
    const srcText = Array.from(info.sources).join(", ") || "SITABA Kementerian PU & BNPB";
    const sampleText = info.samples.length > 0 ? ` Contoh laporan: ${info.samples.join(" | ")}` : "";
    impactPayloads.push({
      eventId: evPuId,
      regionId: reg.id,
      status: PublicStatus.AKSES_TERISOLIR,
      affectedCount: null,
      displacedCount: null,
      injuredCount: null,
      fatalitiesCount: null,
      damagedHouses: null,
      notes: `Tercatat ${info.count} titik jalan/jembatan putus akses (sumber: ${srcText}).${sampleText}`,
      sourceId: srcPuId,
    });
    statPayloads.push({
      sourceId: srcPuId,
      eventId: evPuId,
      regionId: reg.id,
      key: "pu_severed_access_points",
      label: "Titik Jalan/Jembatan Putus Akses",
      value: String(info.count),
      unit: "titik",
      asOfDate: new Date(info.latestMs),
      metadata: { providers: Array.from(info.sources) },
    });
  }

  // 3b. NTT 2026 Gempa
  let nttSumDamagedHouses = 0;
  let nttSumDisplaced = 0;

  for (const f of nttFeatures) {
    const a = f.attributes;
    const code = normalizeCode4(a.id_kab);
    if (!code) continue;
    const reg = regionMap.get(code);
    if (!reg) {
      unmatchedCodes.add(code);
      continue;
    }

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
      status = PublicStatus.AKSES_TERISOLIR;
      notes = `Tercatat ${jalan} ruas jalan terdampak, ${rr ?? 0} rumah rusak (${verif} terverifikasi), dan ${meng ?? 0} pengungsi (${mandiri} mandiri, ${terpusat} terpusat).`;
    } else if ((meng ?? 0) > 0 && verif > 0) {
      status = PublicStatus.DILAPORKAN_BELUM_MENERIMA_BANTUAN;
      notes = `Tercatat ${meng ?? 0} pengungsi (${mandiri} mandiri, ${terpusat} terpusat) serta ${rr ?? 0} rumah rusak (${verif} terverifikasi) yang memerlukan dukungan hunian/logistik.`;
    } else {
      status = PublicStatus.BELUM_TERVERIFIKASI;
      notes = `Laporan awal BNPB mencatat ${rr ?? 0} rumah rusak dengan total rumah terverifikasi = ${verif} per pembaruan ${updDate.toISOString().slice(0, 10)}.`;
    }

    impactPayloads.push({
      eventId: evNttId,
      regionId: reg.id,
      status,
      affectedCount: toIntNonNeg(a.menderita_),
      displacedCount: meng,
      injuredCount: toIntNonNeg(a.luka_sakit_),
      fatalitiesCount: toIntNonNeg(a.meninggal),
      damagedHouses: rr,
      notes,
      sourceId: srcNttId,
    });

    if (jalan > 0) {
      statPayloads.push({
        sourceId: srcNttId,
        eventId: evNttId,
        regionId: reg.id,
        key: "ntt_damaged_roads",
        label: "Ruas Jalan Terdampak",
        value: String(jalan),
        unit: "ruas",
        asOfDate: updDate,
      });
    }
    statPayloads.push({
      sourceId: srcNttId,
      eventId: evNttId,
      regionId: reg.id,
      key: "ntt_verified_houses",
      label: "Rumah Rusak Terverifikasi",
      value: String(verif),
      unit: "unit",
      asOfDate: updDate,
      metadata: { totalReportedDamaged: rr ?? 0 },
    });
  }

  // 3c. Bansor Sumatera
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
      bridges: number;
      categories: Set<string>;
      latestMs: number;
    }
  >();

  for (const f of bansorFeatures) {
    const a = f.attributes;
    const code = normalizeCode4(a.id_kab_sdi);
    if (!code) continue;
    if (!regionMap.has(code)) {
      unmatchedCodes.add(code);
      continue;
    }
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
      bridges: 0,
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
    prev.bridges += a.jembatan_rusak ?? 0;
    if (a.kategori_bencana) prev.categories.add(a.kategori_bencana);
    if (typeof a.dt === "number" && a.dt > prev.latestMs) prev.latestMs = a.dt;
    bansorByCode.set(code, prev);
  }

  for (const [code, agg] of bansorByCode.entries()) {
    const reg = regionMap.get(code)!;
    const hasAidGap =
      agg.huntapUsul > agg.huntapBuilt ||
      agg.huntaraUsul > agg.huntaraBuilt ||
      agg.dthUsul > agg.dthTransfer ||
      (agg.displaced ?? 0) > 0;

    const status = hasAidGap
      ? PublicStatus.DILAPORKAN_BELUM_MENERIMA_BANTUAN
      : PublicStatus.BELUM_TERVERIFIKASI;

    const cats = Array.from(agg.categories).join(" & ") || "Banjir/Longsor";
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
      ? `Rekap BNPB (${cats}): ${gapParts.join("; ")}. Total terdampak ${agg.affected ?? 0} jiwa, rumah rusak ${agg.damagedHouses ?? 0} unit.`
      : `Rekap BNPB (${cats}): ${agg.affected ?? 0} jiwa terdampak, ${agg.damagedHouses ?? 0} rumah rusak; belum ada laporan kebutuhan huntap/DTH terbuka pada layer ini.`;

    impactPayloads.push({
      eventId: evBansorId,
      regionId: reg.id,
      status,
      affectedCount: agg.affected,
      displacedCount: agg.displaced,
      injuredCount: agg.injured,
      fatalitiesCount: agg.fatalities,
      damagedHouses: agg.damagedHouses,
      notes,
      sourceId: srcBansorId,
    });

    if (agg.huntapUsul > 0) {
      statPayloads.push({
        sourceId: srcBansorId,
        eventId: evBansorId,
        regionId: reg.id,
        key: "bansor_huntap_gap",
        label: "Realisasi vs Usulan Huntap (BNPB)",
        value: `${agg.huntapBuilt}/${agg.huntapUsul}`,
        unit: "unit",
        asOfDate: new Date(agg.latestMs),
      });
    } else if ((agg.damagedHouses ?? 0) > 0) {
      statPayloads.push({
        sourceId: srcBansorId,
        eventId: evBansorId,
        regionId: reg.id,
        key: "bansor_damaged_houses",
        label: "Total Rumah Rusak (BNPB Sumatera)",
        value: String(agg.damagedHouses),
        unit: "unit",
        asOfDate: new Date(agg.latestMs),
      });
    }
  }

  // 3d. Weekly National Nov 2026
  const mingByEventAndCode = new Map<
    string,
    {
      evId: string;
      code: string;
      affected: number | null;
      displaced: number | null;
      injured: number | null;
      fatalities: number | null;
      damagedHouses: number | null;
      bridges: number;
      conditions: string[];
      latestMs: number;
    }
  >();

  for (const f of mingFeatures) {
    const a = f.attributes;
    const code = normalizeCode4(a.id_kab_sdi);
    if (!code) continue;
    if (!regionMap.has(code)) {
      unmatchedCodes.add(code);
      continue;
    }
    const mapped = mapWeeklyCategory(a.kategori_bencana);
    const evMeta = weeklyEventsMap.get(`${mapped.eventName}|${mapped.type}`)!;
    const compKey = `${evMeta.id}|${code}`;
    const prev = mingByEventAndCode.get(compKey) ?? {
      evId: evMeta.id,
      code,
      affected: null,
      displaced: null,
      injured: null,
      fatalities: null,
      damagedHouses: null,
      bridges: 0,
      conditions: [],
      latestMs: mingLatestDate.getTime(),
    };
    prev.affected = addOpt(prev.affected, toIntNonNeg(a.menderita));
    prev.displaced = addOpt(prev.displaced, toIntNonNeg(a.mengungsi));
    prev.injured = addOpt(prev.injured, toIntNonNeg(a.luka_sakit));
    prev.fatalities = addOpt(prev.fatalities, toIntNonNeg(a.meninggal));
    prev.damagedHouses = addOpt(prev.damagedHouses, toIntNonNeg(a.rumah_rusak));
    prev.bridges += a.jembatan_rusak ?? 0;
    const cleanKm = stripHtml(a.kondisi_mutakhir);
    if (cleanKm) prev.conditions.push(cleanKm);
    if (typeof a.dt === "number" && a.dt > prev.latestMs) prev.latestMs = a.dt;
    mingByEventAndCode.set(compKey, prev);
  }

  for (const item of mingByEventAndCode.values()) {
    const reg = regionMap.get(item.code)!;
    const joinedCond = item.conditions.join(" | ");
    const lowerCond = joinedCond.toLowerCase();

    let status: PublicStatus;
    if (
      item.bridges > 0 ||
      /terisolir|terputus|jalan putus|jembatan putus|akses tertutup/.test(lowerCond)
    ) {
      status = PublicStatus.AKSES_TERISOLIR;
    } else if (
      (item.displaced ?? 0) > 0 ||
      /menunggu perbaikan|belum menerima|membutuhkan bantuan/.test(lowerCond)
    ) {
      status = PublicStatus.DILAPORKAN_BELUM_MENERIMA_BANTUAN;
    } else {
      status = PublicStatus.BELUM_TERVERIFIKASI;
    }

    const condSnippet = joinedCond
      ? ` Kondisi mutakhir BNPB: ${joinedCond.slice(0, 220)}`
      : "";
    impactPayloads.push({
      eventId: item.evId,
      regionId: reg.id,
      status,
      affectedCount: item.affected,
      displacedCount: item.displaced,
      injuredCount: item.injured,
      fatalitiesCount: item.fatalities,
      damagedHouses: item.damagedHouses,
      notes: `Laporan mingguan BNPB: terdampak ${item.affected ?? 0} jiwa, mengungsi ${item.displaced ?? 0} jiwa.${condSnippet}`,
      sourceId: srcMingguanId,
    });

    if ((item.affected ?? 0) > 0) {
      statPayloads.push({
        sourceId: srcMingguanId,
        eventId: item.evId,
        regionId: reg.id,
        key: "weekly_affected_population",
        label: "Penduduk Terdampak (BNPB Mingguan)",
        value: String(item.affected),
        unit: "jiwa",
        asOfDate: new Date(item.latestMs),
      });
    }
  }

  // 3e. 3 National Featured Stat rows (regionId: null)
  statPayloads.push(
    {
      sourceId: srcPuId,
      eventId: evPuId,
      regionId: null,
      key: "pu_bnpb_severed_access_points",
      label: "Titik Jalan & Jembatan Putus Akses",
      value: String(puFeatures.length),
      unit: "titik",
      asOfDate: puLatestDate,
      metadata: { scope: "national", provinces: ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau"] },
    },
    {
      sourceId: srcNttId,
      eventId: evNttId,
      regionId: null,
      key: "ntt_2026_total_damaged_houses",
      label: "Rumah Rusak Gempa Flores NTT 2026",
      value: String(nttSumDamagedHouses),
      unit: "unit",
      asOfDate: nttLatestDate,
      metadata: { scope: "national", regenciesReported: nttFeatures.length },
    },
    {
      sourceId: srcNttId,
      eventId: evNttId,
      regionId: null,
      key: "ntt_2026_total_displaced",
      label: "Warga Mengungsi Gempa Flores NTT 2026",
      value: String(nttSumDisplaced),
      unit: "jiwa",
      asOfDate: nttLatestDate,
      metadata: { scope: "national", regenciesReported: nttFeatures.length },
    }
  );

  // 4. Write EventImpacts idempotently in batches
  await runInBatches(impactPayloads, 15, async (imp) => {
    await prisma.eventImpact.upsert({
      where: { eventId_regionId: { eventId: imp.eventId, regionId: imp.regionId } },
      create: imp,
      update: {
        status: imp.status,
        affectedCount: imp.affectedCount,
        displacedCount: imp.displacedCount,
        injuredCount: imp.injuredCount,
        fatalitiesCount: imp.fatalitiesCount,
        damagedHouses: imp.damagedHouses,
        notes: imp.notes,
        sourceId: imp.sourceId,
      },
      select: { id: true },
    });
  });

  // 5. Write Stats idempotently in batches
  const sourceIds = [srcNttId, srcBansorId, srcMingguanId, srcPuId];
  const existingStats = await prisma.stat.findMany({
    where: { sourceId: { in: sourceIds } },
    select: { id: true, sourceId: true, key: true, regionId: true, eventId: true },
  });
  const statLookup = new Map<string, string>();
  for (const s of existingStats) {
    statLookup.set(`${s.sourceId}|${s.key}|${s.regionId ?? ""}|${s.eventId ?? ""}`, s.id);
  }

  let statsCreated = 0;
  let statsUpdated = 0;
  await runInBatches(statPayloads, 15, async (st) => {
    const k = `${st.sourceId}|${st.key}|${st.regionId ?? ""}|${st.eventId ?? ""}`;
    const existingId = statLookup.get(k);
    if (existingId) {
      await prisma.stat.update({
        where: { id: existingId },
        data: {
          label: st.label,
          value: st.value,
          unit: st.unit,
          asOfDate: st.asOfDate,
          metadata: st.metadata as never,
        },
        select: { id: true },
      });
      statsUpdated++;
    } else {
      await prisma.stat.create({
        data: {
          sourceId: st.sourceId,
          eventId: st.eventId,
          regionId: st.regionId,
          key: st.key,
          label: st.label,
          value: st.value,
          unit: st.unit,
          asOfDate: st.asOfDate,
          metadata: st.metadata as never,
        },
        select: { id: true },
      });
      statsCreated++;
    }
  });

  // 6. Compute & log exact Legend breakdown across all 514 regencies
  const priority: Record<PublicStatus, number> = {
    AKSES_TERISOLIR: 3,
    DILAPORKAN_BELUM_MENERIMA_BANTUAN: 2,
    BELUM_TERVERIFIKASI: 1,
  };
  const allImpacts = await prisma.eventImpact.findMany({
    where: { region: { level: "REGENCY_CITY" }, status: { not: null } },
    select: { status: true, region: { select: { code: true } } },
  });
  const bestByCode = new Map<string, PublicStatus>();
  for (const row of allImpacts) {
    const st = row.status;
    if (!st) continue;
    const prev = bestByCode.get(row.region.code);
    if (!prev || priority[st] > priority[prev]) {
      bestByCode.set(row.region.code, st);
    }
  }
  const counts = {
    AKSES_TERISOLIR: 0,
    DILAPORKAN_BELUM_MENERIMA_BANTUAN: 0,
    BELUM_TERVERIFIKASI: 0,
    TIDAK_ADA_LAPORAN: 0,
  };
  for (const r of regions) {
    const s = bestByCode.get(r.code);
    if (!s) counts.TIDAK_ADA_LAPORAN++;
    else counts[s]++;
  }

  console.log("=== Official BNPB & PU Snapshot Import Complete ===");
  console.log("Sources upserted   : 4");
  console.log(`Events upserted    : ${3 + weeklyEventsMap.size}`);
  console.log(`EventImpacts upserted: ${impactPayloads.length}`);
  console.log(`Stats              : ${statsCreated} created, ${statsUpdated} updated`);
  console.log(`Unmatched codes    : ${unmatchedCodes.size}`, Array.from(unmatchedCodes));
  console.log("Legend breakdown (514 regencies):", counts);
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
