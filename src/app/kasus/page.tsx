import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Studi Kasus Bencana | Transparansi Bantuan Bencana",
  description: "Daftar studi kasus bencana di Indonesia dengan analisis mendalam dampak, respons bantuan, dan jejak informasi. Termasuk kasus Flores NTT 2026 dan Banjir Aceh 2026.",
  openGraph: {
    title: "Studi Kasus Bencana | Transparansi Bantuan Bencana",
    description: "Kumpulan studi kasus bencana di Indonesia dengan data terverifikasi.",
    type: "website",
    locale: "id_ID",
  },
};

interface CaseStudy {
  slug: string;
  title: string;
  description: string;
  eventType: "geological" | "environmental";
  date: string;
  region: string;
  status: "active" | "historical" | "archived" | "unverified";
  statusLabel: string;
  stats: { label: string; value: string }[];
  href: string;
}

const caseStudies: CaseStudy[] = [
  {
    slug: "aceh-2026",
    title: "Banjir & Longsor Aceh, November 2026",
    description: "Banjir bandang dan longsor akibat hujan ekstrem melanda beberapa kabupaten di Aceh pada November 2026. Studi kasus bencana hidrometeorologis dengan tantangan evakuasi dan distribusi bantuan di wilayah terisolir.",
    eventType: "environmental",
    date: "November 2026",
    region: "Aceh",
    status: "active",
    statusLabel: "Aktif",
    stats: [
      { label: "Kabupaten Terdampak", value: "7" },
      { label: "Korban Jiwa", value: "—" },
      { label: "Warga Mengungsi", value: "—" },
    ],
    href: "/kasus/aceh-2026",
  },
  {
    slug: "ntt-2026",
    title: "Gempa Flores NTT, Agustus 2026",
    description: "Gempa bumi magnitudo 6.1 SR mengguncang Pulau Flores, Nusa Tenggara Timur pada Agustus 2026. Studi kasus bencana geologis dengan fokus pada distribusi bantuan ke wilayah terpencil dan keterelaksanaan informasi.",
    eventType: "geological",
    date: "Agustus 2026",
    region: "Nusa Tenggara Timur",
    status: "historical",
    statusLabel: "Historis",
    stats: [
      { label: "Kabupaten Terdampak", value: "5" },
      { label: "Korban Jiwa", value: "—" },
      { label: "Warga Mengungsi", value: "—" },
    ],
    href: "/kasus/ntt-2026",
  },
];

const statusConfig = {
  active: { variant: "safe" as const, label: "Aktif" },
  historical: { variant: "neutral" as const, label: "Historis" },
  archived: { variant: "default" as const, label: "Arsip" },
  unverified: { variant: "warning" as const, label: "Belum Terverifikasi" },
};

const eventTypeConfig = {
  geological: { badge: "warning" as const, label: "Geologis" },
  environmental: { badge: "safe" as const, label: "Hidrometeorologis" },
};

export default function CaseListingPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="case-listing-heading">
        <div className="container-main">
          <header className="mb-12">
            <h1 id="case-listing-heading" className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
              Studi Kasus Bencana
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl">
              Kumpulan analisis mendalam kejadian bencana di Indonesia. Setiap studi kasus melacak dampak, respons bantuan,
              tantangan distribusi logistik, dan jejak informasi dari sumber resmi hingga media investigasi.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((caseStudy) => (
              <Card key={caseStudy.slug} className="h-full flex flex-col hover:border-primary transition-colors">
                <CardContent className="flex flex-col h-full p-6">
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <Badge variant={eventTypeConfig[caseStudy.eventType].badge}>
                      {eventTypeConfig[caseStudy.eventType].label}
                    </Badge>
                    <time dateTime={caseStudy.date} className="text-secondary-text font-mono">
                      {caseStudy.date}
                    </time>
                  </div>
                  <h2 className="font-display font-semibold text-xl text-primary mb-2">{caseStudy.title}</h2>
                  <p className="text-secondary-text text-sm mb-4 flex-1">{caseStudy.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={statusConfig[caseStudy.status].variant}>{caseStudy.statusLabel}</Badge>
                    <span className="text-secondary-text text-sm">{caseStudy.region}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4 p-4 bg-secondary-background rounded-lg">
                    {caseStudy.stats.map((stat, index) => (
                      <div key={index}>
                        <div className="font-display font-bold text-2xl text-primary">{stat.value}</div>
                        <div className="text-secondary-text text-xs mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={caseStudy.href}
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline mt-auto"
                  >
                    Baca Studi Kasus
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-secondary-background rounded-lg">
            <h3 className="font-display font-semibold text-lg text-primary mb-4">Kategori Status Studi Kasus</h3>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="safe" className="flex-shrink-0 mt-0.5">Aktif</Badge>
                <div>
                  <p className="font-medium text-primary">Investigasi berlangsung</p>
                  <p className="text-secondary-text">Data masih dikumpulkan dan divalidasi; update berkala.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="neutral" className="flex-shrink-0 mt-0.5">Historis</Badge>
                <div>
                  <p className="font-medium text-primary">Validasi selesai</p>
                  <p className="text-secondary-text">Proses validasi utama selesai; data relatif stabil.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="default" className="flex-shrink-0 mt-0.5">Arsip</Badge>
                <div>
                  <p className="font-medium text-primary">Tidak ada update baru</p>
                  <p className="text-secondary-text">Bencana sudah berakhir lama; tidak ada pelaporan baru.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="warning" className="flex-shrink-0 mt-0.5">Belum Terverifikasi</Badge>
                <div>
                  <p className="font-medium text-primary">Perlu validasi lanjut</p>
                  <p className="text-secondary-text">Laporan awal ada tapi belum dikonfirmasi multi-sumber.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-secondary-text text-sm">
              Data statistik pada kartu di atas bersifat indikatif dan dalam proses validasi.
              Lihat <Link href="/metodologi" className="underline hover:text-primary">Metodologi</Link> dan
              <Link href="/sumber" className="underline hover:text-primary">Sumber Data</Link> untuk detail.
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}