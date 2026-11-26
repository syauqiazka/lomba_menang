import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { getMapRegions } from "@/lib/map-data";
import { DisasterMapClient } from "./DisasterMapClient";

export const metadata: Metadata = {
  title: "Peta Nasional Bencana | Transparansi Bantuan Bencana",
  description: "Peta interaktif sebaran bencana dan status distribusi bantuan di seluruh Indonesia. Data bersumber dari instansi resmi dan terverifikasi.",
  openGraph: {
    title: "Peta Nasional Bencana | Transparansi Bantuan Bencana",
    description: "Peta interaktif sebaran bencana dan status distribusi bantuan di seluruh Indonesia.",
    type: "website",
    locale: "id_ID",
  },
};

import type { PublicStatus } from '@/types/map';

async function getInitialFilters(searchParams: Promise<{ status?: string; province?: string }>) {
  const params = await searchParams;
  const validStatuses: PublicStatus[] = ['DILAPORKAN_BELUM_MENERIMA_BANTUAN', 'AKSES_TERISOLIR', 'BELUM_TERVERIFIKASI'];
  const status = params.status && validStatuses.includes(params.status as PublicStatus) 
    ? (params.status as PublicStatus) 
    : undefined;
  return {
    status,
    provinceCode: params.province,
  };
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ status?: string; province?: string }> }) {
  const [regions, initialFilters] = await Promise.all([
    getMapRegions(),
    getInitialFilters(searchParams),
  ]);

  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="map-heading">
        <div className="container-main">
          <header className="mb-8">
            <h1 id="map-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-3">
              Peta Nasional Bencana
            </h1>
            <p className="text-secondary-text text-lg max-w-2xl">
              Peta interaktif menampilkan sebaran bencana, status akses bantuan per wilayah,
              dan detail statistik dengan sumber terverifikasi. Gunakan filter untuk menyaring tampilan.
            </p>
          </header>

          <Card className="mb-8">
            <CardContent className="p-0">
              <DisasterMapClient initialRegions={regions} initialFilters={initialFilters} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="font-display font-semibold text-lg text-primary mb-4">Legenda & Attribution</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-neutral-bg border border-status-neutral-text" aria-hidden="true" />
                  <span className="text-sm text-secondary-text">Tidak ada laporan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-warning-bg border border-status-warning-text" aria-hidden="true" />
                  <span className="text-sm text-secondary-text">Dilaporkan belum menerima bantuan</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-danger-bg border border-status-danger-text" aria-hidden="true" />
                  <span className="text-sm text-secondary-text">Akses terisolir</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-neutral-bg border border-status-neutral-text" aria-hidden="true" />
                  <span className="text-sm text-secondary-text">Belum terverifikasi</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 text-sm text-secondary-text">
                <p className="mb-2"><strong>Sumber Data Geometri:</strong> Data administratif Indonesia dari Badan Informasi Geospasial (BIG) / Ina-GEO.</p>
                <p className="mb-2"><strong>Sumber Data Bencana:</strong> BNPB, BPBD provinsi/kabupaten, media terpercaya, penelitian akademis.</p>
                <p><strong>Lisensi:</strong> Data geometri administratif untuk kepentingan publik. Data bencana mengikuti lisensi masing-masing sumber.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}