import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Metodologi | Transparansi Bantuan Bencana",
  description: "Metodologi pengumpulan, validasi, dan penyajian data bencana dan bantuan. Standar bukti, kategori sumber, dan keterbatasan data.",
  openGraph: {
    title: "Metodologi | Transparansi Bantuan Bencana",
    description: "Metodologi pengumpulan, validasi, dan penyajian data bencana dan bantuan.",
    type: "website",
    locale: "id_ID",
  },
};

export default function MethodologyPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="methodology-heading">
        <div className="container-main max-w-4xl">
          <header className="mb-12 text-center">
            <h1 id="methodology-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-4">
              Metodologi
            </h1>
            <p className="text-secondary-text text-lg">
              Pedoman standar kami dalam mengumpulkan, memvalidasi, memproses, dan menyajikan data bencana
              serta informasi distribusi bantuan. Transparansi metodologi memastikan kepercayaan dan akuntabilitas.
            </p>
          </header>

          {/* Principles */}
          <section aria-labelledby="principles-heading" className="mb-16">
            <h2 id="principles-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Prinsip Dasar
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Bukti Terlebih Dahulu (Evidence-First)</h3>
                  <p className="text-secondary-text">
                    Setiap klaim statistik dan status wilayah harus didukung oleh sumber yang dapat diverifikasi.
                    Tidak ada angka yang ditampilkan tanpa jejak sumber (source traceability).
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Transparansi Ketidakpastian</h3>
                  <p className="text-secondary-text">
                    Ketidakpastian data (data hilang, konflik sumber, keterlambatan pelaporan) ditampilkan secara eksplisit,
                    bukan disembunyikan atau diinterpolasi.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Privasi & Martabat</h3>
                  <p className="text-secondary-text">
                    Mengikuti UU No. 27 Tahun 2022 (PDP). Tidak menampilkan lokasi eksak korban, identitas pribadi,
                    atau foto anak-anak. Agregasi minimal tingkat desa/dusun.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Non-Partisan & Non-Komersial</h3>
                  <p className="text-secondary-text">
                    Tidak mengumpulkan donasi, tidak menampilkan rekening bank, tidak memiliki afiliasi politik.
                    Hanya menyajikan informasi untuk kepentingan publik.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Source Categories */}
          <section aria-labelledby="sources-heading" className="mb-16">
            <h2 id="sources-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Kategori Sumber Data
            </h2>
            <p className="text-secondary-text mb-8">
              Setiap sumber diklasifikasikan untuk membantu pengguna menilai tingkat kepercayaan dan karakter informasi.
            </p>
            <div className="space-y-4">
              {[
                {
                  category: "OFFICIAL",
                  label: "Resmi",
                  description: "Publikasi instansi pemerintahan berwenang: BNPB, BPBD, BMKG, BIG, Kementerian/Lembaga, Pemerintah Daerah.",
                  examples: "Laporan situasi BNPB, Keputusan Gubernur status darurat, Data geometri administratif BIG, Statistik BPBD.",
                  badge: "safe" as const,
                },
                {
                  category: "MEDIA",
                  label: "Media",
                  description: "Liputan jurnalistik dari media nasional/terlokal terpercaya dengan standar verifikasi editorial.",
                  examples: "Investigasi Tempo, Kompas, BBC Indonesia, Media lokal NTT (Pos Kupang, Flores Pos).",
                  badge: "warning" as const,
                },
                {
                  category: "RESEARCH",
                  label: "Penelitian",
                  description: "Studi akademis, laporan organisasi kemanusiaan internasional, kajian teknis independen.",
                  examples: "Laporan OCHA/UN, Studi LIPI/BRIN, Paper jurnal terindeks, Laporan evaluasi PMI/ACT.",
                  badge: "neutral" as const,
                },
                {
                  category: "EDITORIAL",
                  label: "Editorial",
                  description: "Analisis, sintesis, dan konteks yang disusun tim platform berdasarkan data dari kategori di atas. Dibedakan jelas dari data mentah.",
                  examples: "Ringkasan kasus NTT 2026, Analisis tren bencana tahunan, Narasi metodologi halaman ini.",
                  badge: "default" as const,
                },
              ].map((item, index) => (
                <Card key={index}>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Badge variant={item.badge} className="flex-shrink-0 mt-0.5 text-sm px-3 py-1">
                        {item.label}
                      </Badge>
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary">{item.label} ({item.category})</h3>
                        <p className="text-secondary-text text-sm mt-1">{item.description}</p>
                        <p className="text-secondary-text text-sm mt-2"><strong>Contoh:</strong> {item.examples}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Data Collection */}
          <section aria-labelledby="collection-heading" className="mb-16">
            <h2 id="collection-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Proses Pengumpulan Data
            </h2>
            <div className="space-y-6">
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">1. Identifikasi Sumber Primer</h3>
                  <p className="text-secondary-text mb-3">
                    Memetakan instansi resmi (BNPB, BPBD provinsi/kabupaten, BMKG, BIG), media bersindikasi, dan organisasi kemanusiaan
                    yang memiliki mandat atau akses lapangan.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li>Monitoring website resmi, saluran media sosial terverifikasi, dan feed RSS instansi.</li>
                    <li>Langganan media monitoring untuk liputan bencana.</li>
                    <li>Jaringan organisasi kemanusiaan untuk akses laporan lapangan.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">2. Ekstraksi & Normalisasi</h3>
                  <p className="text-secondary-text mb-3">
                    Data diekstrak dari PDF, HTML, spreadsheet, dan API, lalu dinormalisasi ke skema internal.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li>Kode wilayah administratif distandarisasi ke kode BIG (Permendagri 72/2019).</li>
                    <li>Tanggal publikasi, tanggal akses, dan tanggal observasi data (as-of date) dicatat terpisah.</li>
                    <li>Nilai statistik disimpan sebagai string asli + unit untuk menghindari interpretasi.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">3. Validasi & Penyilangan (Cross-Check)</h3>
                  <p className="text-secondary-text mb-3">
                    Setiap titik data diverifikasi melawan minimal satu sumber independen lain.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li><strong>Konfirmasi Multi-Sumber:</strong> Data BNPB disilangkan dengan BPBD kabupaten dan media.</li>
                    <li><strong>Penanganan Konflik:</strong> Nilai berbeda antar sumber → dicatat sebagai diskrepansi, tidak dipilih yang &ldquo;paling dramatis&rdquo;.</li>
                    <li><strong>Penetapan Status:</strong> Status &ldquo;Dilaporkan belum menerima bantuan&rdquo; butuh bukti laporan media/organisasi terverifikasi. &ldquo;Akses terisolir&rdquo; butuh bukti resmi infrastruktur. &ldquo;Belum terverifikasi&rdquo; untuk laporan awal tunggal.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">4. Versioning & Koreksi</h3>
                  <p className="text-secondary-text mb-3">
                    Data bersifat living document. Koreksi tidak menghapus versi lama.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li>Setiap update mencatat: nilai lama, nilai baru, sumber koreksi, tanggal, alasan.</li>
                    <li>Import batch ID melacak provenansi seluruh rangkaian impor.</li>
                    <li>Riwayat perubahan tersedia di halaman Sumber untuk setiap statistik.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Geographic Data */}
          <section aria-labelledby="geo-heading" className="mb-16">
            <h2 id="geo-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Data Geografis & Administratif
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Kode Wilayah Administratif</h3>
                  <p className="text-secondary-text mb-3">
                    Menggunakan kode resmi dari Badan Informasi Geospasial (BIG) sesuai Permendagri No. 72 Tahun 2019.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li>Provinsi: 2 digit (contoh: 53 = NTT)</li>
                    <li>Kabupaten/Kota: 4 digit dengan titik (contoh: 53.07 = Sikka)</li>
                    <li>Kecamatan: 6 digit (contoh: 53.07.01)</li>
                    <li>Desa/Kelurahan: 10 digit</li>
                  </ul>
                  <p className="text-secondary-text text-sm mt-3">
                    <strong>Validasi:</strong> Inventaris 38 provinsi & 514 kabupaten/kota diverifikasi terhadap data BIG terbaru sebelum publikasi.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Geometri Peta (Stage 1 MVP)</h3>
                  <p className="text-secondary-text mb-3">
                    GeoJSON disederhanakan (simplify) untuk performa browser.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text space-y-1">
                    <li>Provinsi: ~38 fitur, full geometry</li>
                    <li>Kabupaten/Kota: ~514 fitur, geometry disederhanakan (tolerance ~100m)</li>
                    <li>Kecamatan/Desa: TIDAK dimuat di Stage 1 (terlalu berat ~84.000 fitur)</li>
                    <li>Dimuat on-demand saat user zoom/klik kabupaten</li>
                  </ul>
                  <p className="text-secondary-text text-sm mt-3">
                    <strong>Attribution:</strong> Geometri dari BIG/Ina-GEO. Lisensi data terbuka untuk kepentingan publik.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Limitations */}
          <section aria-labelledby="limitations-heading" className="mb-16">
            <h2 id="limitations-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Keterbatasan & Kekurangan Diketahui
            </h2>
            <div className="space-y-4">
              {[
                "Data bencana real-time tidak tersedia; keterlambatan pelaporan dari lapangan ke pusat (H+1 hingga H+7).",
                "Wilayah terpencil (kepulauan kecil, pegunungan, hutan) sering tidak tercover pelaporan resmi.",
                "Definisi 'bantuan' bervariasi antar instansi (logistik, dana, personel, rehabilitasi) — tidak distandarisasi nasional.",
                "Media lokal NTT memiliki keterbatasan sumber daya untuk investigasi mendalam di semua kecamatan.",
                "Tidak ada mekanisme pengaduan masyarakat (community submissions) di MVP — direncanakan pasca-MVP dengan pre-moderasi ketat.",
                "Gempa Flores NTT 2026 adalah bencana geologis; tidak mewakili pola bencana hidrometeorologis/lingkungan.",
              ].map((limitation, index) => (
                <Card key={index} className="border-border-inner">
                  <CardContent>
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-status-warning-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-secondary-text">{limitation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/sumber">Lihat Daftar Sumber Lengkap →</LinkButton>
            <LinkButton variant="secondary" href="/kasus/ntt-2026">Terapkan ke Kasus NTT 2026 →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}