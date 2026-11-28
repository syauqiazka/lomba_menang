import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Saluran Bantuan Resmi | Transparansi Bantuan Bencana",
  description:
    "Daftar saluran bantuan resmi terverifikasi: BNPB, Basarnas, PMI, Baznas, Kemensos, dan BMKG InaTEWS. Platform ini tidak mengumpulkan donasi.",
  openGraph: {
    title: "Saluran Bantuan Resmi | Transparansi Bantuan Bencana",
    description:
      "Tautan ke saluran bantuan resmi terverifikasi: BNPB, Basarnas, PMI, Baznas, Kemensos, dan BMKG.",
    type: "website",
    locale: "id_ID",
  },
};

const officialChannels = [
  {
    name: "BNPB & Pusdalops PB",
    description:
      "Badan Nasional Penanggulangan Bencana dan Pusat Pengendalian Operasional 24 jam. Koordinasi respons darurat nasional, data dampak resmi, dan rujukan BPBD daerah.",
    url: "https://bnpb.go.id",
    category: "Pemerintah Pusat",
    services: [
      "Koordinasi bencana nasional",
      "Call Center 117 / 021-80820200",
      "Direktori BPBD Provinsi & Kab/Kota",
      "Posko bantuan & logistik terpusat",
    ],
  },
  {
    name: "Basarnas (Badan Nasional Pencarian dan Pertolongan)",
    description:
      "Instansi pemerintah yang bertugas melaksanakan pencarian, pertolongan, dan evakuasi korban bencana alam, kecelakaan transportasi, maupun kondisi darurat.",
    url: "https://basarnas.go.id",
    category: "Layanan SAR",
    services: [
      "Pencarian & pertolongan (SAR)",
      "Nomor darurat 115",
      "Evakuasi wilayah terisolir",
      "Koordinasi tim SAR daerah",
    ],
  },
  {
    name: "PMI (Palang Merah Indonesia)",
    description:
      "Organisasi kemanusiaan nasional dengan jaringan cabang di seluruh Indonesia untuk penyaluran bantuan logistik, layanan kesehatan darurat, donor darah, dan relawan.",
    url: "https://pmi.or.id",
    category: "Organisasi Kemanusiaan",
    services: [
      "Bantuan logistik (tenda, pangan, air)",
      "Layanan kesehatan darurat",
      "Relawan & donor darah",
      "Restoring Family Links",
    ],
  },
  {
    name: "Baznas (Badan Amil Zakat Nasional)",
    description:
      "Lembaga pemerintah nonstruktural pengelola zakat, infak, dan sedekah (ZIS) nasional dengan program Baznas Tanggap Bencana dan pemulihan pasca-bencana.",
    url: "https://baznas.go.id",
    category: "Lembaga Resmi ZIS",
    services: [
      "Bantuan darurat ZIS",
      "Baznas Tanggap Bencana",
      "Program rehabilitasi & pemulihan",
      "Laporan penyaluran transparan",
    ],
  },
  {
    name: "Kemensos (Kementerian Sosial RI)",
    description:
      "Kementerian yang menangani jaminan sosial korban bencana, lumbung sosial daerah, layanan dukungan psikososial, serta perlindungan kelompok rentan.",
    url: "https://kemensos.go.id",
    category: "Pemerintah Pusat",
    services: [
      "Lumbung sosial & dapur umum (Tagana)",
      "Santunan & bantuan sosial darurat",
      "Dukungan psikososial",
      "Perlindungan anak & lansia",
    ],
  },
  {
    name: "BMKG InaTEWS (Peringatan Dini Gempa & Tsunami)",
    description:
      "Sistem peringatan dini gempabumi dan tsunami nasional resmi BMKG untuk memantau parameter gempa realtime, peta guncangan (Shakemap), dan status tsunami.",
    url: "https://inatews.bmkg.go.id",
    category: "Informasi & Peringatan Dini",
    services: [
      "Monitor gempabumi realtime",
      "Peringatan dini tsunami",
      "Peta guncangan MMI (Shakemap)",
      "Peringatan cuaca ekstrem",
    ],
  },
];

const emergencyNumbers = [
  {
    label: "Darurat BNPB / Pusdalops",
    phones: [{ display: "117", tel: "117" }, { display: "021-80820200", tel: "02180820200" }],
    description: "Layanan pengaduan & koordinasi bencana 24 jam",
  },
  {
    label: "SAR Basarnas",
    phones: [{ display: "115", tel: "115" }, { display: "021-65834900", tel: "02165834900" }],
    description: "Pencarian, pertolongan, dan evakuasi darurat",
  },
  {
    label: "Ambulans / Kesehatan",
    phones: [{ display: "119", tel: "119" }],
    description: "Public Safety Center layanan kesehatan darurat",
  },
  {
    label: "Kepolisian RI",
    phones: [{ display: "110", tel: "110" }],
    description: "Layanan keamanan, lalu lintas, & ketertiban",
  },
  {
    label: "Pemadam Kebakaran",
    phones: [{ display: "113", tel: "113" }],
    description: "Kebakaran & operasi penyelamatan lokal",
  },
  {
    label: "Layanan Darurat Terpadu",
    phones: [{ display: "112", tel: "112" }],
    description: "Nomor darurat nasional bebas pulsa (kota/kabupaten)",
  },
];

const importantNoticePoints = [
  <>Kami <strong>tidak menerima uang</strong> dalam bentuk apa pun (transfer bank, e-wallet, kripto, dll.).</>,
  <>Kami <strong>tidak mempublikasikan nomor rekening bank</strong> pribadi atau organisasi.</>,
  <>Kami <strong>tidak menyediakan dompet penggalangan dana</strong> atau QRIS donasi.</>,
  <>Kami <strong>tidak mengintegrasikan payment gateway</strong> atau sistem pembayaran apa pun.</>,
  <>Semua tautan di halaman ini mengarah langsung ke <strong>situs web resmi instansi</strong> terkait.</>,
  <>Jika ada pihak mengatasnamakan platform ini untuk meminta donasi, <strong>abaikan dan laporkan sebagai penipuan</strong>.</>,
];

export default function HelpPage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="help-heading">
        <div className="container-main max-w-4xl">
          <header className="mb-10 text-center">
            <h1 id="help-heading" className="font-display font-bold text-3xl md:text-4xl text-primary mb-4">
              Saluran Bantuan Resmi
            </h1>
            <p className="text-secondary-text text-lg leading-relaxed">
              Daftar instansi pemerintah, layanan SAR, dan organisasi kemanusiaan resmi di Indonesia.
              Seluruh tautan mengarah langsung ke kanal terverifikasi masing-masing instansi.
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
              <ul className="list-disc list-inside text-secondary-text text-sm space-y-2">
                {importantNoticePoints.map((point, index) => (
                  <li key={index} className="leading-relaxed">{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Official Channels */}
          <section aria-labelledby="channels-heading" className="mb-12">
            <h2 id="channels-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Instansi &amp; Organisasi Resmi
            </h2>
            <div className="space-y-4">
              {officialChannels.map((channel) => (
                <Card key={channel.name} className="hover:border-primary transition-colors">
                  <CardContent className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-display font-semibold text-lg text-primary">{channel.name}</h3>
                        <Badge variant="safe" size="sm" className="flex-shrink-0">
                          Resmi
                        </Badge>
                        <Badge variant="neutral" size="sm" className="flex-shrink-0">
                          {channel.category}
                        </Badge>
                      </div>
                      <p className="text-secondary-text text-sm mb-3 leading-relaxed">{channel.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {channel.services.map((service) => (
                          <Badge key={service} variant="default" size="sm">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 md:w-52">
                      <LinkButton
                        size="md"
                        variant="primary"
                        href={channel.url}
                        className="w-full"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {emergencyNumbers.map((item) => (
                <Card key={item.label} className="text-center">
                  <CardContent className="flex flex-col justify-between h-full">
                    <p className="text-secondary-text text-sm font-medium mb-2">{item.label}</p>
                    <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 my-1">
                      {item.phones.map((ph, idx) => (
                        <span key={ph.tel} className="inline-flex items-baseline gap-2">
                          {idx > 0 && <span className="text-secondary-text text-sm">/</span>}
                          <a
                            href={`tel:${ph.tel}`}
                            className={`font-display font-bold font-mono text-primary hover:underline ${
                              idx === 0 ? "text-2xl sm:text-3xl" : "text-lg text-secondary-text"
                            }`}
                          >
                            {ph.display}
                          </a>
                        </span>
                      ))}
                    </div>
                    <p className="text-secondary-text text-xs mt-2">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Guidance */}
          <section aria-labelledby="guidance-heading" className="mb-12">
            <h2 id="guidance-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Panduan Menyalurkan Bantuan Secara Aman
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "1. Verifikasi Kebutuhan Lapangan",
                  content:
                    "Periksa kebutuhan aktual melalui laporan BNPB, BPBD setempat, atau PMI sebelum mengirim logistik agar barang tidak menumpuk di posko tanpa terpakai.",
                },
                {
                  title: "2. Salurkan Melalui Kanal Resmi",
                  content:
                    "Gunakan rekening atau kanal resmi yang dipublikasikan langsung di situs instansi (BNPB, PMI, Baznas, Kemensos). Hindari transfer ke rekening pribadi.",
                },
                {
                  title: "3. Koordinasi Bantuan Barang (In-Kind)",
                  content:
                    "Koordinasikan pengiriman barang dengan BPBD atau cabang PMI terdekat. Pastikan kemasan rapi, berlabel jelas, serta bukan makanan kedaluwarsa atau pakaian tak layak.",
                },
                {
                  title: "4. Pendaftaran Relawan Terkoordinasi",
                  content:
                    "Daftarkan diri melalui PMI, BNPB, atau organisasi kemanusiaan terdaftar. Jangan memasuki wilayah terdampak secara mandiri tanpa koordinasi posko.",
                },
              ].map((item) => (
                <Card key={item.title}>
                  <CardContent>
                    <h3 className="font-display font-semibold text-base text-primary mb-2">{item.title}</h3>
                    <p className="text-secondary-text text-sm leading-relaxed">{item.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/peta">← Lihat Peta Bencana</LinkButton>
            <LinkButton href="/kasus">Lihat Studi Kasus →</LinkButton>
            <LinkButton variant="secondary" href="/sumber">Lihat Sumber Data →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
