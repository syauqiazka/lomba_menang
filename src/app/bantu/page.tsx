import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Saluran Bantuan Resmi | Transparansi Bantuan Bencana",
  description: "Daftar saluran bantuan resmi terverifikasi: BNPB, PMI, Baznas, dan instansi pemerintah. Platform ini tidak mengumpulkan donasi.",
  openGraph: {
    title: "Saluran Bantuan Resmi | Transparansi Bantuan Bencana",
    description: "Link ke saluran bantuan resmi terverifikasi: BNPB, PMI, Baznas, dan instansi pemerintah.",
    type: "website",
    locale: "id_ID",
  },
};

const officialChannels = [
  {
    name: "BNPB (Badan Nasional Penanggulangan Bencana)",
    description: "Instansi utama penanggulangan bencana nasional. Koordinasi respons darurat, data bencana, dan saluran bantuan resmi pusat.",
    url: "https://bnpb.go.id",
    verified: true,
    category: "Pemerintah Pusat",
    services: ["Koordinasi bencana nasional", "Data bencana real-time", "Posko bantuan terpusat", "Informasi evakuasi"],
  },
  {
    name: "PMI (Palang Merah Indonesia)",
    description: "Organisasi kemanusiaan nasional dengan jaringan cabang di seluruh Indonesia. Penyaluran bantuan logistik, kesehatan, dan relawan.",
    url: "https://pmi.or.id",
    verified: true,
    category: "Organisasi Kemanusiaan",
    services: ["Bantuan logistik (tenda, makanan, air)", "Layanan kesehatan darurat", "Relawan & donor darah", "Restoring Family Links"],
  },
  {
    name: "Baznas (Badan Amil Zakat Nasional)",
    description: "Badan pengelola zakat nasional resmi. Program bantuan bencana melalui dana zakat, infak, sedekah (ZIS).",
    url: "https://baznas.go.id",
    verified: true,
    category: "Lembaga Keagamaan",
    services: ["Bantuan darurat ZIS", "Program rehabilitasi", "Pemberdayaan ekonomi pasca-bencana", "Laporan keuangan transparan"],
  },
  {
    name: "BPBD Provinsi & Kabupaten/Kota",
    description: "Badan Penanggulangan Bencana Daerah di tingkat provinsi dan kabupaten/kota. Titik koordinasi bantuan lokal terdekat.",
    url: "https://bpbd.go.id",
    verified: true,
    category: "Pemerintah Daerah",
    services: ["Koordinasi bencana daerah", "Data kerusakan lokal", "Posko kecamatan/desa", "Distribusi bantuan daerah"],
  },
  {
    name: "Kemensos (Kementerian Sosial RI)",
    description: "Kementerian yang menangani rehabilitasi sosial, bantuan sosial (bansos), dan perlindungan rentan pasca-bencana.",
    url: "https://kemensos.go.id",
    verified: true,
    category: "Pemerintah Pusat",
    services: ["Bantuan sosial tunai (BST)", "Rehabilitasi sosial", "Perlindungan anak & lansia", "Data terduga (DTKS)"],
  },
  {
    name: "Pusdalops PB (Pusat Pengendalian Operasional Penanggulangan Bencana)",
    description: "Pusat informasi dan koordinasi operasional bencana 24 jam di bawah BNPB. Nomor darurat dan laporan bencana.",
    url: "https://bnpb.go.id/pusdalops",
    verified: true,
    category: "Layanan Darurat",
    services: ["Nomor darurat 117 / 021-80820200", "Laporan bencana real-time", "Koordinasi SAR", "Early warning system"],
  },
];

const importantNoticePoints = [
  <>Kami <strong>tidak menerima uang</strong> dalam bentuk apa pun (transfer bank, e-wallet, kripto, dll.).</>,
  <>Kami <strong>tidak mempublikasikan nomor rekening bank</strong> pribadi atau organisasi.</>,
  <>Kami <strong>tidak menyediakan dompet penggalangan dana</strong> (fundraising wallet) atau QRIS donasi.</>,
  <>Kami <strong>tidak mengintegrasikan payment gateway</strong> atau sistem pembayaran apa pun.</>,
  <>Semua tautan di halaman ini mengarah ke <strong>situs web resmi instansi</strong> yang terverifikasi.</>,
  <>Jika Anda menemukan pihak yang mengatasnamakan platform ini meminta donasi, <strong>itu adalah penipuan</strong>.</>,
];

export default function HelpPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="help-heading">
        <div className="container-main max-w-4xl">
          <header className="mb-12 text-center">
            <h1 id="help-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-4">
              Saluran Bantuan Resmi
            </h1>
            <p className="text-secondary-text text-lg">
              Daftar instansi dan organisasi resmi yang menangani bantuan bencana di Indonesia.
              Semua tautan diverifikasi mengarah ke situs web resmi.
            </p>
          </header>

          {/* Important Notice */}
          <Card className="mb-10 border-status-danger-bg bg-status-danger-bg/10">
            <CardContent>
              <h2 className="font-display font-semibold text-lg text-status-danger-text mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Peringatan Penting: Platform Ini Tidak Mengumpulkan Donasi
              </h2>
              <ul className="list-disc list-inside text-secondary-text space-y-2">
                {importantNoticePoints.map((point, index) => (
                  <li key={index} className="leading-relaxed">{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Official Channels */}
          <section aria-labelledby="channels-heading" className="mb-12">
            <h2 id="channels-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Instansi & Organisasi Resmi
            </h2>
            <div className="space-y-4">
              {officialChannels.map((channel, index) => (
                <Card key={index} className="hover:border-primary transition-colors">
                  <CardContent className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-display font-semibold text-lg text-primary">{channel.name}</h3>
                        {channel.verified && (
                          <Badge variant="safe" className="flex-shrink-0">
                            Terverifikasi
                          </Badge>
                        )}
                      </div>
                      <p className="text-secondary-text text-sm mb-3">{channel.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="neutral" className="text-xs">{channel.category}</Badge>
                        {channel.services.slice(0, 3).map((service, si) => (
                          <Badge key={si} variant="default" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {channel.services.length > 3 && (
                          <Badge variant="default" className="text-xs">
                            +{channel.services.length - 3} layanan lain
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 md:w-48">
                      <LinkButton size="lg" variant="primary" href={channel.url} className="w-full" target="_blank" rel="noopener noreferrer">
                        Kunjungi Situs Resmi
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </LinkButton>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Emergency Numbers */}
          <section aria-labelledby="emergency-heading" className="mb-12">
            <h2 id="emergency-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Nomor Darurat Penting
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Darurat BNPB / Pusdalops", number: "117", description: "Layanan 24 jam, gratis" },
                { label: "Darurat BNPB (Darurat)", number: "021-80820200", description: "Nomor darurat alternatif" },
                { label: "Ambulans / Kesehatan", number: "119", description: "Layanan kesehatan darurat" },
                { label: "Polisi", number: "110", description: "Keamanan & ketertiban" },
                { label: "Pemadam Kebakaran", number: "113", description: "Kebakaran & penyelamatan" },
                { label: "SAR Basarnas", number: "115 / 021-65834900", description: "Search and Rescue" },
              ].map((item, index) => (
                <Card key={index} className="text-center p-6">
                  <p className="text-secondary-text text-sm mb-1">{item.label}</p>
                  <p className="font-display font-bold text-3xl text-primary font-mono">
                    <a href={`tel:${item.number.replace(/\D/g, "")}`} className="hover:underline">{item.number}</a>
                  </p>
                  <p className="text-secondary-text text-xs mt-1">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Guidance */}
          <section aria-labelledby="guidance-heading" className="mb-12">
            <h2 id="guidance-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Panduan Menyalurkan Bantuan
            </h2>
            <div className="space-y-6">
              {[
                {
                  title: "1. Verifikasi Kebutuhan",
                  content: "Sebelum menyumbangkan, cek kebutuhan aktual via laporan BNPB/BPBD atau organisasi kemanusiaan terverifikasi. Hindari mengirim barang yang tidak dibutuhkan (baju bekas tidak layak pakai, makanan kedaluwarsa).",
                },
                {
                  title: "2. Salurkan Lewat Resmi",
                  content: "Gunakan rekening resmi instansi (BNPB, PMI, Baznas, Kemensos) yang terpublikasi di website masing-masing. Jangan transfer ke rekening pribadi yang mengklaim sebagai 'wakil' instansi.",
                },
                {
                  title: "3. Catat Bukti Transfer",
                  content: "Simpan bukti transfer dan konfirmasikan ke instansi penerima. Minta nomor registrasi donasi untuk pelacakan transparansi.",
                },
                {
                  title: "4. Bantuan Barang (In-Kind)",
                  content: "Koordinasikan dengan BPBD setempat atau PMI cabang untuk logistik pengiriman. Barang harus terkemas rapi, berlabel jelas, dan sesuai kebutuhan prioritas (tenda, air, makanan siap saji, obat, alat kebersihan).",
                },
                {
                  title: "5. Relawan",
                  content: "Daftar melalui PMI, BNPB, atau organisasi kemanusiaan terdaftar. Jangan datang sendiri ke lokasi bencana tanpa koordinasi — berisiko menambah beban logistik dan keamanan.",
                },
              ].map((item, index) => (
                <Card key={index}>
                  <CardContent>
                    <h3 className="font-semibold text-primary mb-2">{item.title}</h3>
                    <p className="text-secondary-text">{item.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/peta">← Lihat Peta Bencana</LinkButton>
            <LinkButton variant="secondary" href="/kasus/ntt-2026">Lihat Kasus NTT 2026 →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
