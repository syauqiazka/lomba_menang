import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Metodologi | Transparansi Bantuan Bencana",
  description:
    "Metodologi pengumpulan, validasi, dan penyajian data bencana serta bantuan: telemetri realtime, standar bukti, kategori sumber, dan keterbatasan data.",
  openGraph: {
    title: "Metodologi | Transparansi Bantuan Bencana",
    description: "Metodologi pengumpulan, validasi, dan penyajian data bencana dan bantuan.",
    type: "website",
    locale: "id_ID",
  },
};

const liveTelemetrySources = [
  {
    name: "BMKG InaTEWS & TEWS",
    scope: "Gempabumi realtime (live30event.xml & lastQL.json), MMI dirasakan, Shakemap, dan peringatan cuaca CAP 1.2.",
  },
  {
    name: "PVMBG MAGMA Indonesia",
    scope: "Status tingkat aktivitas gunung api Level II–IV (Waspada, Siaga, Awas) serta status peringatan VONA.",
  },
  {
    name: "BNPB Geoportal & inaRISK",
    scope: "Kejadian bencana mingguan nasional, dampak Sumatera & Flores NTT, serta layer indeks bahaya multi-ancaman.",
  },
  {
    name: "SITABA Kementerian PU",
    scope: "Titik koordinat jalan dan jembatan putus akses beserta laporan penyebab dan kerusakan infrastruktur.",
  },
  {
    name: "NASA FIRMS & RainViewer",
    scope: "Deteksi titik panas karhutla satelit (VIIRS NOAA-20 & MODIS) dan sapuan radar presipitasi berkala.",
  },
  {
    name: "USGS & GDACS (UN/EC)",
    scope: "Pembanding seismik global M ≥ 4.0 dan peringatan bencana internasional untuk wilayah Indonesia.",
  },
];

export default function MethodologyPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="methodology-heading">
        <div className="container-main max-w-4xl">
          <header className="mb-12 text-center">
            <h1 id="methodology-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-4">
              Metodologi
            </h1>
            <p className="text-secondary-text text-lg leading-relaxed">
              Pedoman standar kami dalam mengumpulkan, memvalidasi, memproses, dan menyajikan data bencana
              serta informasi distribusi bantuan. Transparansi metodologi memastikan kejelasan sumber dan akuntabilitas.
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
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">Bukti Terlebih Dahulu (Evidence-First)</h3>
                  <p className="text-secondary-text text-sm leading-relaxed">
                    Setiap klaim statistik dan status wilayah harus didukung oleh sumber yang dapat diverifikasi.
                    Tidak ada angka yang ditampilkan tanpa jejak sumber dan tanggal data.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">Transparansi Ketidakpastian</h3>
                  <p className="text-secondary-text text-sm leading-relaxed">
                    Ketidakpastian data (data belum lengkap, perbedaan antar sumber, keterlambatan pelaporan lapangan)
                    ditampilkan secara eksplisit, bukan disembunyikan atau diinterpolasi.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">Privasi &amp; Martabat</h3>
                  <p className="text-secondary-text text-sm leading-relaxed">
                    Mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Platform tidak menampilkan
                    identitas pribadi korban, lokasi rumah individu, atau dokumentasi sensitif.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">Non-Partisan &amp; Non-Komersial</h3>
                  <p className="text-secondary-text text-sm leading-relaxed">
                    Tidak mengumpulkan donasi, tidak menampilkan rekening bank, dan tidak mengintegrasikan pembayaran.
                    Platform hanya menyajikan informasi publik dan mengarahkan ke kanal resmi.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Multi-Source Data Streams */}
          <section aria-labelledby="streams-heading" className="mb-16">
            <h2 id="streams-heading" className="font-display font-semibold text-2xl text-primary mb-4">
              Aliran Data Multi-Sumber (Realtime &amp; Terverifikasi)
            </h2>
            <p className="text-secondary-text mb-6 text-sm leading-relaxed">
              Peta Nasional dan Analisis Tren memadukan telemetri sensor resmi secara langsung (dengan cadangan
              snapshot lokal bila server eksternal sedang tidak terjangkau) serta basis data dampak terkurasi.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {liveTelemetrySources.map((item) => (
                <Card key={item.name}>
                  <CardContent>
                    <h3 className="font-display font-semibold text-base text-primary mb-1.5">{item.name}</h3>
                    <p className="text-secondary-text text-sm leading-relaxed">{item.scope}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Source Categories */}
          <section aria-labelledby="sources-heading" className="mb-16">
            <h2 id="sources-heading" className="font-display font-semibold text-2xl text-primary mb-4">
              Kategori Sumber Data
            </h2>
            <p className="text-secondary-text mb-6">
              Setiap sumber diklasifikasikan untuk membantu pengguna menilai tingkat otoritas dan karakter informasi.
            </p>
            <div className="space-y-4">
              {[
                {
                  category: "OFFICIAL",
                  label: "Resmi",
                  description:
                    "Publikasi instansi pemerintahan dan lembaga teknis berwenang: BNPB, BPBD, BMKG, PVMBG, Kementerian PU, BIG, serta badan PBB/NASA.",
                  examples: "Feed BMKG InaTEWS, lapisan spasial BNPB Geoportal, data jalan putus SITABA PU, batas wilayah BIG.",
                  badge: "safe" as const,
                },
                {
                  category: "MEDIA",
                  label: "Media",
                  description:
                    "Liputan jurnalistik dari media nasional maupun lokal terpercaya dengan standar verifikasi redaksi.",
                  examples: "Investigasi lapangan mengenai kendala distribusi bantuan atau kondisi pengungsian di daerah terpencil.",
                  badge: "warning" as const,
                },
                {
                  category: "RESEARCH",
                  label: "Penelitian",
                  description:
                    "Studi akademis, laporan organisasi kemanusiaan internasional, dan kajian teknis kebencanaan independen.",
                  examples: "Laporan situasi OCHA/GDACS, kajian BRIN, serta evaluasi respons kemanusiaan PMI.",
                  badge: "neutral" as const,
                },
                {
                  category: "EDITORIAL",
                  label: "Editorial",
                  description:
                    "Sintesis dan dokumentasi konteks yang disusun tim platform berdasarkan sumber-sumber di atas. Dibedakan jelas dari data mentah.",
                  examples: "Ringkasan kronologi studi kasus dan halaman metodologi ini.",
                  badge: "default" as const,
                },
              ].map((item) => (
                <Card key={item.category}>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <Badge variant={item.badge} className="flex-shrink-0 mt-0.5 text-sm px-3 py-1">
                        {item.label}
                      </Badge>
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary">
                          {item.label} ({item.category})
                        </h3>
                        <p className="text-secondary-text text-sm mt-1 leading-relaxed">{item.description}</p>
                        <p className="text-secondary-text text-xs mt-2">
                          <strong>Contoh:</strong> {item.examples}
                        </p>
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
              Proses Pengumpulan &amp; Validasi
            </h2>
            <div className="space-y-4">
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">1. Identifikasi Sumber Primer</h3>
                  <p className="text-secondary-text text-sm mb-3 leading-relaxed">
                    Memetakan kanal resmi (BNPB, BPBD provinsi/kabupaten, BMKG, PVMBG, Kementerian PU, BIG) dan
                    feed pemantauan terbuka yang memiliki mandat pencatatan resmi.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text text-sm space-y-1">
                    <li>Integrasi langsung endpoint JSON, XML, CAP 1.2, CSV satelit, dan layanan REST ArcGIS resmi.</li>
                    <li>Penyimpanan snapshot berkala sebagai cadangan saat layanan eksternal mengalami gangguan.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">2. Ekstraksi &amp; Normalisasi</h3>
                  <p className="text-secondary-text text-sm mb-3 leading-relaxed">
                    Data dari berbagai instansi dinormalisasi ke skema standar agar dapat dibandingkan antar wilayah dan periode.
                  </p>
                  <ul className="list-disc list-inside text-secondary-text text-sm space-y-1">
                    <li>Kode wilayah administratif dinormalisasi ke standar 4-digit BIG/Kemendagri (misalnya <code className="font-mono text-xs">5307</code> atau <code className="font-mono text-xs">53.07</code> untuk Kabupaten Sikka).</li>
                    <li>Tanggal publikasi sumber, tanggal akses, dan tanggal pengamatan (<em>as-of date</em>) dicatat terpisah.</li>
                    <li>Deduplikasi kejadian seismik dilakukan antara BMKG InaTEWS, USGS, dan GDACS agar tidak terjadi penghitungan ganda.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">3. Penetapan Status Wilayah</h3>
                  <p className="text-secondary-text text-sm mb-3 leading-relaxed">
                    Status wilayah pada peta dan studi kasus ditentukan oleh aturan berbasis bukti:
                  </p>
                  <ul className="list-disc list-inside text-secondary-text text-sm space-y-1">
                    <li><strong>Akses terisolir:</strong> Terdapat bukti resmi jalan atau jembatan putus akses (SITABA Kementerian PU / PERB BNPB / Pusdalops).</li>
                    <li><strong>Dilaporkan belum menerima bantuan:</strong> Terdapat gap usulan vs realisasi hunian/bantuan (huntap/huntara/DTH) atau kebutuhan pengungsi aktif pada laporan resmi/terverifikasi.</li>
                    <li><strong>Belum terverifikasi:</strong> Laporan awal dampak tercatat namun verifikasi lapangan atau pencatatan rincian masih berjalan.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-2">4. Jejak Audit &amp; Pembaruan</h3>
                  <p className="text-secondary-text text-sm leading-relaxed">
                    Setiap batch impor memiliki pengenal <code className="font-mono text-xs">importBatchId</code> di halaman{" "}
                    <a href="/sumber" className="underline text-primary hover:text-black">Sumber Data</a> untuk
                    memudahkan pelacakan asal data dan pembaruan berkala.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Geographic Data */}
          <section aria-labelledby="geo-heading" className="mb-16">
            <h2 id="geo-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Data Geografis &amp; Administratif
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Kode Wilayah Administratif</h3>
                  <p className="text-secondary-text text-sm mb-3 leading-relaxed">
                    Menggunakan kode resmi Badan Informasi Geospasial (BIG) dan Permendagri (38 provinsi dan 514 kabupaten/kota):
                  </p>
                  <ul className="list-disc list-inside text-secondary-text text-sm space-y-1">
                    <li>Provinsi: 2 digit (contoh: <code className="font-mono text-xs">53</code> = NTT, <code className="font-mono text-xs">11</code> = Aceh)</li>
                    <li>Kabupaten/Kota: 4 digit (contoh: <code className="font-mono text-xs">5307</code> / <code className="font-mono text-xs">53.07</code> = Sikka)</li>
                    <li>Kecamatan &amp; Desa: 6 hingga 10 digit untuk referensi titik infrastruktur</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="font-display font-semibold text-lg text-primary mb-3">Arsitektur Geometri Peta</h3>
                  <p className="text-secondary-text text-sm mb-3 leading-relaxed">
                    Batas administratif disederhanakan agar responsif di perangkat seluler dan tetap akurat untuk analisis tingkat kab/kota:
                  </p>
                  <ul className="list-disc list-inside text-secondary-text text-sm space-y-1">
                    <li>38 provinsi dimuat langsung pada tampilan nasional</li>
                    <li>Batas 514 kabupaten/kota dimuat <em>on-demand</em> per provinsi saat diklik atau dipilih</li>
                    <li>Tersedia mode teks aksesibilitas bagi perangkat tanpa dukungan WebGL</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Limitations */}
          <section aria-labelledby="limitations-heading" className="mb-16">
            <h2 id="limitations-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Keterbatasan &amp; Kekurangan Diketahui
            </h2>
            <div className="space-y-3">
              {[
                "Telemetri sensor (gempabumi BMKG InaTEWS, peringatan cuaca CAP, status gunung api MAGMA, dan titik panas satelit) berjalan mendekati waktu nyata, tetapi pelaporan dampak korban, kerusakan rumah, dan distribusi bantuan lapangan BNPB/BPBD tetap mengalami jeda verifikasi (H+1 hingga H+7).",
                "Wilayah terpencil (kepulauan kecil, pegunungan, dan daerah dengan akses komunikasi terputus) lebih lambat terdata dalam laporan resmi.",
                "Definisi dan satuan bantuan (logistik darurat, DTH, huntara, huntap) bervariasi antar instansi dan fase respons.",
                "Pengaduan masyarakat langsung belum dibuka pada rilis saat ini untuk menjaga standar verifikasi multi-sumber dan mencegah informasi palsu.",
                "Cakupan studi kasus mendalam saat ini berfokus pada dua kejadian rujukan utama (Aceh dan Flores NTT 2026).",
              ].map((limitation, index) => (
                <Card key={index} className="border-border-inner">
                  <CardContent>
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-status-warning-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-secondary-text text-sm leading-relaxed">{limitation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/sumber">Lihat Daftar Sumber Lengkap →</LinkButton>
            <LinkButton href="/peta">Buka Peta Nasional →</LinkButton>
            <LinkButton variant="secondary" href="/kasus">Lihat Studi Kasus →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
