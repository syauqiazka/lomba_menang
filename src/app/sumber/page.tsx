import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataSourceIndicator } from "@/components/ui/DataSourceIndicator";

export const metadata: Metadata = {
  title: "Sumber Data | Transparansi Bantuan Bencana",
  description: "Daftar lengkap sumber data bencana dan bantuan: instansi resmi, media, penelitian, dan editorial. Setiap sumber memiliki kategori, tanggal publikasi, dan akses.",
  openGraph: {
    title: "Sumber Data | Transparansi Bantuan Bencana",
    description: "Daftar lengkap sumber data bencana dan bantuan dengan kategori dan tanggal.",
    type: "website",
    locale: "id_ID",
  },
};

const sources = [
  {
    id: "bnpb-situation",
    title: "Laporan Situasi Harian BNPB",
    publisher: "Badan Nasional Penanggulangan Bencana",
    category: "OFFICIAL" as const,
    description: "Laporan situasi bencana nasional harian yang dipublikasikan BNPB melalui website dan media sosial resmi.",
    publicationDate: new Date(),
    accessDate: new Date(),
    url: "https://bnpb.go.id",
    importBatchId: "batch-2026-001",
  },
  {
    id: "bpbd-ntt",
    title: "Laporan BPBD Provinsi NTT",
    publisher: "BPBD Provinsi Nusa Tenggara Timur",
    category: "OFFICIAL" as const,
    description: "Data bencana, korban, dan bantuan tingkat provinsi NTT dari Badan Penanggulangan Bencana Daerah.",
    publicationDate: new Date(),
    accessDate: new Date(),
    url: "https://bpbd.nttprov.go.id",
    importBatchId: "batch-2026-001",
  },
  {
    id: "bmkg-earthquake",
    title: "Katalog Gempa BMKG",
    publisher: "Badan Meteorologi, Klimatologi, dan Geofisika",
    category: "OFFICIAL" as const,
    description: "Data parameter gempa bumi (magnitudo, kedalaman, lokasi, waktu) dari katalog resmi BMKG.",
    publicationDate: new Date(),
    accessDate: new Date(),
    url: "https://bmkg.go.id",
    importBatchId: "batch-2026-001",
  },
  {
    id: "big-admin",
    title: "Data Administratif BIG/Ina-GEO",
    publisher: "Badan Informasi Geospasial",
    category: "OFFICIAL" as const,
    description: "Kode dan batas administratif wilayah Indonesia (provinsi, kabupaten/kota, kecamatan, desa) per Permendagri 72/2019.",
    publicationDate: new Date("2024-01-01"),
    accessDate: new Date(),
    url: "https://ina-geo.big.go.id",
    importBatchId: "batch-2026-001",
  },
  {
    id: "tempo-investigasi",
    title: "Investigasi Tempo: Bantuan Gempa Flores",
    publisher: "Tempo.co",
    category: "MEDIA" as const,
    description: "Liputan investigasi mendalam mengenai distribusi bantuan gempa Flores NTT Agustus 2026 di wilayah terpencil.",
    publicationDate: new Date("2026-09-15"),
    accessDate: new Date(),
    url: "https://tempo.co",
    importBatchId: "batch-2026-002",
  },
  {
    id: "kompas-flores",
    title: "Laporan Khusus Kompas: Gempa Flores",
    publisher: "Kompas.id",
    category: "MEDIA" as const,
    description: "Seri laporan khusus gempa Flores: dampak, pengungsian, dan respons pemerintah.",
    publicationDate: new Date("2026-09-20"),
    accessDate: new Date(),
    url: "https://kompas.id",
    importBatchId: "batch-2026-002",
  },
  {
    id: "bbc-indonesia",
    title: "BBC Indonesia: Gempa NTT",
    publisher: "BBC News Indonesia",
    category: "MEDIA" as const,
    description: "Liputan internasional tentang gempa Flores dan tantangan akses bantuan di NTT.",
    publicationDate: new Date("2026-08-25"),
    accessDate: new Date(),
    url: "https://bbc.com/indonesia",
    importBatchId: "batch-2026-002",
  },
  {
    id: "pmi-report",
    title: "Laporan Operasional PMI NTT",
    publisher: "Palang Merah Indonesia Cabang NTT",
    category: "RESEARCH" as const,
    description: "Laporan distribusi bantuan kemanusiaan (tenda, makanan, air, layanan kesehatan) dari PMI tingkat cabang.",
    publicationDate: new Date("2026-09-01"),
    accessDate: new Date(),
    url: "https://pmi.or.id",
    importBatchId: "batch-2026-003",
  },
  {
    id: "ocha-snapshot",
    title: "OCHA Humanitarian Snapshot Indonesia",
    publisher: "UN OCHA",
    category: "RESEARCH" as const,
    description: "Snapshot kebutuhan kemanusiaan dan respons cluster untuk bencana di Indonesia.",
    publicationDate: new Date("2026-09-10"),
    accessDate: new Date(),
    url: "https://unocha.org",
    importBatchId: "batch-2026-003",
  },
];

const categoryFilters = [
  { value: "", label: "Semua Kategori" },
  { value: "OFFICIAL", label: "Resmi" },
  { value: "MEDIA", label: "Media" },
  { value: "RESEARCH", label: "Penelitian" },
  { value: "EDITORIAL", label: "Editorial" },
];

const categoryLabels: Record<string, string> = {
  OFFICIAL: "Resmi",
  MEDIA: "Media",
  RESEARCH: "Penelitian",
  EDITORIAL: "Editorial",
};

const categoryBadges: Record<string, "safe" | "warning" | "neutral" | "default"> = {
  OFFICIAL: "safe",
  MEDIA: "warning",
  RESEARCH: "neutral",
  EDITORIAL: "default",
};

export default function SourcesPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="sources-heading">
        <div className="container-main">
          <header className="mb-8">
            <h1 id="sources-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-3">
              Sumber Data
            </h1>
            <p className="text-secondary-text text-lg max-w-2xl">
              Daftar lengkap sumber informasi yang digunakan di platform ini. Setiap sumber dikategorikan,
              bertanggal, dan dapat diverifikasi independen.
            </p>
          </header>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="category-filter" className="block text-sm font-medium text-primary mb-1">
                    Filter Kategori
                  </label>
                  <select
                    id="category-filter"
                    className="input-field"
                    aria-label="Filter kategori sumber"
                  >
                    {categoryFilters.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="search-sources" className="block text-sm font-medium text-primary mb-1">
                    Cari Sumber
                  </label>
                  <input
                    type="search"
                    id="search-sources"
                    placeholder="Judul, penerbit, atau URL..."
                    className="input-field"
                    aria-label="Cari sumber data"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sources List - Table View (Desktop) */}
          <div className="hidden lg:block mb-8" role="region" aria-label="Daftar sumber data tampilan tabel" tabIndex={0}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Judul / Penerbit</th>
                    <th scope="col">Kategori</th>
                    <th scope="col">Tanggal Terbit</th>
                    <th scope="col">Tanggal Akses</th>
                    <th scope="col">Batch Impor</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id}>
                      <td>
                        <div>
                          <p className="font-medium text-primary">{source.title}</p>
                          <p className="text-secondary-text text-sm">{source.publisher}</p>
                        </div>
                      </td>
                      <td>
                        <Badge variant={categoryBadges[source.category]}>
                          {categoryLabels[source.category]}
                        </Badge>
                      </td>
                      <td>
                        <time dateTime={source.publicationDate.toISOString()}>
                          {source.publicationDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </time>
                      </td>
                      <td>
                        <time dateTime={source.accessDate.toISOString()}>
                          {source.accessDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </time>
                      </td>
                      <td className="font-mono text-sm text-secondary-text">{source.importBatchId}</td>
                      <td>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-black text-sm"
                        >
                          Buka
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sources List - Card View (Mobile) */}
          <div className="lg:hidden space-y-4" role="region" aria-label="Daftar sumber data tampilan kartu" tabIndex={0}>
            {sources.map((source) => (
              <Card key={source.id}>
                <CardContent>
                  <DataSourceIndicator source={source} compact={false} showCategory={true} />
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <span className="font-mono text-xs text-secondary-text">{source.importBatchId}</span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-primary underline hover:text-black text-sm"
                    >
                      Buka sumber
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary & Notes */}
          <Card>
            <CardContent>
              <h3 className="font-display font-semibold text-lg text-primary mb-4">Catatan Sumber Data</h3>
              <ul className="list-disc list-inside text-secondary-text space-y-3">
                <li>
                  <strong>Tanggal Publikasi vs Tanggal Akses:</strong> Tanggal publikasi adalah kapan sumber menerbitkan data.
                  Tanggal akses adalah kapan tim platform mengambil/mengamati data tersebut. Keduanya dicatat untuk audit trail.
                </li>
                <li>
                  <strong>Batch Impor:</strong> Mengidentifikasi rangkaian impor data yang terjadi bersamaan.
                  Memungkinkan pelacakan provenansi massal jika ditemukan kesalahan sistematis.
                </li>
                <li>
                  <strong>Kategori Editorial:</strong> Konten analisis, sintesis, dan naratif (seperti halaman Metodologi dan Studi Kasus)
                  dikategorikan EDITORIAL untuk membedakannya dari data mentah (OFFICIAL, MEDIA, RESEARCH).
                </li>
                <li>
                  <strong>Verifikasi Berlapis:</strong> Sumber OFFICIAL diverifikasi silang dengan MEDIA dan RESEARCH.
                  Diskrepansi dicatat, tidak disembunyikan.
                </li>
                <li>
                  <strong>Update Berkala:</strong> Daftar sumber diperbarui saat impor data baru terjadi.
                  Versi sebelumnya diarsipkan dengan importBatchId untuk traceability.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/metodologi">← Lihat Metodologi</LinkButton>
            <LinkButton href="/peta">Terapkan ke Peta →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}