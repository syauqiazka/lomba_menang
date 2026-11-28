import { Suspense } from "react";
import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { SourcesRegistryClient, type SourceRegistryItem } from "./SourcesRegistryClient";

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

async function SourcesListFromDb() {
  const rows = await prisma.source.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      publisher: true,
      url: true,
      category: true,
      publicationDate: true,
      accessDate: true,
      description: true,
      importBatchId: true,
    },
  });

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
            <p className="text-secondary-text text-lg max-w-2xl">
              Daftar lengkap sumber informasi yang digunakan di platform ini. Setiap sumber dikategorikan,
              bertanggal, dan dapat diverifikasi independen.
            </p>
          </header>

          <Suspense fallback={<SourcesLoadingSkeleton />}>
            <SourcesListFromDb />
          </Suspense>

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
