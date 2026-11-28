import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { getAllCaseStudySummaries } from "@/lib/case-studies";

export const metadata: Metadata = {
  title: "Studi Kasus Bencana | Transparansi Bantuan Bencana",
  description:
    "Daftar studi kasus bencana di Indonesia dengan data dampak resmi BNPB & Kementerian PU, status akses bantuan per kabupaten/kota, serta jejak sumber terverifikasi.",
  openGraph: {
    title: "Studi Kasus Bencana | Transparansi Bantuan Bencana",
    description: "Kumpulan studi kasus bencana di Indonesia dengan data terverifikasi.",
    type: "website",
    locale: "id_ID",
  },
};

const statusConfig = {
  active: { variant: "safe" as const, label: "Aktif" },
  historical: { variant: "neutral" as const, label: "Historis" },
};

const eventTypeConfig = {
  geological: { badge: "warning" as const, label: "Geologis" },
  environmental: { badge: "safe" as const, label: "Hidrometeorologis" },
};

async function CaseStudiesListFromDb() {
  const caseStudies = await getAllCaseStudySummaries();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {caseStudies.map((caseStudy) => (
        <Card key={caseStudy.slug} className="h-full flex flex-col hover:border-primary transition-colors">
          <CardContent className="flex flex-col h-full">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
              <Badge variant={eventTypeConfig[caseStudy.eventType].badge} size="sm">
                {eventTypeConfig[caseStudy.eventType].label}
              </Badge>
              <Badge variant={statusConfig[caseStudy.status].variant} size="sm">
                {caseStudy.statusLabel}
              </Badge>
              <time dateTime={caseStudy.isoDate} className="text-secondary-text font-mono text-xs">
                {caseStudy.dateLabel}
              </time>
            </div>

            <h2 className="font-display font-semibold text-2xl text-primary mb-2">{caseStudy.title}</h2>
            <p className="text-secondary-text text-sm mb-4 flex-1 leading-relaxed">{caseStudy.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {caseStudy.statusBadges.map((st) => (
                <StatusBadge key={st} status={st} />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-5 p-4 bg-secondary-background rounded-lg border border-border-inner">
              {caseStudy.quickStats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display font-bold text-xl sm:text-2xl text-primary">{stat.value}</div>
                  <div className="text-secondary-text text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-inner mt-auto">
              <Link
                href={caseStudy.href}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Baca Studi Kasus
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href={`/peta?prov=${encodeURIComponent(caseStudy.provinceCode)}`}
                className="text-xs font-medium text-secondary-text hover:text-primary underline"
              >
                Lihat di Peta ({caseStudy.region}) →
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CaseListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2" role="status" aria-label="Memuat studi kasus">
      {[0, 1].map((i) => (
        <div key={i} className="h-80 rounded-lg border border-border bg-secondary-background/60 animate-pulse" />
      ))}
    </div>
  );
}

export default function CaseListingPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="case-listing-heading">
        <div className="container-main">
          <header className="mb-10">
            <h1 id="case-listing-heading" className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
              Studi Kasus Bencana
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl leading-relaxed">
              Analisis mendalam kejadian bencana prioritas di Indonesia berbasis rekaman resmi BNPB Geoportal
              dan SITABA Kementerian PU. Setiap studi kasus melacak dampak per kabupaten/kota, status akses bantuan,
              dan rujukan sumber yang dapat diverifikasi.
            </p>
          </header>

          <Suspense fallback={<CaseListSkeleton />}>
            <CaseStudiesListFromDb />
          </Suspense>

          <div className="mt-12 p-6 bg-secondary-background rounded-lg border border-border">
            <h2 className="font-display font-semibold text-lg text-primary mb-4">Kategori Status Studi Kasus</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="safe" size="sm" className="flex-shrink-0 mt-0.5">Aktif</Badge>
                <div>
                  <p className="font-medium text-primary">Pemantauan berjalan</p>
                  <p className="text-secondary-text text-xs mt-0.5">Pemulihan, hunian, atau akses infrastruktur masih dalam pembaruan berkala.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="neutral" size="sm" className="flex-shrink-0 mt-0.5">Historis</Badge>
                <div>
                  <p className="font-medium text-primary">Konsolidasi selesai</p>
                  <p className="text-secondary-text text-xs mt-0.5">Fase tanggap darurat utama selesai; data dampak relatif stabil.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="default" size="sm" className="flex-shrink-0 mt-0.5">Arsip</Badge>
                <div>
                  <p className="font-medium text-primary">Arsip rujukan</p>
                  <p className="text-secondary-text text-xs mt-0.5">Disimpan sebagai jejak audit historis tanpa pembaruan lapangan baru.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="warning" size="sm" className="flex-shrink-0 mt-0.5">Belum Terverifikasi</Badge>
                <div>
                  <p className="font-medium text-primary">Perlu validasi lanjut</p>
                  <p className="text-secondary-text text-xs mt-0.5">Laporan awal ada namun menunggu konfirmasi silang multi-sumber.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-secondary-text text-sm">
              Setiap angka pada studi kasus di atas ditautkan langsung ke catatan resmi di database. Lihat{" "}
              <Link href="/metodologi" className="underline hover:text-primary">Metodologi</Link> dan{" "}
              <Link href="/sumber" className="underline hover:text-primary">Sumber Data</Link> untuk rincian lengkap.
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
