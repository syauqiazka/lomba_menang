import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
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
    title: "Kasus Flores NTT 2026",
    description: "Studi kasus gempa Flores Agustus 2026 dan distribusi bantuan",
    href: "/kasus/ntt-2026",
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
              <LinkButton variant="secondary" size="lg" href="/kasus/ntt-2026">Kasus Flores NTT 2026</LinkButton>
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

      {/* Featured Case Study */}
      <section className="py-16 md:py-20 bg-secondary-background" aria-labelledby="case-study-heading">
        <div className="container-main">
          <header className="text-center mb-12">
            <h2 id="case-study-heading" className="font-display font-semibold text-2xl md:text-3xl text-primary mb-4">
              Studi Kasus Unggulan
            </h2>
            <p className="text-secondary-text max-w-2xl mx-auto mb-8">
              Gempa bumi Flores, NTT pada Agustus 2026 — studi kasus distribusi bantuan dan
              keterelaksanaan informasi bencana geologis.
            </p>
          </header>

          <Card className="max-w-4xl mx-auto">
            <CardContent className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-display font-semibold text-2xl text-primary mb-3">
                  Gempa Flores NTT, Agustus 2026
                </h3>
                <p className="text-secondary-text mb-4">
                  Gempa bumi magnitudo 6.1 SR mengguncang Pulau Flores, Nusa Tenggara Timur pada
                  Agustus 2026. Studi kasus ini menelusuri dampak, respons bantuan, dan tantangan
                  akses informasi di wilayah terpencil.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge badge-warning">Dilaporkan belum menerima bantuan</span>
                  <span className="badge badge-danger">Akses terisolir</span>
                  <span className="badge badge-neutral">Belum terverifikasi</span>
                </div>
                <LinkButton size="lg" href="/kasus/ntt-2026">Baca Studi Kasus Lengkap</LinkButton>
              </div>
              <div className="w-full md:w-1/2 aspect-square bg-secondary-background rounded-lg flex items-center justify-center">
                <div className="text-center p-4">
                  <svg className="w-16 h-16 mx-auto text-secondary-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-secondary-text text-sm">Peta wilayah Flores, NTT</p>
                  <p className="text-xs text-secondary-text/70 mt-1">Visualisasi wilayah terdampak gempa</p>
                </div>
              </div>
            </CardContent>
          </Card>
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