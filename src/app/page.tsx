import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transparansi Bantuan Bencana Indonesia",
  description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia. Pantau lokasi bencana, status akses bantuan, dan sumber informasi resmi.",
  openGraph: {
    title: "Transparansi Bantuan Bencana Indonesia",
    description: "Platform transparansi informasi bencana dan distribusi bantuan di Indonesia.",
    type: "website",
    locale: "id_ID",
    siteName: "Transparansi Bantuan Bencana",
  },
};

const placeholderStats = [
  {
    key: "total_events",
    label: "Total Kejadian Bencana (2024)",
    value: "—",
    unit: "kejadian",
    asOfDate: new Date(),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BNPB",
      category: "OFFICIAL" as const,
      publicationDate: new Date(),
      accessDate: new Date(),
    },
  },
  {
    key: "affected_regions",
    label: "Wilayah Terdampak",
    value: "—",
    unit: "kabupaten/kota",
    asOfDate: new Date(),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BNPB",
      category: "OFFICIAL" as const,
      publicationDate: new Date(),
      accessDate: new Date(),
    },
  },
  {
    key: "assistance_distributed",
    label: "Bantuan Terdistribusi",
    value: "—",
    unit: "paket",
    asOfDate: new Date(),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BNPB",
      category: "OFFICIAL" as const,
      publicationDate: new Date(),
      accessDate: new Date(),
    },
  },
];

const quickLinks = [
  {
    title: "Peta Nasional",
    description: "Lihat sebaran bencana dan status bantuan di seluruh Indonesia",
    href: "/peta",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Studi Kasus",
    description: "Daftar studi kasus bencana: Aceh 2026 (aktif), NTT 2026 (historis)",
    href: "/kasus",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: "Metodologi",
    description: "Cara kami mengumpulkan, memvalidasi, dan menyajikan data",
    href: "/metodologi",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Sumber Data",
    description: "Daftar lengkap sumber informasi resmi, media, dan penelitian",
    href: "/sumber",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Saluran Bantuan Resmi",
    description: "Link ke BNPB, PMI, Baznas, dan instansi resmi lainnya",
    href: "/bantu",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

const disasterContext = [
  {
    title: "Bencana Geologis",
    description: "Gempa bumi, tsunami, dan letusan gunung berapi yang disebabkan oleh aktivitas tektonik. Contoh: Gempa Flores NTT Agustus 2026.",
    type: "geological" as const,
  },
  {
    title: "Bencana Hidrometeorologis",
    description: "Banjir, longsor, angin puting beliung, dan cuaca ekstrem yang dipengaruhi oleh perubahan iklim dan kondisi atmosfer.",
    type: "environmental" as const,
  },
  {
    title: "Bencana Lingkungan",
    description: "Erosi pantai, banjir rob, subsidensi lahan, dan degradasi ekosistem yang memperparah dampak bencana hidrometeorologis.",
    type: "environmental" as const,
  },
];

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-background">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-primary mb-6 leading-tight">
              Transparansi Bantuan Bencana di Indonesia
            </h1>
            <p className="text-lg md:text-xl text-secondary-text mb-8 leading-relaxed">
              Pantau lokasi bencana, status akses bantuan, bukti pendukung setiap klaim,
              dan saluran bantuan resmi — semua dalam satu platform transparan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <LinkButton size="lg" href="/peta">Lihat Peta Nasional</LinkButton>
              <LinkButton variant="secondary" size="lg" href="/kasus">Studi Kasus</LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* National Context / Key Statistics */}
      <section className="py-16 md:py-20 bg-secondary-background" aria-labelledby="national-context-heading">
        <div className="container-main">
          <header className="text-center mb-12">
            <h2 id="national-context-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary mb-4">
              Konteks Nasional
            </h2>
            <p className="text-secondary-text max-w-2xl mx-auto">
              Ringkasan statistik bencana dan bantuan di Indonesia. Setiap angka memiliki sumber dan tanggal data yang jelas.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {placeholderStats.map((stat) => (
              <StatisticDisplay key={stat.key} data={stat} variant="featured" />
            ))}
          </div>

          <p className="text-center text-secondary-text text-sm mt-8">
            <strong>Catatan:</strong> Data statistik nasional sedang dalam proses pengumpulan dan validasi.
            Silakan kunjungi halaman <Link href="/sumber" className="underline hover:text-primary">Sumber Data</Link>
            untuk melihat metodologi dan status pengumpulan data.
          </p>
        </div>
      </section>

      {/* Environmental Disaster Context */}
      <section className="py-16 md:py-20 bg-background" aria-labelledby="disaster-context-heading">
        <div className="container-main">
          <header className="text-center mb-12">
            <h2 id="disaster-context-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary mb-4">
              Konteks Bencana Lingkungan
            </h2>
            <p className="text-secondary-text max-w-2xl mx-auto">
              Pemahaman jenis bencana membantu menentukan respons dan mitigasi yang tepat.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {disasterContext.map((item, index) => (
              <Card key={index} className="h-full">
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">{item.title}</h3>
                  <p className="text-secondary-text text-sm">{item.description}</p>
                  <div className="mt-3">
                    <span
                      className={`badge ${
                        item.type === "geological" ? "badge-neutral" : "badge-warning"
                      }`}
                    >
                      {item.type === "geological" ? "Geologis" : "Lingkungan/Hidrometeorologis"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Case Studies */}
      <section className="py-16 md:py-20 bg-secondary-background" aria-labelledby="case-study-heading">
        <div className="container-main">
          <header className="text-center mb-12">
            <h2 id="case-study-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary mb-4">
              Studi Kasus Unggulan
            </h2>
            <p className="text-secondary-text max-w-2xl mx-auto mb-8">
              Dua studi kasus prioritas: banjir hidrometeorologis Aceh (Nov 2026, aktif) dan gempa geologis Flores NTT (Agu 2026, historis).
              Keduanya menunjukkan tantangan distribusi bantuan dan jejak informasi yang berbeda.
            </p>
          </header>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Aceh 2026 - Active */}
            <Card className="h-full border-l-4 border-primary">
              <CardContent className="flex flex-col h-full p-6">
                <div className="flex items-center gap-2 text-sm mb-3">
                  <Badge variant="safe">Hidrometeorologis</Badge>
                  <time dateTime="2026-11" className="text-secondary-text font-mono">November 2026</time>
                  <Badge variant="safe">Aktif</Badge>
                </div>
                <h3 className="font-display font-semibold text-xl text-primary mb-2">Banjir & Longsor Aceh</h3>
                <p className="text-secondary-text text-sm mb-4 flex-1">
                  Banjir bandang dan longsor akibat hujan ekstrem melanda 7 kabupaten/kota di Aceh.
                  Tantangan evakuasi, akses terputus, dan validasi data korban di wilayah terisolir.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="warning">Dilaporkan belum menerima bantuan</Badge>
                  <Badge variant="danger">Akses terisolir</Badge>
                  <Badge variant="neutral">Belum terverifikasi</Badge>
                </div>
                <LinkButton size="lg" href="/kasus/aceh-2026">Baca Studi Kasus</LinkButton>
              </CardContent>
            </Card>

            {/* NTT 2026 - Historical */}
            <Card className="h-full border-l-4 border-warning">
              <CardContent className="flex flex-col h-full p-6">
                <div className="flex items-center gap-2 text-sm mb-3">
                  <Badge variant="warning">Geologis</Badge>
                  <time dateTime="2026-08" className="text-secondary-text font-mono">Agustus 2026</time>
                  <Badge variant="neutral">Historis</Badge>
                </div>
                <h3 className="font-display font-semibold text-xl text-primary mb-2">Gempa Flores NTT</h3>
                <p className="text-secondary-text text-sm mb-4 flex-1">
                  Gempa bumi magnitudo 6.1 SR mengguncang Pulau Flores. Studi kasus distribusi bantuan
                  ke wilayah terpencil dan keterelaksanaan informasi bencana geologis.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="warning">Dilaporkan belum menerima bantuan</Badge>
                  <Badge variant="danger">Akses terisolir</Badge>
                  <Badge variant="neutral">Belum terverifikasi</Badge>
                </div>
                <LinkButton size="lg" href="/kasus/ntt-2026">Baca Studi Kasus</LinkButton>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <LinkButton variant="secondary" size="lg" href="/kasus">Lihat Semua Studi Kasus</LinkButton>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-16 md:py-20 bg-background" aria-labelledby="quick-nav-heading">
        <div className="container-main">
          <header className="text-center mb-12">
            <h2 id="quick-nav-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary mb-4">
              Jelajahi Platform
            </h2>
            <p className="text-secondary-text max-w-2xl mx-auto">
              Akses cepat ke fitur-fitur utama platform transparansi bencana.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Card key={link.href} className="h-full hover:border-primary transition-colors">
                <CardContent className="flex flex-col h-full">
                  <div className="w-12 h-12 bg-secondary-background rounded-lg flex items-center justify-center text-primary mb-4">
                    {link.icon}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">{link.title}</h3>
                  <p className="text-secondary-text text-sm mb-4 flex-1">{link.description}</p>
                  <LinkButton variant="secondary" href={link.href} className="w-full">Buka {link.title}</LinkButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-12 bg-primary text-white" aria-labelledby="notice-heading">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 id="notice-heading" className="font-display font-semibold text-2xl md:text-3xl mb-4">
              Penting: Platform Ini Bukan Tempat Donasi
            </h2>
            <p className="text-white/90 text-base mb-6 leading-relaxed">
              Kami <strong>tidak mengumpulkan uang, tidak mempublikasikan rekening bank,
              tidak menyediakan dompet penggalangan dana, dan tidak mengintegrasikan pembayaran</strong>.
              Platform ini hanya menyediakan informasi transparan tentang bencana dan
              mengarahkan ke saluran bantuan resmi yang terverifikasi.
            </p>
            <LinkButton variant="secondary" size="lg" href="/bantu" className="bg-transparent border-white text-white hover:bg-white/10">Lihat Saluran Bantuan Resmi</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}