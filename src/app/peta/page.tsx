import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

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

export default function MapPage() {
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

          {/* Map Container - Placeholder for Stage 1 MVP */}
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="aspect-video bg-secondary-background relative" style={{ minHeight: "400px" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <svg className="w-16 h-16 text-secondary-text mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="font-display font-semibold text-xl text-primary mb-2">Peta Interaktif (Stage 1 MVP)</h3>
                  <p className="text-secondary-text text-sm max-w-md mb-6">
                    Peta menggunakan MapLibre GL JS dengan GeoJSON provinsi dan kabupaten/kota Indonesia.
                    Tidak menggunakan tile server eksternal. Data geometri dimuat secara progresif.
                  </p>
                  <div className="space-y-2 text-sm text-secondary-text max-w-md">
                    <p>• 38 provinsi & 514 kabupaten/kota</p>
                    <p>• Warna status: aman, waspada, bahaya, netral</p>
                    <p>• Alternatif teks untuk aksesibilitas & no-WebGL</p>
                    <p>• Attribution data geometri & sumber bencana</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters & Controls */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label htmlFor="status-filter" className="block text-sm font-medium text-primary mb-1">
                    Filter Status
                  </label>
                  <select
                    id="status-filter"
                    className="input-field"
                    aria-label="Filter status bantuan"
                  >
                    <option value="">Semua Status</option>
                    <option value="Dilaporkan belum menerima bantuan">Dilaporkan belum menerima bantuan</option>
                    <option value="Akses terisolir">Akses terisolir</option>
                    <option value="Belum terverifikasi">Belum terverifikasi</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="province-filter" className="block text-sm font-medium text-primary mb-1">
                    Filter Provinsi
                  </label>
                  <select
                    id="province-filter"
                    className="input-field"
                    aria-label="Filter provinsi"
                  >
                    <option value="">Semua Provinsi</option>
                    <option value="aceh">Aceh</option>
                    <option value="sumatera_utara">Sumatera Utara</option>
                    <option value="sumatera_barat">Sumatera Barat</option>
                    <option value="riau">Riau</option>
                    <option value="kepulauan_riau">Kepulauan Riau</option>
                    <option value="jambi">Jambi</option>
                    <option value="sumatera_selatan">Sumatera Selatan</option>
                    <option value="bengkulu">Bengkulu</option>
                    <option value="lampung">Lampung</option>
                    <option value="bangka_belitung">Bangka Belitung</option>
                    <option value="kepulauan_bangka_belitung">Kepulauan Bangka Belitung</option>
                    <option value="dk_jakarta">DKI Jakarta</option>
                    <option value="jabar">Jawa Barat</option>
                    <option value="jateng">Jawa Tengah</option>
                    <option value="di_yogyakarta">DI Yogyakarta</option>
                    <option value="jatim">Jawa Timur</option>
                    <option value="banten">Banten</option>
                    <option value="bali">Bali</option>
                    <option value="ntb">Nusa Tenggara Barat</option>
                    <option value="ntt">Nusa Tenggara Timur</option>
                    <option value="kalbar">Kalimantan Barat</option>
                    <option value="kalteng">Kalimantan Tengah</option>
                    <option value="kalsel">Kalimantan Selatan</option>
                    <option value="kaltim">Kalimantan Timur</option>
                    <option value="kaltara">Kalimantan Utara</option>
                    <option value="sulut">Sulawesi Utara</option>
                    <option value="sulteng">Sulawesi Tengah</option>
                    <option value="sulsel">Sulawesi Selatan</option>
                    <option value="sultra">Sulawesi Tenggara</option>
                    <option value="gorontalo">Gorontalo</option>
                    <option value="sulbar">Sulawesi Barat</option>
                    <option value="maluku">Maluku</option>
                    <option value="maluku_utara">Maluku Utara</option>
                    <option value="papua_barat">Papua Barat</option>
                    <option value="papua">Papua</option>
                    <option value="papua_tengah">Papua Tengah</option>
                    <option value="papua_pegunungan">Papua Pegunungan</option>
                    <option value="papua_selatan">Papua Selatan</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="secondary" className="w-full md:w-auto">
                    Reset Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Region List Alternative - Text-based fallback */}
          <section aria-labelledby="region-list-heading" className="mb-8">
            <h2 id="region-list-heading" className="font-display font-semibold text-xl text-primary mb-4">
              Daftar Wilayah (Alternatif Teks)
            </h2>
            <p className="text-secondary-text text-sm mb-6">
              Alternatif berbasis teks untuk aksesibilitas, no-WebGL, dan perangkat dengan keterbatasan bandwidth.
              Menampilkan wilayah, status, statistik relevan, tanggal data, dan sumber.
            </p>

            <EmptyState
              title="Data wilayah belum tersedia"
              description="Data status bantuan per wilayah sedang dalam proses pengumpulan dan validasi dari sumber resmi. Silakan kunjungi halaman Sumber Data untuk melihat status pengumpulan data."
              action={{
                label: "Lihat Sumber Data",
                href: "/sumber",
                variant: "primary",
              }}
            />
          </section>

          {/* Legend & Attribution */}
          <Card>
            <CardContent>
              <h3 className="font-display font-semibold text-lg text-primary mb-4">Legenda & Attribution</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-status-safe-bg border border-status-safe-text" aria-hidden="true" />
                  <span className="text-sm text-secondary-text">Aman / Tidak ada laporan</span>
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