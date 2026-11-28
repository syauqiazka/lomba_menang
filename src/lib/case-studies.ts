import fs from "fs/promises";
import path from "path";
import { prisma, runDbQuery } from "@/lib/prisma";
import { withSwrCache } from "@/lib/server-cache";
import type { PublicStatus, SourceCategory } from "@/types/map";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots", "bnpb-2026-11-28");
const SNAPSHOT_ACCESS_DATE = new Date("2026-11-28T00:00:00.000Z");
const CASE_SWR_OPTIONS = {
  freshMs: 5 * 60_000,
  staleMs: 30 * 60_000,
};

export type CaseSlug = "aceh-2026" | "ntt-2026";

export interface CaseSourceItem {
  id: string;
  title: string;
  publisher?: string;
  category: SourceCategory;
  url?: string;
  publicationDate?: string;
  accessDate: string;
  description?: string;
}

export interface CaseStatItem {
  key: string;
  label: string;
  value: string;
  unit?: string;
  asOfDate: string;
  source: CaseSourceItem;
}

export interface CaseRegionRow {
  code: string;
  name: string;
  statusLabel: "Dilaporkan belum menerima bantuan" | "Akses terisolir" | "Belum terverifikasi";
  damagedHouses: number;
  displacedCount: number;
  affectedCount: number;
  fatalitiesCount: number;
  severedAccessPoints?: number;
  notes: string;
}

export interface CaseTimelineItem {
  date: string;
  title: string;
  description: string;
  type: "event" | "response" | "issue" | "recovery";
}

export interface CaseStudySummary {
  slug: CaseSlug;
  title: string;
  shortTitle: string;
  description: string;
  eventType: "geological" | "environmental";
  dateLabel: string;
  isoDate: string;
  region: string;
  provinceCode: string;
  status: "active" | "historical";
  statusLabel: string;
  href: string;
  quickStats: Array<{ label: string; value: string }>;
  statusBadges: Array<"Dilaporkan belum menerima bantuan" | "Akses terisolir" | "Belum terverifikasi">;
}

export interface CaseStudyDetail extends CaseStudySummary {
  dataNotice: string;
  stats: CaseStatItem[];
  affectedRegions: CaseRegionRow[];
  sources: CaseSourceItem[];
  timeline: CaseTimelineItem[];
  methodology: {
    dataCollection: string[];
    validation: string[];
    limitations: string[];
  };
}

interface CaseStaticConfig {
  slug: CaseSlug;
  title: string;
  shortTitle: string;
  description: string;
  eventType: "geological" | "environmental";
  dateLabel: string;
  isoDate: string;
  region: string;
  provinceCode: string;
  status: "active" | "historical";
  statusLabel: string;
  dataNotice: string;
  timeline: CaseTimelineItem[];
  methodology: {
    dataCollection: string[];
    validation: string[];
    limitations: string[];
  };
}

const STATUS_PRIORITY: Record<PublicStatus, number> = {
  AKSES_TERISOLIR: 3,
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: 2,
  BELUM_TERVERIFIKASI: 1,
};

function statusToLabel(
  status?: string | null
): "Dilaporkan belum menerima bantuan" | "Akses terisolir" | "Belum terverifikasi" {
  if (status === "AKSES_TERISOLIR") return "Akses terisolir";
  if (status === "DILAPORKAN_BELUM_MENERIMA_BANTUAN") return "Dilaporkan belum menerima bantuan";
  return "Belum terverifikasi";
}

function pickHigherStatus(a?: PublicStatus | null, b?: PublicStatus | null): PublicStatus {
  const va = a && a in STATUS_PRIORITY ? a : "BELUM_TERVERIFIKASI";
  const vb = b && b in STATUS_PRIORITY ? b : "BELUM_TERVERIFIKASI";
  return STATUS_PRIORITY[va] >= STATUS_PRIORITY[vb] ? va : vb;
}

function toSourceCategory(raw?: string | null): SourceCategory {
  if (raw === "OFFICIAL" || raw === "MEDIA" || raw === "RESEARCH" || raw === "EDITORIAL") {
    return raw;
  }
  return "OFFICIAL";
}

function normalizeCode4(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\./g, "").trim();
  return /^\d{4}$/.test(digits) ? digits : null;
}

function codeFromDesaSdi(raw?: string | null): string | null {
  if (!raw) return null;
  const parts = raw.trim().split(".");
  if (parts.length < 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
  return parts[0].padStart(2, "0") + parts[1].padStart(2, "0");
}

const CASE_CONFIGS: Record<CaseSlug, CaseStaticConfig> = {
  "aceh-2026": {
    slug: "aceh-2026",
    title: "Banjir & Longsor Aceh (Snapshot BNPB & PU)",
    shortTitle: "Banjir & Longsor Aceh",
    description:
      "Rangkaian banjir bandang, tanah longsor, dan gangguan akses jalan/jembatan di Provinsi Aceh. Data dampak dan status akses disintesis dari dashboard Banjir & Longsor Sumatera BNPB serta SITABA Kementerian PU.",
    eventType: "environmental",
    dateLabel: "Nov 2025 – Nov 2026",
    isoDate: "2026-11",
    region: "Aceh",
    provinceCode: "11",
    status: "active",
    statusLabel: "Aktif",
    dataNotice:
      "Angka dampak, jumlah pengungsi, dan titik jalan/jembatan terputus di bawah ini ditarik langsung dari rekaman resmi BNPB Geoportal (MV_Bansor_Sumatera_v4) dan SITABA Kementerian PU yang tersimpan pada basis data platform (snapshot 28 Nov 2026).",
    timeline: [
      {
        date: "Akhir Nov 2025",
        title: "Puncak Banjir Bandang & Longsor",
        description:
          "Curah hujan ekstrem memicu banjir bandang dan longsor luas di pesisir timur, tengah, hingga utara Aceh serta memutus ratusan titik jalan dan jembatan nasional maupun daerah.",
        type: "event",
      },
      {
        date: "Des 2025",
        title: "Pendataan Akses Terisolir (SITABA PU & PERB BNPB)",
        description:
          "Kementerian PU dan Pusdalops BNPB memetakan titik jalan tertimbun, jembatan putus, dan akses terisolir di kabupaten terdampak untuk memprioritaskan pembukaan jalur logistik.",
        type: "response",
      },
      {
        date: "2026",
        title: "Pemantauan Huntara, Huntap & DTH",
        description:
          "Dashboard Banjir & Longsor Sumatera BNPB mencatat progres usulan vs realisasi Hunian Sementara (Huntara), Hunian Tetap (Huntap), dan Dana Tunggu Hunian (DTH) di Aceh.",
        type: "issue",
      },
      {
        date: "Nov 2026",
        title: "Sinkronisasi Verifikasi Lintas Kabupaten",
        description:
          "Rekonsiliasi data korban, rumah rusak, dan kebutuhan logistik pengungsi terus diperbarui terhadap laporan BNPB Geoportal dan BPBD Aceh.",
        type: "recovery",
      },
    ],
    methodology: {
      dataCollection: [
        "Data resmi BNPB Geoportal (MV_Bansor_Sumatera_v4): jumlah penduduk terdampak, mengungsi, meninggal, rumah rusak, serta realisasi huntap/huntara/DTH per kab/kota.",
        "Data infrastruktur SITABA Kementerian PU & Direktorat PERB BNPB: koordinat dan jumlah titik jalan/jembatan putus akses per kabupaten/kota.",
        "Pemetaan kode wilayah standar 4-digit Kemendagri/BPS (provinsi 11 — Aceh).",
      ],
      validation: [
        "Status \"Akses terisolir\" diberikan pada kabupaten/kota yang memiliki titik jalan/jembatan putus tercatat di SITABA Kementerian PU / PERB BNPB.",
        "Status \"Dilaporkan belum menerima bantuan\" diberikan bila terdapat selisih usulan vs realisasi huntap/huntara/DTH atau pengungsi aktif pada rekap BNPB.",
        "Nilai agregat dihitung langsung dari rekaman tingkat kab/kota tanpa interpolasi manual.",
      ],
      limitations: [
        "Laporan kondisi lapangan dari kecamatan atau gampong terpencil tetap berisiko mengalami keterlambatan pembaruan dari daerah ke pusat.",
        "Beberapa titik kerusakan infrastruktur SITABA PU tidak menyertakan angka jiwa terdampak karena dicatat dalam layer infrastruktur terpisah.",
      ],
    },
  },
  "ntt-2026": {
    slug: "ntt-2026",
    title: "Gempa Flores NTT, Agustus 2026",
    shortTitle: "Gempa Flores NTT",
    description:
      "Gempabumi tektonik sesar naik busur belakang Flores (M 7,7) pada Agustus 2026 berdampak lintas provinsi di NTT, NTB, dan Sulawesi Selatan. Halaman ini merangkum dampak resmi per kabupaten/kota dari BNPB Geoportal.",
    eventType: "geological",
    dateLabel: "Agustus 2026",
    isoDate: "2026-08",
    region: "NTT, NTB & Sulawesi Selatan",
    provinceCode: "53",
    status: "historical",
    statusLabel: "Historis",
    dataNotice:
      "Seluruh statistik kerusakan rumah, pengungsi, korban jiwa, dan ruas jalan terdampak di halaman ini bersumber langsung dari layanan spasial resmi BNPB Geoportal (mv_gempa_ntt_2026_v2) pada basis data platform.",
    timeline: [
      {
        date: "15 Agustus 2026",
        title: "Gempabumi Tektonik Flores",
        description:
          "Gempabumi kuat di busur belakang Flores (M 7,7) mengguncang wilayah NTT, NTB bagian timur, hingga kepulauan di Sulawesi Selatan dan merusak puluhan ribu unit rumah.",
        type: "event",
      },
      {
        date: "H+1 hingga H+7",
        title: "Tanggap Darurat & Pendataan Awal",
        description:
          "Tim gabungan BNPB, BPBD, Basarnas, TNI/POLRI melakukan evakuasi warga, membuka pengungsian terpusat serta mandiri, dan mendata ruas jalan yang terdampak.",
        type: "response",
      },
      {
        date: "Pasca-Darurat",
        title: "Verifikasi Rumah Rusak & Pengungsi Mandiri",
        description:
          "BNPB memisahkan pencatatan rumah rusak dilaporkan dengan total rumah terverifikasi, serta memetakan pengungsi terpusat vs pengungsi mandiri di 10 kabupaten terdampak.",
        type: "issue",
      },
      {
        date: "Nov 2026",
        title: "Konsolidasi Data Rehabilitasi",
        description:
          "Data dampak terverifikasi dikonsolidasikan di BNPB Geoportal sebagai rujukan transparansi pemulihan dan evaluasi distribusi bantuan.",
        type: "recovery",
      },
    ],
    methodology: {
      dataCollection: [
        "Data spasial resmi BNPB Geoportal (mv_gempa_ntt_2026_v2): korban meninggal, luka/sakit, pengungsi (mandiri & terpusat), rumah rusak, rumah terverifikasi, dan ruas jalan terdampak.",
        "Standarisasi kode wilayah kab/kota sesuai kode BPS/Kemendagri lintas provinsi terdampak (NTT 53, NTB 52, Sulsel 73).",
      ],
      validation: [
        "Status \"Akses terisolir\" diberikan apabila layer BNPB mencatat adanya ruas jalan terdampak (jumlah_jalan > 0).",
        "Status \"Dilaporkan belum menerima bantuan\" diberikan apabila terdapat pengungsi aktif dan proses verifikasi hunian berjalan.",
        "Status \"Belum terverifikasi\" menandai wilayah dengan laporan awal kerusakan namun verifikasi lanjutan masih berlangsung.",
      ],
      limitations: [
        "Wilayah kepulauan kecil dan dusun pegunungan memiliki tantangan verifikasi fisik rumah rusak secara serentak.",
        "Sebagian pengungsi memilih tinggal secara mandiri di sekitar rumah kerabat sehingga pendataan logistik memerlukan pemutakhiran berkala.",
      ],
    },
  },
};

export function getAvailableCaseSlugs(): CaseSlug[] {
  return ["aceh-2026", "ntt-2026"];
}

export function isValidCaseSlug(slug: string): slug is CaseSlug {
  return slug === "aceh-2026" || slug === "ntt-2026";
}

export function getCaseStudyMeta(slug: string): { title: string; description: string } | null {
  if (!isValidCaseSlug(slug)) return null;
  const cfg = CASE_CONFIGS[slug];
  return { title: cfg.title, description: cfg.description };
}

function formatCompactCount(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2).replace(".", ",")} jt`;
  return val.toLocaleString("id-ID");
}

async function readSnapshotFeatures<T>(filename: string): Promise<Array<{ attributes: T }>> {
  const raw = await fs.readFile(path.join(SNAPSHOT_DIR, filename), "utf-8");
  const parsed = JSON.parse(raw) as { features?: Array<{ attributes: T }> };
  return parsed.features ?? [];
}

async function buildNttFromDb(): Promise<{
  stats: CaseStatItem[];
  affectedRegions: CaseRegionRow[];
  sources: CaseSourceItem[];
  totals: { regencies: number; damagedHouses: number; displaced: number; fatalities: number };
} | null> {
  const event = await prisma.disasterEvent.findFirst({
    where: { name: "Gempabumi Flores NTT Agustus 2026" },
    include: {
      impacts: {
        include: {
          region: { select: { code: true, name: true } },
          source: true,
        },
      },
      stats: {
        where: { regionId: null },
        include: { source: true },
      },
    },
  });

  if (!event || event.impacts.length === 0) return null;

  let damagedHouses = 0;
  let displaced = 0;
  let fatalities = 0;
  let injured = 0;

  const sourceMap = new Map<string, CaseSourceItem>();
  const rows: CaseRegionRow[] = [];

  for (const imp of event.impacts) {
    damagedHouses += imp.damagedHouses ?? 0;
    displaced += imp.displacedCount ?? 0;
    fatalities += imp.fatalitiesCount ?? 0;
    injured += imp.injuredCount ?? 0;

    if (imp.source && !sourceMap.has(imp.source.id)) {
      sourceMap.set(imp.source.id, {
        id: imp.source.id,
        title: imp.source.title,
        publisher: imp.source.publisher ?? undefined,
        category: toSourceCategory(imp.source.category),
        url: imp.source.url ?? undefined,
        publicationDate: imp.source.publicationDate?.toISOString(),
        accessDate: imp.source.accessDate.toISOString(),
        description: imp.source.description ?? undefined,
      });
    }

    rows.push({
      code: imp.region.code,
      name: imp.region.name,
      statusLabel: statusToLabel(imp.status),
      damagedHouses: imp.damagedHouses ?? 0,
      displacedCount: imp.displacedCount ?? 0,
      affectedCount: imp.affectedCount ?? 0,
      fatalitiesCount: imp.fatalitiesCount ?? 0,
      notes: imp.notes ?? "Tercatat pada data resmi BNPB Geoportal.",
    });
  }

  rows.sort((a, b) => b.damagedHouses - a.damagedHouses || b.displacedCount - a.displacedCount);

  const primarySource: CaseSourceItem = Array.from(sourceMap.values())[0] ?? {
    id: "bnpb-ntt-2026",
    title: "BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026",
    publisher: "BNPB",
    category: "OFFICIAL",
    url: "https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40",
    accessDate: SNAPSHOT_ACCESS_DATE.toISOString(),
  };

  const asOfIso = primarySource.publicationDate ?? SNAPSHOT_ACCESS_DATE.toISOString();

  const stats: CaseStatItem[] = [
    {
      key: "ntt_damaged_houses",
      label: "Rumah Rusak Dilaporkan",
      value: String(damagedHouses),
      unit: "unit",
      asOfDate: asOfIso,
      source: primarySource,
    },
    {
      key: "ntt_displaced",
      label: "Warga Mengungsi",
      value: String(displaced),
      unit: "jiwa",
      asOfDate: asOfIso,
      source: primarySource,
    },
    {
      key: "ntt_fatalities",
      label: "Korban Meninggal Dunia",
      value: String(fatalities),
      unit: "jiwa",
      asOfDate: asOfIso,
      source: primarySource,
    },
    {
      key: "ntt_injured",
      label: "Korban Luka / Sakit",
      value: String(injured),
      unit: "jiwa",
      asOfDate: asOfIso,
      source: primarySource,
    },
  ];

  return {
    stats,
    affectedRegions: rows,
    sources: Array.from(sourceMap.values()),
    totals: {
      regencies: rows.length,
      damagedHouses,
      displaced,
      fatalities,
    },
  };
}

async function buildNttFromSnapshot() {
  interface NttAttr {
    id_kab?: string | null;
    kabupaten?: string | null;
    provinsi?: string | null;
    tanggal_update?: number | null;
    meninggal?: number | null;
    luka_sakit_?: number | null;
    mengungsi_?: number | null;
    rumah_rusak?: number | null;
    total_rumah_verif?: number | null;
    jumlah_jalan?: number | null;
  }

  const features = await readSnapshotFeatures<NttAttr>("mv_gempa_ntt_2026_v2.json");
  let damagedHouses = 0;
  let displaced = 0;
  let fatalities = 0;
  let injured = 0;
  let latestMs = SNAPSHOT_ACCESS_DATE.getTime();
  const rows: CaseRegionRow[] = [];

  for (const f of features) {
    const a = f.attributes;
    const code = normalizeCode4(a.id_kab);
    if (!code) continue;
    const rr = Math.max(0, Math.round(a.rumah_rusak ?? 0));
    const meng = Math.max(0, Math.round(a.mengungsi_ ?? 0));
    const men = Math.max(0, Math.round(a.meninggal ?? 0));
    const luka = Math.max(0, Math.round(a.luka_sakit_ ?? 0));
    const jalan = Math.max(0, Math.round(a.jumlah_jalan ?? 0));
    const verif = Math.max(0, Math.round(a.total_rumah_verif ?? 0));
    if (typeof a.tanggal_update === "number" && a.tanggal_update > latestMs) latestMs = a.tanggal_update;

    damagedHouses += rr;
    displaced += meng;
    fatalities += men;
    injured += luka;

    const status: PublicStatus =
      jalan > 0
        ? "AKSES_TERISOLIR"
        : meng > 0 && verif > 0
          ? "DILAPORKAN_BELUM_MENERIMA_BANTUAN"
          : "BELUM_TERVERIFIKASI";

    rows.push({
      code,
      name: a.kabupaten ? `${a.kabupaten}${a.provinsi ? `, ${a.provinsi}` : ""}` : code,
      statusLabel: statusToLabel(status),
      damagedHouses: rr,
      displacedCount: meng,
      affectedCount: 0,
      fatalitiesCount: men,
      notes: `${rr.toLocaleString("id-ID")} rumah rusak (${verif.toLocaleString("id-ID")} terverifikasi), ${meng.toLocaleString("id-ID")} pengungsi, ${jalan} ruas jalan terdampak.`,
    });
  }

  rows.sort((a, b) => b.damagedHouses - a.damagedHouses || b.displacedCount - a.displacedCount);

  const source: CaseSourceItem = {
    id: "bnpb-ntt-snapshot",
    title: "BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026 (mv_gempa_ntt_2026_v2)",
    publisher: "BNPB",
    category: "OFFICIAL",
    url: "https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40",
    publicationDate: new Date(latestMs).toISOString(),
    accessDate: SNAPSHOT_ACCESS_DATE.toISOString(),
  };

  return {
    stats: [
      { key: "ntt_damaged_houses", label: "Rumah Rusak Dilaporkan", value: String(damagedHouses), unit: "unit", asOfDate: source.publicationDate!, source },
      { key: "ntt_displaced", label: "Warga Mengungsi", value: String(displaced), unit: "jiwa", asOfDate: source.publicationDate!, source },
      { key: "ntt_fatalities", label: "Korban Meninggal Dunia", value: String(fatalities), unit: "jiwa", asOfDate: source.publicationDate!, source },
      { key: "ntt_injured", label: "Korban Luka / Sakit", value: String(injured), unit: "jiwa", asOfDate: source.publicationDate!, source },
    ],
    affectedRegions: rows,
    sources: [source],
    totals: { regencies: rows.length, damagedHouses, displaced, fatalities },
  };
}

async function buildAcehFromDb(): Promise<{
  stats: CaseStatItem[];
  affectedRegions: CaseRegionRow[];
  sources: CaseSourceItem[];
  totals: { regencies: number; affected: number; damagedHouses: number; puPoints: number };
} | null> {
  const [impacts, puStats] = await Promise.all([
    prisma.eventImpact.findMany({
      where: {
        region: { parentCode: "11" },
        event: {
          name: {
            in: [
              "Banjir dan Longsor Sumatera (BNPB)",
              "Putus Akses Jalan dan Jembatan Sumatera (PU & BNPB)",
            ],
          },
        },
      },
      include: {
        region: { select: { code: true, name: true } },
        event: { select: { name: true } },
        source: true,
      },
    }),
    prisma.stat.findMany({
      where: {
        key: "pu_severed_access_points",
        region: { parentCode: "11" },
      },
      include: {
        region: { select: { code: true } },
        source: true,
      },
    }),
  ]);

  if (impacts.length === 0) return null;

  const puByRegCode = new Map<string, number>();
  let totalPuPoints = 0;
  for (const st of puStats) {
    const cnt = Number.parseInt(st.value, 10) || 0;
    if (st.region?.code) {
      puByRegCode.set(st.region.code, cnt);
    }
    totalPuPoints += cnt;
  }

  const byCode = new Map<
    string,
    {
      code: string;
      name: string;
      status: PublicStatus;
      damagedHouses: number;
      displacedCount: number;
      affectedCount: number;
      fatalitiesCount: number;
      notesList: string[];
    }
  >();

  const sourceMap = new Map<string, CaseSourceItem>();

  for (const imp of impacts) {
    if (imp.source && !sourceMap.has(imp.source.id)) {
      sourceMap.set(imp.source.id, {
        id: imp.source.id,
        title: imp.source.title,
        publisher: imp.source.publisher ?? undefined,
        category: toSourceCategory(imp.source.category),
        url: imp.source.url ?? undefined,
        publicationDate: imp.source.publicationDate?.toISOString(),
        accessDate: imp.source.accessDate.toISOString(),
        description: imp.source.description ?? undefined,
      });
    }

    const existing = byCode.get(imp.region.code) ?? {
      code: imp.region.code,
      name: imp.region.name,
      status: "BELUM_TERVERIFIKASI" as PublicStatus,
      damagedHouses: 0,
      displacedCount: 0,
      affectedCount: 0,
      fatalitiesCount: 0,
      notesList: [],
    };

    existing.status = pickHigherStatus(existing.status, imp.status);
    existing.damagedHouses += imp.damagedHouses ?? 0;
    existing.displacedCount += imp.displacedCount ?? 0;
    existing.affectedCount += imp.affectedCount ?? 0;
    existing.fatalitiesCount += imp.fatalitiesCount ?? 0;
    if (imp.notes) existing.notesList.push(imp.notes);
    byCode.set(imp.region.code, existing);
  }

  let totalAffected = 0;
  let totalDamaged = 0;
  let totalFatalities = 0;

  const rows: CaseRegionRow[] = Array.from(byCode.values()).map((r) => {
    totalAffected += r.affectedCount;
    totalDamaged += r.damagedHouses;
    totalFatalities += r.fatalitiesCount;
    return {
      code: r.code,
      name: r.name,
      statusLabel: statusToLabel(r.status),
      damagedHouses: r.damagedHouses,
      displacedCount: r.displacedCount,
      affectedCount: r.affectedCount,
      fatalitiesCount: r.fatalitiesCount,
      severedAccessPoints: puByRegCode.get(r.code) ?? 0,
      notes: r.notesList.join(" · "),
    };
  });

  rows.sort(
    (a, b) =>
      (b.severedAccessPoints ?? 0) - (a.severedAccessPoints ?? 0) ||
      b.damagedHouses - a.damagedHouses ||
      b.affectedCount - a.affectedCount
  );

  const sources = Array.from(sourceMap.values());
  const bansorSource =
    sources.find((s) => s.title.includes("Banjir dan Longsor")) ??
    sources[0] ?? {
      id: "bnpb-bansor-aceh",
      title: "BNPB Geoportal — Data Banjir dan Longsor Sumatera",
      publisher: "BNPB",
      category: "OFFICIAL" as const,
      url: "https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0",
      accessDate: SNAPSHOT_ACCESS_DATE.toISOString(),
    };
  const puSource =
    sources.find((s) => s.title.includes("SITABA")) ?? bansorSource;

  const stats: CaseStatItem[] = [
    {
      key: "aceh_affected",
      label: "Penduduk Terdampak",
      value: String(totalAffected),
      unit: "jiwa",
      asOfDate: bansorSource.publicationDate ?? SNAPSHOT_ACCESS_DATE.toISOString(),
      source: bansorSource,
    },
    {
      key: "aceh_damaged_houses",
      label: "Rumah Rusak",
      value: String(totalDamaged),
      unit: "unit",
      asOfDate: bansorSource.publicationDate ?? SNAPSHOT_ACCESS_DATE.toISOString(),
      source: bansorSource,
    },
    {
      key: "aceh_fatalities",
      label: "Korban Meninggal Dunia",
      value: String(totalFatalities),
      unit: "jiwa",
      asOfDate: bansorSource.publicationDate ?? SNAPSHOT_ACCESS_DATE.toISOString(),
      source: bansorSource,
    },
    {
      key: "aceh_severed_access",
      label: "Titik Jalan/Jembatan Putus",
      value: String(totalPuPoints),
      unit: "titik",
      asOfDate: puSource.publicationDate ?? SNAPSHOT_ACCESS_DATE.toISOString(),
      source: puSource,
    },
  ];

  return {
    stats,
    affectedRegions: rows,
    sources,
    totals: {
      regencies: rows.length,
      affected: totalAffected,
      damagedHouses: totalDamaged,
      puPoints: totalPuPoints,
    },
  };
}

async function buildAcehFromSnapshot() {
  interface BansorAttr {
    id_kab_sdi?: string | null;
    kabupaten?: string | null;
    menderita?: number | null;
    mengungsi?: number | null;
    meninggal?: number | null;
    tot_rumah_rusak?: number | null;
    rumah_rusak?: number | null;
  }
  interface PuAttr {
    id_desa_sdi?: string | null;
    kabupaten?: string | null;
  }

  const [bansorFeatures, puFeatures] = await Promise.all([
    readSnapshotFeatures<BansorAttr>("mv_bansor_sumatera_v4.json"),
    readSnapshotFeatures<PuAttr>("data_jalan_jembatan_putus_akses_pu.json"),
  ]);

  const byCode = new Map<string, CaseRegionRow>();
  let totalAffected = 0;
  let totalDamaged = 0;
  let totalFatalities = 0;
  let totalPuPoints = 0;

  for (const f of bansorFeatures) {
    const a = f.attributes;
    const code = normalizeCode4(a.id_kab_sdi);
    if (!code || !code.startsWith("11")) continue;
    const aff = Math.max(0, Math.round(a.menderita ?? 0));
    const disp = Math.max(0, Math.round(a.mengungsi ?? 0));
    const fat = Math.max(0, Math.round(a.meninggal ?? 0));
    const dmg = Math.max(0, Math.round(a.tot_rumah_rusak ?? a.rumah_rusak ?? 0));
    totalAffected += aff;
    totalDamaged += dmg;
    totalFatalities += fat;

    const prev = byCode.get(code);
    if (prev) {
      prev.affectedCount += aff;
      prev.displacedCount += disp;
      prev.fatalitiesCount += fat;
      prev.damagedHouses += dmg;
    } else {
      byCode.set(code, {
        code,
        name: a.kabupaten?.trim() || code,
        statusLabel: disp > 0 ? "Dilaporkan belum menerima bantuan" : "Belum terverifikasi",
        damagedHouses: dmg,
        displacedCount: disp,
        affectedCount: aff,
        fatalitiesCount: fat,
        severedAccessPoints: 0,
        notes: `Rekap BNPB: ${aff.toLocaleString("id-ID")} jiwa terdampak, ${dmg.toLocaleString("id-ID")} rumah rusak.`,
      });
    }
  }

  for (const f of puFeatures) {
    const a = f.attributes;
    const code = codeFromDesaSdi(a.id_desa_sdi);
    if (!code || !code.startsWith("11")) continue;
    totalPuPoints += 1;
    const prev = byCode.get(code);
    if (prev) {
      prev.statusLabel = "Akses terisolir";
      prev.severedAccessPoints = (prev.severedAccessPoints ?? 0) + 1;
    } else {
      byCode.set(code, {
        code,
        name: a.kabupaten?.trim() || code,
        statusLabel: "Akses terisolir",
        damagedHouses: 0,
        displacedCount: 0,
        affectedCount: 0,
        fatalitiesCount: 0,
        severedAccessPoints: 1,
        notes: "Titik gangguan akses jalan/jembatan tercatat di SITABA Kementerian PU.",
      });
    }
  }

  const rows = Array.from(byCode.values()).sort(
    (a, b) => (b.severedAccessPoints ?? 0) - (a.severedAccessPoints ?? 0) || b.damagedHouses - a.damagedHouses
  );

  const srcBansor: CaseSourceItem = {
    id: "bnpb-bansor-snapshot",
    title: "BNPB Geoportal — Data Banjir dan Longsor Sumatera (MV_Bansor_Sumatera_v4)",
    publisher: "BNPB",
    category: "OFFICIAL",
    url: "https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0",
    accessDate: SNAPSHOT_ACCESS_DATE.toISOString(),
  };
  const srcPu: CaseSourceItem = {
    id: "sitaba-pu-snapshot",
    title: "SITABA Kementerian PU & BNPB — Data Jalan dan Jembatan Putus Akses",
    publisher: "Kementerian PU & BNPB",
    category: "OFFICIAL",
    url: "https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13",
    accessDate: SNAPSHOT_ACCESS_DATE.toISOString(),
  };

  return {
    stats: [
      { key: "aceh_affected", label: "Penduduk Terdampak", value: String(totalAffected), unit: "jiwa", asOfDate: srcBansor.accessDate, source: srcBansor },
      { key: "aceh_damaged_houses", label: "Rumah Rusak", value: String(totalDamaged), unit: "unit", asOfDate: srcBansor.accessDate, source: srcBansor },
      { key: "aceh_fatalities", label: "Korban Meninggal Dunia", value: String(totalFatalities), unit: "jiwa", asOfDate: srcBansor.accessDate, source: srcBansor },
      { key: "aceh_severed_access", label: "Titik Jalan/Jembatan Putus", value: String(totalPuPoints), unit: "titik", asOfDate: srcPu.accessDate, source: srcPu },
    ],
    affectedRegions: rows,
    sources: [srcBansor, srcPu],
    totals: { regencies: rows.length, affected: totalAffected, damagedHouses: totalDamaged, puPoints: totalPuPoints },
  };
}

export async function getCaseStudyDetail(slug: string): Promise<CaseStudyDetail | null> {
  if (!isValidCaseSlug(slug)) return null;
  return withSwrCache(`caseStudy:${slug}`, CASE_SWR_OPTIONS, () => loadCaseStudyDetail(slug));
}

async function loadCaseStudyDetail(slug: CaseSlug): Promise<CaseStudyDetail | null> {
  const cfg = CASE_CONFIGS[slug];

  if (slug === "ntt-2026") {
    const dbData = await runDbQuery(
      () => buildNttFromDb(),
      async () => null,
      { label: "case-studies:ntt" }
    );
    const data = dbData ?? (await buildNttFromSnapshot());
    const distinctStatuses = Array.from(new Set(data.affectedRegions.map((r) => r.statusLabel)));

    return {
      ...cfg,
      href: `/kasus/${cfg.slug}`,
      quickStats: [
        { label: "Kab/Kota Terdampak", value: formatCompactCount(data.totals.regencies) },
        { label: "Rumah Rusak", value: formatCompactCount(data.totals.damagedHouses) },
        { label: "Warga Mengungsi", value: formatCompactCount(data.totals.displaced) },
      ],
      statusBadges: distinctStatuses,
      stats: data.stats,
      affectedRegions: data.affectedRegions,
      sources: data.sources,
    };
  }

  const dbData = await runDbQuery(
    () => buildAcehFromDb(),
    async () => null,
    { label: "case-studies:aceh" }
  );
  const data = dbData ?? (await buildAcehFromSnapshot());
  const distinctStatuses = Array.from(new Set(data.affectedRegions.map((r) => r.statusLabel)));

  return {
    ...cfg,
    href: `/kasus/${cfg.slug}`,
    quickStats: [
      { label: "Kab/Kota Terdampak", value: formatCompactCount(data.totals.regencies) },
      { label: "Jiwa Terdampak", value: formatCompactCount(data.totals.affected) },
      { label: "Titik Akses Putus", value: formatCompactCount(data.totals.puPoints) },
    ],
    statusBadges: distinctStatuses,
    stats: data.stats,
    affectedRegions: data.affectedRegions,
    sources: data.sources,
  };
}

export async function getAllCaseStudySummaries(): Promise<CaseStudySummary[]> {
  const details = await Promise.all(getAvailableCaseSlugs().map((slug) => getCaseStudyDetail(slug)));
  return details
    .filter((d): d is CaseStudyDetail => Boolean(d))
    .map((d) => ({
      slug: d.slug,
      title: d.title,
      shortTitle: d.shortTitle,
      description: d.description,
      eventType: d.eventType,
      dateLabel: d.dateLabel,
      isoDate: d.isoDate,
      region: d.region,
      provinceCode: d.provinceCode,
      status: d.status,
      statusLabel: d.statusLabel,
      href: d.href,
      quickStats: d.quickStats,
      statusBadges: d.statusBadges,
    }));
}
