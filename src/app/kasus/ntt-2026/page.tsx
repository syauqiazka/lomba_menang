import { Metadata } from "next";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kasus Gempa Flores NTT Agustus 2026 | Transparansi Bantuan Bencana",
  description: "Studi kasus gempa bumi Flores, NTT Agustus 2026: dampak, respons bantuan, tantangan akses, dan jejak informasi. Data bersumber dari instansi resmi dan terverifikasi.",
  openGraph: {
    title: "Kasus Gempa Flores NTT Agustus 2026 | Transparansi Bantuan Bencana",
    description: "Studi kasus gempa bumi Flores, NTT Agustus 2026: dampak, respons bantuan, dan jejak informasi.",
    type: "website",
    locale: "id_ID",
  },
};

const timeline = [
  {
    date: "Agustus 2026",
    title: "Gempa Bumi Flores",
    description: "Gempa bumi magnitudo 6.1 SR mengguncang Pulau Flores, NTT pada kedalaman 10 km. Pusat gempa berada di laut sebelah utara Pulau Flores.",
    type: "event",
  },
  {
    date: "H+1 hingga H+3",
    title: "Respons Darurat",
    description: "Tim SAR, TNI, POLRI, dan BPBD NTT melakukan evakuasi dan penilaian kerusakan. Akses jalan terputus di beberapa kecamatan.",
    type: "response",
  },
  {
    date: "H+7",
    title: "Pengungsian & Logistik",
    description: "Ribuan warga mengungsi ke titik pengungsian. Distribusi tenda, makanan, air bersih, dan obat-obatan dimulai namun terhambat akses.",
    type: "response",
  },
  {
    date: "H+14",
    title: "Evaluasi Distribusi",
    description: "Laporan masyarakat: bantuan belum sampai ke sejumlah dusun terpencil. BPBD mengakui keterlambatan logistik ke wilayah terisolir.",
    type: "issue",
  },
  {
    date: "Bulan 2",
    title: "Rehabilitasi & Rekonstruksi",
    description: "Program bangun rumah, rehabilitasi infrastruktur, dan pemulihan ekonomi dimulai. Monitoring transparansi dana desa dan bantuan pusat.",
    type: "recovery",
  },
];

const affectedRegions = [
  { name: "Kabupaten Flores Timur", code: "5306", status: "Akses terisolir" as const },
  { name: "Kabupaten Sikka", code: "5307", status: "Dilaporkan belum menerima bantuan" as const },
  { name: "Kabupaten Ende", code: "5308", status: "Belum terverifikasi" as const },
  { name: "Kabupaten Ngada", code: "5309", status: "Dilaporkan belum menerima bantuan" as const },
  { name: "Kabupaten Lembata", code: "5313", status: "Belum terverifikasi" as const },
];

const placeholderStats = [
  {
    key: "fatalities",
    label: "Korban Jiwa",
    value: "—",
    unit: "orang",
    asOfDate: new Date("2026-08-31"),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BNPB / BPBD NTT",
      category: "OFFICIAL" as const,
      publicationDate: new Date("2026-08-31"),
      accessDate: new Date("2026-11-28"),
    },
  },
  {
    key: "displaced",
    label: "Warga Mengungsi",
    value: "—",
    unit: "jiwa",
    asOfDate: new Date("2026-08-31"),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BPBD NTT",
      category: "OFFICIAL" as const,
      publicationDate: new Date("2026-08-31"),
      accessDate: new Date("2026-11-28"),
    },
  },
  {
    key: "damaged_houses",
    label: "Rumah Rusak",
    value: "—",
    unit: "unit",
    asOfDate: new Date("2026-08-31"),
    source: {
      id: "placeholder",
      title: "Data belum tersedia",
      publisher: "BPBD NTT",
      category: "OFFICIAL" as const,
      publicationDate: new Date("2026-08-31"),
      accessDate: new Date("2026-11-28"),
    },
  },
];

const keyDocuments = [
  {
    title: "Laporan Situasi BNPB H+7",
    description: "Laporan resmi Badan Nasional Penanggulangan Bencana 7 hari pasca gempa.",
    type: "OFFICIAL" as const,
  },
  {
    title: "Keputusan Gubernur NTT Status Darurat",
    description: "Penetapan status tanggap darurat bencana oleh Gubernur NTT.",
    type: "OFFICIAL" as const,
  },
  {
    title: "Laporan Medis RSUD Maumere",
    description: "Data korban luka dan penanganan medis dari rumah sakit rujukan.",
    type: "OFFICIAL" as const,
  },
  {
    title: "Laporan Investigasi Media Tempo",
    description: "Liputan mendalam mengenai distribusi bantuan di wilayah terpencil.",
    type: "MEDIA" as const,
  },
];

export default function NTT2026CasePage() {
  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="case-heading">
        <div className="container-main">
          <header className="mb-12">
            <div className="flex items-center gap-2 text-sm text-secondary-text mb-4">
              <span className="badge badge-warning">Studi Kasus</span>
              <span className="badge badge-neutral">Geologis</span>
              <time dateTime="2026-08">Agustus 2026</time>
            </div>
            <h1 id="case-heading" className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
              Gempa Flores NTT, Agustus 2026
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl">
              Studi kasus mendalam gempa bumi magnitudo 6.1 SR yang mengguncang Pulau Flores, Nusa Tenggara Timur.
              Melacak dampak, respons bantuan, tantangan distribusi logistik ke wilayah terpencil, dan jejak informasi
              dari sumber resmi hingga media investigasi.
            </p>
            <div className="mt-6 p-4 rounded-lg border border-border bg-secondary-background text-sm text-secondary-text max-w-3xl">
              <strong className="text-primary">Status Dokumen (Kerangka Studi Kasus):</strong>{" "}
              Kronologi, daftar wilayah indikatif, dan rujukan dokumen di halaman ini masih menunggu impor data resmi terverifikasi
              dari BNPB, BMKG, dan BPBD NTT ke dalam database. Angka dampak tidak ditampilkan sebelum sumber terverifikasi tersedia.
            </div>
          </header>

          {/* Timeline */}
          <section aria-labelledby="timeline-heading" className="mb-16">
            <h2 id="timeline-heading" className="font-display font-semibold text-2xl text-primary mb-8">Kronologi Kejadian</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />
              <dl className="space-y-8">
                {timeline.map((item, index) => (
                  <div key={index} className="relative flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-background flex items-center justify-center relative z-10">
                      <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <time className="text-sm font-medium text-primary font-mono">{item.date}</time>
                        <span className={`badge ${item.type === "event" ? "badge-danger" : item.type === "issue" ? "badge-warning" : "badge-safe"}`}>
                          {item.type === "event" ? "Kejadian" : item.type === "issue" ? "Isu" : "Respons"}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-lg text-primary">{item.title}</h3>
                      <p className="text-secondary-text text-sm mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* Affected Regions */}
          <section aria-labelledby="regions-heading" className="mb-16">
            <h2 id="regions-heading" className="font-display font-semibold text-2xl text-primary mb-4">
              Wilayah Terdampak
            </h2>
            <div className="overflow-x-auto">
              <table className="table-container" role="table">
                <thead>
                  <tr>
                    <th scope="col">Kode BPS</th>
                    <th scope="col">Nama Kabupaten/Kota</th>
                    <th scope="col">Status Bantuan</th>
                    <th scope="col">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {affectedRegions.map((region) => (
                    <tr key={region.code}>
                      <td className="font-mono text-sm">{region.code}</td>
                      <td className="font-medium">{region.name}</td>
                      <td>
                        <StatusBadge status={region.status} />
                      </td>
                      <td className="text-secondary-text">Data dalam validasi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-secondary-text text-sm mt-4">
              Kode wilayah menggunakan kode administratif resmi BPS (provinsi NTT <code className="font-mono text-xs">53</code>).
              Status di atas bersifat indikatif menunggu verifikasi resmi. Lihat{" "}
              <Link href="/sumber" className="underline hover:text-primary">halaman Sumber</Link> untuk daftar sumber terdaftar.
            </p>
          </section>

          {/* Statistics */}
          <section aria-labelledby="stats-heading" className="mb-16">
            <h2 id="stats-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Statistik Dampak
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {placeholderStats.map((stat) => (
                <StatisticDisplay key={stat.key} data={stat} variant="featured" />
              ))}
            </div>
            <p className="text-center text-secondary-text text-sm mt-6">
              <strong>Catatan:</strong> Statistik dampak sedang dalam proses pengumpulan dan validasi dari BNPB, BPBD NTT,
              dan instansi terkait. Angka final akan diperbarui setelah verifikasi lapangan selesai.
            </p>
          </section>

          {/* Evidence / Key Documents */}
          <section aria-labelledby="evidence-heading" className="mb-16">
            <h2 id="evidence-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Bukti & Dokumen Pendukung
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {keyDocuments.map((doc, index) => (
                <Card key={index} className="hover:border-primary transition-colors">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <Badge variant={doc.type === "OFFICIAL" ? "safe" : "warning"} className="flex-shrink-0 mt-0.5">
                        {doc.type === "OFFICIAL" ? "Resmi" : "Media"}
                      </Badge>
                      <div className="flex-1">
                        <h3 className="font-medium text-primary">{doc.title}</h3>
                        <p className="text-secondary-text text-sm mt-1">{doc.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-secondary-text">
                          <span>Tautan dokumen menunggu verifikasi</span>
                          <Link href="/sumber" className="text-primary underline hover:text-black">
                            Lihat Registri Sumber
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Methodology for this case study */}
          <section aria-labelledby="case-methodology-heading" className="mb-16">
            <h2 id="case-methodology-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Metodologi Studi Kasus
            </h2>
            <div className="prose prose-secondary max-w-none">
              <h3 className="font-semibold text-primary mb-2">Pengumpulan Data</h3>
              <ul className="list-disc list-inside text-secondary-text space-y-2 mb-6">
                <li>Data resmi: Laporan situasi BNPB, penetapan status darurat Gubernur NTT, laporan BPBD kabupaten/kota.</li>
                <li>Data media: Liputan investigasi media nasional (Tempo, Kompas, BBC Indonesia) dan media lokal NTT.</li>
                <li>Data lapangan: Laporan organisasi kemanusiaan (PMI, organisasi resmi terkait) yang terverifikasi.</li>
              </ul>
              <h3 className="font-semibold text-primary mb-2">Validasi & Penyilangan</h3>
              <ul className="list-disc list-inside text-secondary-text space-y-2 mb-6">
                <li>Menyilangkan data BNPB dengan laporan BPBD kabupaten dan media investigasi.</li>
                <li>Status &ldquo;Dilaporkan belum menerima bantuan&rdquo; hanya diberi jika ada laporan media/organisasi kemanusiaan yang terverifikasi.</li>
                <li>Status &ldquo;Akses terisolir&rdquo; berdasarkan laporan resmi BPBD/TNI/POLRI tentang kondisi infrastruktur.</li>
                <li>Status &ldquo;Belum terverifikasi&rdquo; untuk wilayah dengan laporan awal tapi belum dikonfirmasi multi-sumber.</li>
              </ul>
              <h3 className="font-semibold text-primary mb-2">Keterbatasan</h3>
              <ul className="list-disc list-inside text-secondary-text space-y-2">
                <li>Data korban jiwa dan luka bisa berubah seiring proses identifikasi.</li>
                <li>Wilayah terpencil (dusun di pegunungan) sulit dijangkau untuk verifikasi langsung.</li>
                <li>Keterlambatan pelaporan dari tingkat desa ke kabupaten memengaruhi ketepatan waktu data.</li>
              </ul>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/peta">← Kembali ke Peta Nasional</LinkButton>
            <LinkButton href="/metodologi">Lihat Metodologi Umum →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
