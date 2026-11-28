import { Suspense } from "react";
import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { getSourcesRegistry } from "@/lib/site-data";
import { SourcesRegistryClient, type SourceRegistryItem } from "./SourcesRegistryClient";

export const metadata: Metadata = {
  title: "Sumber Data | Transparansi Bantuan Bencana",
  description:
    "Daftar lengkap sumber data bencana dan bantuan: instansi resmi, media, penelitian, dan editorial. Setiap sumber memiliki kategori, tanggal publikasi, dan akses.",
  openGraph: {
    title: "Sumber Data | Transparansi Bantuan Bencana",
    description: "Daftar lengkap sumber data bencana dan bantuan dengan kategori dan tanggal.",
    type: "website",
    locale: "id_ID",
  },
};

const liveFeedsSummary = [
  { label: "BMKG InaTEWS Realtime", url: "https://cdn.bmkg.go.id/live30event.xml", note: "Stream SeisComP gempabumi terkini & lastQL.json" },
  { label: "BMKG TEWS & Nowcast CAP", url: "https://data.bmkg.go.id/gempabumi/", note: "Buletin gempabumi dirasakan, M ≥ 5.0, dan poligon cuaca ekstrem CAP 1.2" },
  { label: "PVMBG MAGMA Indonesia", url: "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas", note: "Tingkat aktivitas gunung api Level II–IV & status VONA" },
  { label: "BNPB Geoportal & inaRISK", url: "https://gis.bnpb.go.id/server/rest/services", note: "Kejadian bencana mingguan nasional, dampak wilayah, dan layer bahaya" },
  { label: "NASA EOSDIS FIRMS", url: "https://firms.modaps.eosdis.nasa.gov/map/", note: "Titik panas karhutla satelit VIIRS NOAA-20 & MODIS (7 hari)" },
  { label: "USGS & GDACS (UN/EC)", url: "https://earthquake.usgs.gov/earthquakes/map/", note: "Pembanding seismik M ≥ 4.0 dan peringatan bencana multi-satelit" },
];

async function SourcesListFromDb() {
  const rows = await getSourcesRegistry();

  const serialized: SourceRegistryItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    url: row.url,
    category: row.category,
    publicationDate: row.publicationDate ? row.publicationDate.toISOString() : null,
    accessDate: row.accessDate.toISOString(),
    description: row.description,
    importBatchId: row.importBatchId,
  }));

  return <SourcesRegistryClient sources={serialized} />;
}

function SourcesLoadingSkeleton() {
  return (
    <div className="space-y-4 mb-8" role="status" aria-label="Memuat daftar sumber">
      <div className="h-24 bg-secondary-background rounded-xl border border-border animate-pulse" />
      <div className="h-64 bg-secondary-background rounded-xl border border-border animate-pulse" />
    </div>
  );
}

export default function SourcesPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="sources-heading">
        <div className="container-main">
          <header className="mb-8">
            <h1 id="sources-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-3">
              Sumber Data
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl leading-relaxed">
              Daftar lengkap sumber informasi yang terdaftar pada basis data platform beserta endpoint telemetri
              realtime yang digunakan pada Peta Nasional dan Analisis Tren.
            </p>
          </header>

          <Suspense fallback={<SourcesLoadingSkeleton />}>
            <SourcesListFromDb />
          </Suspense>

          {/* Live Telemetry Endpoints Note */}
          <Card className="mb-8">
            <CardContent>
              <h2 className="font-display font-semibold text-lg text-primary mb-3">
                Endpoint Telemetri Live (Peta &amp; Tren)
              </h2>
              <p className="text-sm text-secondary-text mb-4">
                Selain sumber statistik tersimpan di atas, halaman <a href="/peta" className="underline text-primary">Peta Nasional</a> dan{" "}
                <a href="/tren" className="underline text-primary">Tren Bencana</a> menarik umpan data langsung dari kanal resmi berikut:
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {liveFeedsSummary.map((feed) => (
                  <div key={feed.label} className="p-3 rounded-lg border border-border-inner bg-secondary-background/50 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-primary">{feed.label}</span>
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-black flex-shrink-0"
                      >
                        Buka →
                      </a>
                    </div>
                    <p className="text-secondary-text leading-relaxed">{feed.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary & Notes */}
          <Card>
            <CardContent>
              <h2 className="font-display font-semibold text-lg text-primary mb-4">Catatan Audit &amp; Provenansi</h2>
              <ul className="list-disc list-inside text-secondary-text text-sm space-y-3 leading-relaxed">
                <li>
                  <strong>Tanggal Publikasi vs Tanggal Akses:</strong> Tanggal publikasi adalah waktu penerbitan oleh sumber asli.
                  Tanggal akses adalah waktu pengambilan/verifikasi data oleh sistem platform.
                </li>
                <li>
                  <strong>Batch Impor (<code className="font-mono text-xs">importBatchId</code>):</strong> Mengelompokkan rangkaian
                  impor yang terjadi bersamaan untuk memudahkan penelusuran dan audit data.
                </li>
                <li>
                  <strong>Kategori Editorial:</strong> Konten analisis, sintesis, dan naratif dikategorikan EDITORIAL untuk
                  membedakannya dari data primer (OFFICIAL, MEDIA, RESEARCH).
                </li>
                <li>
                  <strong>Verifikasi Berlapis:</strong> Data OFFICIAL disilangkan antar sumber resmi maupun liputan lapangan;
                  perbedaan angka dicatat secara terbuka, tidak disembunyikan.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/metodologi">← Lihat Metodologi</LinkButton>
            <LinkButton href="/peta">Buka Peta Nasional →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
