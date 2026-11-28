import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { getAllCaseStudySummaries } from "@/lib/case-studies";
import { getMapSummaryCounts } from "@/lib/map-data";
import { getNationalStatsBundle } from "@/lib/site-data";
import { getBmkgRealtimeEarthquakes } from "@/lib/bmkg-realtime";
import {
  formatIndonesianDecimal,
  formatRelativeTimeId,
  formatTimeWIBWithSeconds,
} from "@/lib/map-utils";

export const metadata: Metadata = {
  title: "Transparansi Bantuan Bencana Indonesia",
  description:
    "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia. Pantau lokasi bencana, tren harian, status akses bantuan, dan sumber informasi resmi.",
  openGraph: {
    title: "Transparansi Bantuan Bencana Indonesia",
    description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia.",
    type: "website",
    locale: "id_ID",
    siteName: "Transparansi Bantuan Bencana",
  },
};

async function LiveSituationBrief() {
  await connection();
  const [bmkgResult, summaryCounts] = await Promise.all([
    Promise.race([
      getBmkgRealtimeEarthquakes().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]),
    getMapSummaryCounts(),
  ]);

  const latestEq = bmkgResult?.response.latestEarthquake ?? null;
  const isInatewsLive = bmkgResult?.response.liveStatus.inatews === "live";
  const refTimeMs = bmkgResult?.response.updatedAt
    ? new Date(bmkgResult.response.updatedAt).getTime()
    : undefined;

  return (
    <aside
      aria-label="Ringkasan situasi terkini"
      className="rounded-xl border border-border bg-background overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-secondary-background border-b border-border flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium tracking-wider uppercase text-primary">
          Situasi Terkini
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-background text-[11px] font-medium text-primary">
          <span
            className={`w-2 h-2 rounded-full ${
              isInatewsLive ? "bg-[#16a34a] animate-pulse" : "bg-[#d97706]"
            }`}
            aria-hidden="true"
          />
          {isInatewsLive ? "BMKG InaTEWS Live" : "Snapshot Resmi"}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Latest Earthquake Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-secondary-text">
              Gempabumi Terbaru (BMKG InaTEWS)
            </span>
            {latestEq && (
              <span className="text-[11px] font-mono text-secondary-text">
                {formatRelativeTimeId(latestEq.occurredAt, refTimeMs)}
              </span>
            )}
          </div>

          {latestEq ? (
            <div className="p-3.5 rounded-lg border border-border bg-secondary-background/50 space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display font-bold text-2xl text-[#dc2626]">
                  M {formatIndonesianDecimal(latestEq.metrics?.magnitude ?? "?")}
                </span>
                <span className="font-mono text-xs text-secondary-text">
                  {formatTimeWIBWithSeconds(latestEq.occurredAt)}
                </span>
              </div>
              <p className="text-sm font-medium text-primary leading-snug">
                {latestEq.locationText}
              </p>
              <p className="text-xs text-secondary-text">
                Kedalaman {latestEq.metrics?.depth ?? "-"}
                {latestEq.metrics?.eventStatus ? ` · ${latestEq.metrics.eventStatus}` : ""}
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border border-border bg-secondary-background/50 text-xs text-secondary-text">
              Pantauan gempabumi realtime BMKG InaTEWS tersedia di halaman Peta Nasional.
            </div>
          )}
        </div>

        {/* Aid & Access Status Breakdown */}
        <div className="space-y-2.5 pt-4 border-t border-border-inner">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-secondary-text">
              Status Akses &amp; Bantuan (BNPB &amp; PU)
            </span>
            <span className="text-[11px] font-mono text-secondary-text">
              {summaryCounts.regencyCount} kab/kota
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <Link
              href="/peta?status=AKSES_TERISOLIR"
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border-inner hover:border-primary transition-colors"
            >
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c62828] flex-shrink-0" aria-hidden="true" />
                <span>Akses terisolir</span>
              </span>
              <span className="font-mono text-xs font-semibold text-status-danger-text">
                {summaryCounts.statusCounts.aksesTerisolir} kab/kota
              </span>
            </Link>

            <Link
              href="/peta?status=DILAPORKAN_BELUM_MENERIMA_BANTUAN"
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border-inner hover:border-primary transition-colors"
            >
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef6c00] flex-shrink-0" aria-hidden="true" />
                <span>Dilaporkan belum terima bantuan</span>
              </span>
              <span className="font-mono text-xs font-semibold text-status-warning-text">
                {summaryCounts.statusCounts.belumMenerimaBantuan} kab/kota
              </span>
            </Link>

            <Link
              href="/peta?status=BELUM_TERVERIFIKASI"
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border-inner hover:border-primary transition-colors"
            >
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#616161] flex-shrink-0" aria-hidden="true" />
                <span>Belum terverifikasi</span>
              </span>
              <span className="font-mono text-xs font-semibold text-status-neutral-text">
                {summaryCounts.statusCounts.belumTerverifikasi} kab/kota
              </span>
            </Link>
          </div>
        </div>

        <LinkButton href="/peta" size="md" className="w-full">
          Pantau Peta Interaktif →
        </LinkButton>
      </div>
    </aside>
  );
}

function HeroBriefSkeleton() {
  return (
    <div
      className="h-[390px] rounded-xl border border-border bg-secondary-background/50 animate-pulse"
      role="status"
      aria-label="Memuat ringkasan situasi terkini"
    />
  );
}

async function NationalStatsFromDb() {
  const { dbStats, provinceCount, regencyCount, sourceCount } = await getNationalStatsBundle();

  if (dbStats.length > 0) {
    const formatted = dbStats.map((s) => ({
      key: s.key,
      label: s.label,
      value: s.value,
      unit: s.unit ?? undefined,
      asOfDate: s.asOfDate,
      source: {
        id: s.source.id,
        title: s.source.title,
        publisher: s.source.publisher ?? undefined,
        category: s.source.category,
        publicationDate: s.source.publicationDate ?? undefined,
        accessDate: s.source.accessDate,
        url: s.source.url ?? undefined,
      },
    }));

    return (
      <>
        <div className="grid gap-6 md:grid-cols-3">
          {formatted.map((stat) => (
            <StatisticDisplay key={stat.key} data={stat} variant="featured" />
          ))}
        </div>
        <p className="text-secondary-text text-sm mt-6">
          Cakupan basis data aktif: <strong className="text-primary">{provinceCount} provinsi</strong> dan{" "}
          <strong className="text-primary">{regencyCount} kabupaten/kota</strong> dengan{" "}
          <strong className="text-primary">{sourceCount} sumber terverifikasi</strong> di{" "}
          <Link href="/sumber" className="underline text-primary hover:text-black">
            Registri Sumber
          </Link>
          .
        </p>
      </>
    );
  }

  const snapshotDate = new Date("2026-11-28T00:00:00.000Z");
  const readinessStats = [
    {
      key: "mapped_provinces",
      label: "Provinsi Terpetakan",
      value: String(provinceCount),
      unit: "provinsi",
      asOfDate: snapshotDate,
      source: {
        id: "bps-big-provinces",
        title: "Data Administratif BPS / BIG",
        publisher: "BPS / BIG",
        category: "OFFICIAL" as const,
        publicationDate: new Date("2024-01-01T00:00:00.000Z"),
        accessDate: snapshotDate,
      },
    },
    {
      key: "mapped_regencies",
      label: "Kabupaten/Kota Terpetakan",
      value: String(regencyCount),
      unit: "kabupaten/kota",
      asOfDate: snapshotDate,
      source: {
        id: "big-regencies",
        title: "Data Batas Wilayah BIG / Ina-GEO",
        publisher: "BIG",
        category: "OFFICIAL" as const,
        publicationDate: new Date("2024-01-01T00:00:00.000Z"),
        accessDate: snapshotDate,
      },
    },
    {
      key: "registered_sources",
      label: "Sumber Data Terdaftar",
      value: String(sourceCount),
      unit: "sumber",
      asOfDate: snapshotDate,
      source: {
        id: "source-registry",
        title: "Registri Sumber Platform",
        publisher: "Tim Platform",
        category: "EDITORIAL" as const,
        publicationDate: snapshotDate,
        accessDate: snapshotDate,
      },
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {readinessStats.map((stat) => (
        <StatisticDisplay key={stat.key} data={stat} variant="featured" />
      ))}
    </div>
  );
}

function NationalStatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3" role="status" aria-label="Memuat statistik nasional">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 bg-background rounded-lg border border-border animate-pulse" />
      ))}
    </div>
  );
}

async function FeaturedCaseStudiesFromDb() {
  const summaries = await getAllCaseStudySummaries();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {summaries.map((cs) => (
        <Card
          key={cs.slug}
          className={`h-full border-t-4 ${
            cs.status === "active" ? "border-t-primary" : "border-t-status-warning-text"
          }`}
        >
          <CardContent className="flex flex-col h-full">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <Badge variant={cs.eventType === "geological" ? "warning" : "safe"} size="sm">
                {cs.eventType === "geological" ? "Geologis" : "Hidrometeorologis"}
              </Badge>
              <Badge variant={cs.status === "active" ? "safe" : "neutral"} size="sm">
                {cs.statusLabel}
              </Badge>
              <time dateTime={cs.isoDate} className="text-secondary-text font-mono text-xs ml-auto">
                {cs.dateLabel}
              </time>
            </div>

            <h3 className="font-display font-semibold text-xl md:text-2xl text-primary mb-2">
              {cs.title}
            </h3>
            <p className="text-secondary-text text-sm mb-5 flex-1 leading-relaxed">{cs.description}</p>

            <div className="grid grid-cols-3 gap-2 text-center mb-4 p-3.5 rounded-lg bg-secondary-background border border-border-inner">
              {cs.quickStats.map((qs) => (
                <div key={qs.label}>
                  <div className="font-display font-bold text-lg sm:text-xl text-primary">{qs.value}</div>
                  <div className="text-[11px] text-secondary-text mt-0.5">{qs.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-5">
              {cs.statusBadges.map((st) => (
                <StatusBadge key={st} status={st} />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-inner mt-auto">
              <LinkButton size="sm" href={cs.href}>
                Baca Studi Kasus →
              </LinkButton>
              <Link
                href={`/peta?prov=${encodeURIComponent(cs.provinceCode)}`}
                className="text-xs font-medium text-secondary-text hover:text-primary underline"
              >
                Buka di Peta ({cs.region}) →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CaseStudiesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2" role="status" aria-label="Memuat studi kasus unggulan">
      {[0, 1].map((i) => (
        <div key={i} className="h-72 bg-background rounded-lg border border-border animate-pulse" />
      ))}
    </div>
  );
}

const platformModules = [
  {
    num: "01",
    title: "Peta Nasional",
    description:
      "Pantau titik bencana live (BMKG InaTEWS, MAGMA, FIRMS, BNPB) serta status akses bantuan 514 kab/kota.",
    href: "/peta",
  },
  {
    num: "02",
    title: "Tren Bencana",
    description:
      "Analisis grafik kejadian harian, perbandingan terhadap minggu dan tahun lalu, serta rapor 38 provinsi.",
    href: "/tren",
  },
  {
    num: "03",
    title: "Studi Kasus",
    description:
      "Telaah terstruktur bencana prioritas Aceh dan Flores NTT 2026 lengkap dengan dampak per kab/kota.",
    href: "/kasus",
  },
  {
    num: "04",
    title: "Metodologi",
    description:
      "Standar bukti, aturan penetapan status wilayah, normalisasi kode BIG, dan keterbatasan data yang diketahui.",
    href: "/metodologi",
  },
  {
    num: "05",
    title: "Sumber Data",
    description:
      "Registri lengkap sumber resmi, media, penelitian, serta endpoint telemetri realtime yang terhubung.",
    href: "/sumber",
  },
  {
    num: "06",
    title: "Saluran Bantuan Resmi",
    description:
      "Tautan resmi dan nomor darurat 24 jam instansi pemerintah & kemanusiaan: BNPB, Basarnas, PMI, Baznas, Kemensos.",
    href: "/bantu",
  },
];

const disasterContext = [
  {
    title: "Bencana Geologis",
    badge: "Geologis",
    variant: "neutral" as const,
    description:
      "Gempabumi, tsunami, dan aktivitas gunung api — dipantau melalui BMKG InaTEWS Realtime & PVMBG MAGMA Indonesia.",
  },
  {
    title: "Bencana Hidrometeorologis",
    badge: "Hidrometeorologis",
    variant: "warning" as const,
    description:
      "Banjir, longsor, dan cuaca ekstrem — dipadukan dengan BMKG Nowcast CAP 1.2 dan titik jalan putus SITABA PU/BNPB.",
  },
  {
    title: "Lingkungan & Karhutla",
    badge: "Lingkungan",
    variant: "warning" as const,
    description:
      "Titik panas kebakaran hutan & lahan serta risiko pesisir — dipantau harian lewat satelit NASA FIRMS & BNPB.",
  },
];

export default function HomePage() {
  return (
    <MainLayout>
      {/* Editorial Asymmetric Hero */}
      <section className="py-12 md:py-16 lg:py-20 bg-background border-b border-border">
        <div className="container-main">
          <div className="grid gap-10 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-background border border-border text-xs font-mono text-secondary-text">
                <span className="w-2 h-2 rounded-full bg-[#16a34a]" aria-hidden="true" />
                38 Provinsi · 514 Kab/Kota · Data Resmi BNPB, BMKG InaTEWS &amp; PU
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[3.25rem] text-primary leading-[1.08]">
                Transparansi Data Bencana &amp; Distribusi Bantuan Indonesia
              </h1>

              <p className="text-base md:text-lg text-secondary-text max-w-2xl leading-relaxed">
                Pantau titik kejadian bencana secara real-time, status akses wilayah terdampak,
                dan jejak sumber terverifikasi dari instansi resmi — tanpa sensasionalisme,
                tanpa donasi perantara.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <LinkButton size="lg" href="/peta">
                  Buka Peta Nasional →
                </LinkButton>
                <LinkButton variant="secondary" size="lg" href="/tren">
                  Analisis Tren
                </LinkButton>
                <Link
                  href="/sumber"
                  className="px-3 py-2 text-sm font-medium text-secondary-text hover:text-primary underline underline-offset-4"
                >
                  Lihat Sumber Data
                </Link>
              </div>

              <dl className="grid grid-cols-3 gap-4 pt-6 border-t border-border max-w-2xl">
                <div>
                  <dt className="text-xs text-secondary-text">Mekanisme Donasi</dt>
                  <dd className="font-display font-bold text-lg sm:text-xl text-primary mt-0.5">0% Non-Komersial</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary-text">Telemetri Gempa</dt>
                  <dd className="font-display font-bold text-lg sm:text-xl text-primary mt-0.5">BMKG InaTEWS</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary-text">Standar Kode</dt>
                  <dd className="font-display font-bold text-lg sm:text-xl text-primary mt-0.5">BIG / BPS 514</dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <Suspense fallback={<HeroBriefSkeleton />}>
                <LiveSituationBrief />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* National Context / Key Statistics */}
      <section className="py-14 md:py-18 bg-secondary-background border-b border-border" aria-labelledby="national-context-heading">
        <div className="container-main">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-secondary-text mb-1">
                Data Terverifikasi
              </p>
              <h2 id="national-context-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary">
                Konteks Nasional
              </h2>
              <p className="text-secondary-text text-sm md:text-base mt-1.5 max-w-2xl">
                Ringkasan statistik dampak resmi dari basis data platform. Setiap angka mencantumkan tanggal dan sumber asalnya.
              </p>
            </div>
            <Link
              href="/sumber"
              className="text-sm font-medium text-primary underline hover:text-black whitespace-nowrap"
            >
              Telusuri Registri Sumber →
            </Link>
          </header>

          <Suspense fallback={<NationalStatsSkeleton />}>
            <NationalStatsFromDb />
          </Suspense>
        </div>
      </section>

      {/* Featured Case Studies */}
      <section className="py-14 md:py-18 bg-background border-b border-border" aria-labelledby="case-study-heading">
        <div className="container-main">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-secondary-text mb-1">
                Dossier Dampak Daerah
              </p>
              <h2 id="case-study-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary">
                Studi Kasus Prioritas
              </h2>
              <p className="text-secondary-text text-sm md:text-base mt-1.5 max-w-2xl">
                Agregasi resmi tingkat kabupaten/kota dari BNPB Geoportal dan SITABA Kementerian PU untuk pemantauan dampak serta akses bantuan.
              </p>
            </div>
            <Link
              href="/kasus"
              className="text-sm font-medium text-primary underline hover:text-black whitespace-nowrap"
            >
              Semua Studi Kasus →
            </Link>
          </header>

          <Suspense fallback={<CaseStudiesSkeleton />}>
            <FeaturedCaseStudiesFromDb />
          </Suspense>
        </div>
      </section>

      {/* Platform Index & Hazard Scope */}
      <section className="py-14 md:py-18 bg-secondary-background" aria-labelledby="quick-nav-heading">
        <div className="container-main space-y-12">
          <div>
            <header className="mb-8">
              <p className="font-mono text-xs uppercase tracking-wider text-secondary-text mb-1">
                Indeks Platform
              </p>
              <h2 id="quick-nav-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary">
                Jelajahi Modul Informasi
              </h2>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformModules.map((mod) => (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group rounded-lg border border-border bg-background p-6 flex flex-col justify-between hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs text-secondary-text">{mod.num}</span>
                      <span className="text-xs font-medium text-primary opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        Buka →
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-lg text-primary mb-2 group-hover:underline">
                      {mod.title}
                    </h3>
                    <p className="text-secondary-text text-sm leading-relaxed">{mod.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-border">
            <h3 className="font-display font-semibold text-xl text-primary mb-4">
              Cakupan Kategori Bencana
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {disasterContext.map((item) => (
                <div key={item.title} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-display font-semibold text-base text-primary">{item.title}</h4>
                    <Badge variant={item.variant} size="sm">
                      {item.badge}
                    </Badge>
                  </div>
                  <p className="text-secondary-text text-xs leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Non-Commercial / Non-Donation Commitment Strip */}
      <section className="py-12 md:py-14 bg-primary text-white" aria-labelledby="notice-heading">
        <div className="container-main">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <p className="font-mono text-xs uppercase tracking-wider text-white/70">
                Komitmen Non-Komersial
              </p>
              <h2 id="notice-heading" className="font-display font-semibold text-2xl md:text-3xl text-white">
                Platform Ini Bukan Tempat Donasi
              </h2>
              <p className="text-white/85 text-sm md:text-base leading-relaxed">
                Kami{" "}
                <strong className="text-white">
                  tidak mengumpulkan uang, tidak mempublikasikan rekening bank, tidak menyediakan dompet
                  penggalangan dana, dan tidak mengintegrasikan pembayaran
                </strong>
                . Seluruh masyarakat diarahkan langsung ke saluran bantuan resmi yang terverifikasi.
              </p>
            </div>
            <div className="flex-shrink-0">
              <LinkButton variant="inverted" size="lg" href="/bantu">
                Lihat Saluran Bantuan Resmi →
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
