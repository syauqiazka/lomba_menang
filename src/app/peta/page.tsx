import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { getMapRegions, getAllMapRegencies, getMapSummaryCounts } from "@/lib/map-data";
import type { PublicStatus } from "@/types/map";
import { DisasterMapClient } from "./DisasterMapClient";

export const metadata: Metadata = {
  title: "Peta Nasional Bencana | Transparansi Bantuan Bencana",
  description:
    "Peta interaktif sebaran bencana dan status distribusi bantuan di seluruh Indonesia. Data bersumber dari instansi resmi dan terverifikasi.",
  openGraph: {
    title: "Peta Nasional Bencana | Transparansi Bantuan Bencana",
    description: "Peta interaktif sebaran bencana dan status distribusi bantuan di seluruh Indonesia.",
    type: "website",
    locale: "id_ID",
  },
};

async function getInitialFilters(
  searchParams: Promise<{ status?: string; province?: string; prov?: string }>
) {
  const params = await searchParams;
  const validStatuses: PublicStatus[] = [
    "DILAPORKAN_BELUM_MENERIMA_BANTUAN",
    "AKSES_TERISOLIR",
    "BELUM_TERVERIFIKASI",
  ];
  const status =
    params.status && validStatuses.includes(params.status as PublicStatus)
      ? (params.status as PublicStatus)
      : undefined;
  return {
    status,
    provinceCode: params.prov || params.province,
  };
}

async function MapPageContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; province?: string; prov?: string }>;
}) {
  const [regions, regencies, summaryCounts, initialFilters] = await Promise.all([
    getMapRegions(),
    getAllMapRegencies(),
    getMapSummaryCounts(),
    getInitialFilters(searchParams),
  ]);

  return (
    <>
      <Card className="mb-8">
        <CardContent className="p-0">
          <DisasterMapClient
            initialRegions={regions}
            initialRegencies={regencies}
            summaryCounts={summaryCounts}
            initialFilters={initialFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-display font-semibold text-lg text-primary mb-4">Legenda &amp; Atribusi</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-[#f8fafc] border border-[#64748b] flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-primary">Tidak ada laporan</span>
                </div>
                <span className="text-xs font-mono text-secondary-text">
                  {summaryCounts.statusCounts.tidakAdaLaporan} kab/kota
                </span>
              </div>
              <p className="text-xs text-secondary-text">
                Tidak tercatat pada layer kejadian atau kerusakan aktif BNPB/PU dalam snapshot 28 Nov 2026.
              </p>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-warning-bg border border-status-warning-text flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-status-warning-text">Dilaporkan belum menerima bantuan</span>
                </div>
                <span className="text-xs font-mono text-secondary-text">
                  {summaryCounts.statusCounts.belumMenerimaBantuan} kab/kota
                </span>
              </div>
              <p className="text-xs text-secondary-text">
                Usulan huntap/huntara/DTH belum sepenuhnya terealisasi atau pengungsi masih membutuhkan dukungan logistik (BNPB).
              </p>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-danger-bg border border-status-danger-text flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-status-danger-text">Akses terisolir</span>
                </div>
                <span className="text-xs font-mono text-secondary-text">
                  {summaryCounts.statusCounts.aksesTerisolir} kab/kota
                </span>
              </div>
              <p className="text-xs text-secondary-text">
                Terdapat jalan atau jembatan putus akses yang dilaporkan SITABA Kementerian PU / PERB BNPB / Pusdalops BNPB.
              </p>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-[#e2e8f0] border border-status-neutral-text flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-status-neutral-text">Belum terverifikasi</span>
                </div>
                <span className="text-xs font-mono text-secondary-text">
                  {summaryCounts.statusCounts.belumTerverifikasi} kab/kota
                </span>
              </div>
              <p className="text-xs text-secondary-text">
                Terdapat laporan awal dampak/kejadian di BNPB Geoportal dengan verifikasi lapangan atau kebutuhan bantuan masih berjalan.
              </p>
            </div>
          </div>

          <div className="mb-6 pt-4 border-t border-border space-y-4">
            <div>
              <p className="text-xs font-semibold text-primary mb-2.5">
                Titik Lokasi Kejadian &amp; Cincin Jangkauan Indikatif (Klik titik pada peta):
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-secondary-text">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#2563eb] border border-white" aria-hidden="true" />
                  Banjir (SITABA PU &amp; BNPB)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#d97706] border border-white" aria-hidden="true" />
                  Longsor &amp; Akses Putus
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#dc2626] border border-white" aria-hidden="true" />
                  Gempabumi (BMKG InaTEWS Realtime &amp; BNPB)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#7c3aed] border border-white" aria-hidden="true" />
                  Cuaca Ekstrem (BMKG Nowcast CAP &amp; RainViewer Radar)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#be123c] border border-white" aria-hidden="true" />
                  Gunung Api Aktif — Waspada/Siaga/Awas (PVMBG MAGMA)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ea580c] border border-white" aria-hidden="true" />
                  Karhutla — Titik Panas Satelit (NASA FIRMS VIIRS NOAA-20 &amp; MODIS)
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-primary mb-2">
                Standar Zona Rawan Bencana Resmi (inaRISK BNPB — <code>gis.bnpb.go.id</code>):
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-secondary-text">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-[#dc2626] border border-black/20" aria-hidden="true" />
                  Zona Rawan Tinggi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-[#facc15] border border-black/20" aria-hidden="true" />
                  Zona Rawan Sedang
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-3 rounded-sm bg-[#15803d] border border-black/20" aria-hidden="true" />
                  Zona Rawan Rendah
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4 text-sm text-secondary-text">
            <p className="mb-2">
              <strong>Peta Dasar (Basemap):</strong> OpenFreeMap &amp; OpenMapTiles (© kontributor OpenStreetMap), dilengkapi mode cadangan vektor lokal offline.
            </p>
            <p className="mb-2">
              <strong>Batas Administratif:</strong> Data administratif Indonesia resmi dari Badan Informasi Geospasial (BIG) &amp; BPS ({summaryCounts.provinceCount} provinsi, {summaryCounts.regencyCount} kabupaten/kota).
            </p>
            <p className="mb-2">
              <strong>Sumber Data Bencana Resmi:</strong> BMKG InaTEWS Realtime (<code>live30event.xml</code> &amp; <code>lastQL.json</code>), BMKG TEWS &amp; Nowcast CAP 1.2 (<code>bmkg.go.id</code>), PVMBG MAGMA Indonesia KESDM (<code>magma.esdm.go.id</code>), RainViewer Radar Presipitasi, GDACS (UN OCHA / Copernicus), NASA EOSDIS FIRMS (VIIRS NOAA-20 &amp; MODIS), USGS Earthquake Hazards Program, BNPB Geoportal (<code>gis.bnpb.go.id</code> &amp; inaRISK), dan SITABA Kementerian PU.{' '}
              <Link href="/sumber" className="text-primary underline hover:text-black">
                Telusuri semua sumber →
              </Link>
            </p>
            <p>
              <strong>Lisensi:</strong> Data geometri administratif untuk kepentingan publik. Data bencana mengikuti ketentuan dan atribusi masing-masing instansi resmi.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MapSectionSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat peta nasional dan data wilayah">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[74px] rounded-lg border border-border bg-secondary-background/60 animate-pulse" />
            ))}
          </div>
          <div className="h-[132px] rounded-lg border border-border bg-secondary-background/40 animate-pulse" />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 h-[460px] lg:h-[600px] rounded-lg border border-border bg-secondary-background/60 flex flex-col items-center justify-center p-6">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" aria-hidden="true" />
              <p className="text-sm text-secondary-text">Memuat data wilayah dan peta nasional…</p>
            </div>
            <div className="lg:col-span-4 h-[460px] lg:h-[600px] rounded-lg border border-border bg-secondary-background/40 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; province?: string; prov?: string }>;
}) {
  return (
    <MainLayout>
      <section className="py-10 md:py-14 bg-background" aria-labelledby="map-heading">
        <div className="container-main">
          <header className="mb-6">
            <h1 id="map-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-3">
              Peta Nasional Bencana
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl">
              Peta vektor lokal Indonesia dari Sabang sampai Merauke. Klik provinsi pada peta atau daftar di samping
              untuk memuat batas kabupaten/kota, memeriksa status akses bantuan, dan menelusuri sumber terverifikasi.
            </p>
          </header>

          <Suspense fallback={<MapSectionSkeleton />}>
            <MapPageContent searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </MainLayout>
  );
}
