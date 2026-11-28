import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { StatisticDisplay } from "@/components/ui/StatisticDisplay";
import { LinkButton } from "@/components/ui/Button";
import Link from "next/link";

interface CaseStudyData {
  slug: string;
  title: string;
  description: string;
  eventType: "geological" | "environmental";
  date: string;
  region: string;
  status: "active" | "historical" | "archived" | "unverified";
  statusLabel: string;
  timeline: {
    date: string;
    title: string;
    description: string;
    type: "event" | "response" | "issue" | "recovery";
  }[];
  affectedRegions: {
    name: string;
    code: string;
    status: "Dilaporkan belum menerima bantuan" | "Akses terisolir" | "Belum terverifikasi";
  }[];
  stats: {
    key: string;
    label: string;
    value: string;
    unit: string;
    asOfDate: Date;
    source: {
      id: string;
      title: string;
      publisher: string;
      category: "OFFICIAL" | "MEDIA" | "RESEARCH" | "EDITORIAL";
      publicationDate: Date;
      accessDate: Date;
    };
  }[];
  keyDocuments: {
    title: string;
    description: string;
    type: "OFFICIAL" | "MEDIA" | "RESEARCH" | "EDITORIAL";
  }[];
  methodology: {
    dataCollection: string[];
    validation: string[];
    limitations: string[];
  };
}

const SNAPSHOT_ACCESS_DATE = new Date("2026-11-28");

const caseStudiesData: Record<string, CaseStudyData> = {
  "ntt-2026": {
    slug: "ntt-2026",
    title: "Gempa Flores NTT, Agustus 2026",
    description: "Studi kasus mendalam gempa bumi magnitudo 6.1 SR yang mengguncang Pulau Flores, Nusa Tenggara Timur. Melacak dampak, respons bantuan, tantangan distribusi logistik ke wilayah terpencil, dan jejak informasi dari sumber resmi hingga media investigasi.",
    eventType: "geological",
    date: "2026-08",
    region: "Nusa Tenggara Timur",
    status: "historical",
    statusLabel: "Historis",
    timeline: [
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
    ],
    affectedRegions: [
      { name: "Kabupaten Flores Timur", code: "5306", status: "Akses terisolir" },
      { name: "Kabupaten Sikka", code: "5307", status: "Dilaporkan belum menerima bantuan" },
      { name: "Kabupaten Ende", code: "5308", status: "Belum terverifikasi" },
      { name: "Kabupaten Ngada", code: "5309", status: "Dilaporkan belum menerima bantuan" },
      { name: "Kabupaten Lembata", code: "5313", status: "Belum terverifikasi" },
    ],
    stats: [
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
          category: "OFFICIAL",
          publicationDate: new Date("2026-08-31"),
          accessDate: SNAPSHOT_ACCESS_DATE,
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
          category: "OFFICIAL",
          publicationDate: new Date("2026-08-31"),
          accessDate: SNAPSHOT_ACCESS_DATE,
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
          category: "OFFICIAL",
          publicationDate: new Date("2026-08-31"),
          accessDate: SNAPSHOT_ACCESS_DATE,
        },
      },
    ],
    keyDocuments: [
      {
        title: "Laporan Situasi BNPB H+7",
        description: "Laporan resmi Badan Nasional Penanggulangan Bencana 7 hari pasca gempa.",
        type: "OFFICIAL",
      },
      {
        title: "Keputusan Gubernur NTT Status Darurat",
        description: "Penetapan status tanggap darurat bencana oleh Gubernur NTT.",
        type: "OFFICIAL",
      },
      {
        title: "Laporan Medis RSUD Maumere",
        description: "Data korban luka dan penanganan medis dari rumah sakit rujukan.",
        type: "OFFICIAL",
      },
      {
        title: "Laporan Investigasi Media Tempo",
        description: "Liputan mendalam mengenai distribusi bantuan di wilayah terpencil.",
        type: "MEDIA",
      },
    ],
    methodology: {
      dataCollection: [
        "Data resmi: Laporan situasi BNPB, penetapan status darurat Gubernur NTT, laporan BPBD kabupaten/kota.",
        "Data media: Liputan investigasi media nasional (Tempo, Kompas, BBC Indonesia) dan media lokal NTT.",
        "Data lapangan: Laporan organisasi kemanusiaan (PMI dan lembaga resmi terkait) yang terverifikasi.",
      ],
      validation: [
        "Menyilangkan data BNPB dengan laporan BPBD kabupaten dan media investigasi.",
        "Status \"Dilaporkan belum menerima bantuan\" hanya diberi jika ada laporan media/organisasi kemanusiaan yang terverifikasi.",
        "Status \"Akses terisolir\" berdasarkan laporan resmi BPBD/TNI/POLRI tentang kondisi infrastruktur.",
        "Status \"Belum terverifikasi\" untuk wilayah dengan laporan awal tapi belum dikonfirmasi multi-sumber.",
      ],
      limitations: [
        "Data korban jiwa dan luka bisa berubah seiring proses identifikasi.",
        "Wilayah terpencil (dusun di pegunungan) sulit dijangkau untuk verifikasi langsung.",
        "Keterlambatan pelaporan dari tingkat desa ke kabupaten memengaruhi ketepatan waktu data.",
      ],
    },
  },
  "aceh-2026": {
    slug: "aceh-2026",
    title: "Banjir & Longsor Aceh, November 2026",
    description: "Banjir bandang dan longsor akibat hujan ekstrem melanda beberapa kabupaten di Aceh pada November 2026. Studi kasus bencana hidrometeorologis dengan tantangan evakuasi dan distribusi bantuan di wilayah terisolir.",
    eventType: "environmental",
    date: "2026-11",
    region: "Aceh",
    status: "active",
    statusLabel: "Aktif",
    timeline: [
      {
        date: "7–10 November 2026",
        title: "Hujan Ekstrem & Banjir Bandang",
        description: "Curah hujan ekstrem >300 mm/hari melanda Aceh Utara, Aceh Timur, Bireuen, Lhokseumawe, Aceh Tamiang, Langsa, dan Pidie. Banjir bandang dan longsor mengakibatkan ratusan rumah rusak dan infrastruktur terputus.",
        type: "event",
      },
      {
        date: "H+1 hingga H+3",
        title: "Evakuasi Darurat & Penanganan Korban",
        description: "BPBD Aceh, TNI, POLRI, Basarnas, dan PMI melakukan evakuasi warga terperangkap. Posko darurat dibuka di setiap kabupaten terdampak. Akses jalan lintas provinsi terputus di beberapa titik.",
        type: "response",
      },
      {
        date: "H+5",
        title: "Pengungsian Massal & Logistik",
        description: "Puluhan ribu warga mengungsi ke masjid, balai desa, dan gedung publik. Kebutuhan mendesak: tenda, makanan siap saji, air bersih, obat-obatan, sanitasi. Distribusi terhambat oleh genangan air dan longsor di jalur akses.",
        type: "response",
      },
      {
        date: "H+10",
        title: "Evaluasi Kerusakan & Data Korban",
        description: "BPBD Aceh mulai merekap data kerusakan per kabupaten. Laporan awal: korban jiwa, luka-luka, rumah rusak berat/sedang/ringan, infrastruktur jalan/jembatan/irigasi/pendidikan/kesehatan rusak. Validasi data lintas sektor dimulai.",
        type: "issue",
      },
      {
        date: "Bulan 1–3",
        title: "Rehabilitasi & Mitigasi Lanjutan",
        description: "Program rehabilitasi rumah, normalisasi sungai, stabilisasi lereng longsor, pembangunan kembali infrastruktur. Penguatan sistem peringatan dini (Early Warning System) dan perencanaan tata ruang berbasis risiko bencana.",
        type: "recovery",
      },
    ],
    affectedRegions: [
      { name: "Kabupaten Aceh Timur", code: "1103", status: "Akses terisolir" },
      { name: "Kabupaten Pidie", code: "1107", status: "Dilaporkan belum menerima bantuan" },
      { name: "Kabupaten Aceh Utara", code: "1108", status: "Dilaporkan belum menerima bantuan" },
      { name: "Kabupaten Bireuen", code: "1111", status: "Belum terverifikasi" },
      { name: "Kabupaten Aceh Tamiang", code: "1116", status: "Akses terisolir" },
      { name: "Kota Lhokseumawe", code: "1173", status: "Dilaporkan belum menerima bantuan" },
      { name: "Kota Langsa", code: "1174", status: "Belum terverifikasi" },
    ],
    stats: [
      {
        key: "fatalities",
        label: "Korban Jiwa",
        value: "—",
        unit: "orang",
        asOfDate: new Date("2026-11-20"),
        source: {
          id: "placeholder",
          title: "Data dalam validasi",
          publisher: "BPBD Aceh / BNPB",
          category: "OFFICIAL",
          publicationDate: new Date("2026-11-20"),
          accessDate: SNAPSHOT_ACCESS_DATE,
        },
      },
      {
        key: "displaced",
        label: "Warga Mengungsi",
        value: "—",
        unit: "jiwa",
        asOfDate: new Date("2026-11-20"),
        source: {
          id: "placeholder",
          title: "Data dalam validasi",
          publisher: "BPBD Aceh",
          category: "OFFICIAL",
          publicationDate: new Date("2026-11-20"),
          accessDate: SNAPSHOT_ACCESS_DATE,
        },
      },
      {
        key: "damaged_houses",
        label: "Rumah Rusak",
        value: "—",
        unit: "unit",
        asOfDate: new Date("2026-11-20"),
        source: {
          id: "placeholder",
          title: "Data dalam validasi",
          publisher: "BPBD Aceh",
          category: "OFFICIAL",
          publicationDate: new Date("2026-11-20"),
          accessDate: SNAPSHOT_ACCESS_DATE,
        },
      },
      {
        key: "affected_districts",
        label: "Kabupaten/Kota Terdampak",
        value: "7",
        unit: "kabupaten/kota",
        asOfDate: new Date("2026-11-20"),
        source: {
          id: "placeholder",
          title: "Daftar kabupaten/kota dari BPBD Aceh",
          publisher: "BPBD Aceh",
          category: "OFFICIAL",
          publicationDate: new Date("2026-11-20"),
          accessDate: SNAPSHOT_ACCESS_DATE,
        },
      },
    ],
    keyDocuments: [
      {
        title: "Laporan Situasi BPBD Provinsi Aceh H+7",
        description: "Laporan resmi Badan Penanggulangan Bencana Daerah Provinsi Aceh 7 hari pasca kejadian.",
        type: "OFFICIAL",
      },
      {
        title: "Keputusan Gubernur Aceh Status Darurat Bencana",
        description: "Penetapan status tanggap darurat bencana provinsi oleh Gubernur Aceh.",
        type: "OFFICIAL",
      },
      {
        title: "Analisis BMKG Curah Hujan Ekstrem Aceh Nov 2026",
        description: "Analisis meteorologi dan prakiraan lanjutan dari BMKG Stasiun Klimatologi Aceh.",
        type: "OFFICIAL",
      },
      {
        title: "Laporan Medis RSUD Meulaboh & RSUD Langsa",
        description: "Data penanganan korban luka dan kesehatan jiwa pasca bencana dari rumah sakit rujukan.",
        type: "OFFICIAL",
      },
      {
        title: "Laporan Investigasi Media Kompas: Akses Terputus di Aceh Timur",
        description: "Liputan mendalam mengenai tantangan distribusi bantuan di wilayah terisolir longsor.",
        type: "MEDIA",
      },
    ],
    methodology: {
      dataCollection: [
        "Data resmi: Laporan situasi BPBD Provinsi Aceh, penetapan status darurat Gubernur Aceh, analisis BMKG, laporan BPBD kabupaten/kota.",
        "Data media: Liputan investigasi media nasional (Kompas, Tempo, Detik, CNN Indonesia) dan media lokal Aceh (Serambi Indonesia, Aceh Kini).",
        "Data lapangan: Laporan PMI Aceh, TAGANA, dan organisasi kemanusiaan lokal yang terverifikasi.",
      ],
      validation: [
        "Menyilangkan data BPBD Provinsi dengan laporan BPBD kabupaten/kota, analisis BMKG, dan media investigasi.",
        "Status \"Dilaporkan belum menerima bantuan\" hanya diberi jika ada laporan media/organisasi kemanusiaan yang terverifikasi dari lokasi.",
        "Status \"Akses terisolir\" berdasarkan laporan resmi BPBD/TNI/POLRI/PMI tentang kondisi infrastruktur jalan/jembatan.",
        "Status \"Belum terverifikasi\" untuk wilayah dengan laporan awal tapi belum dikonfirmasi multi-sumber (resmi + media + lapangan).",
        "Data korban jiwa divalidasi silang dengan data RSUD, Polres, dan Kelurahan/Desa.",
      ],
      limitations: [
        "Data korban jiwa dan luka bisa berubah seiring proses identifikasi dan pencarian korban hilang.",
        "Wilayah terisolir oleh longsor (khususnya di pegunungan Aceh Tengah/Tenggara) sulit dijangkau untuk verifikasi langsung.",
        "Keterlambatan pelaporan dari tingkat gampong/desa ke kecamatan ke kabupaten memengaruhi ketepatan waktu data.",
        "Curah hujan berkelanjutan mempersulit survei kerusakan lanjutan dan pengukuran batas longsor.",
      ],
    },
  },
};

const statusConfig = {
  active: { variant: "safe" as const, label: "Aktif" },
  historical: { variant: "neutral" as const, label: "Historis" },
  archived: { variant: "default" as const, label: "Arsip" },
  unverified: { variant: "warning" as const, label: "Belum Terverifikasi" },
};

const eventTypeConfig = {
  geological: { badge: "warning" as const, label: "Geologis" },
  environmental: { badge: "safe" as const, label: "Hidrometeorologis" },
};

const typeLabelMap = {
  event: { label: "Kejadian", badge: "danger" as const },
  response: { label: "Respons", badge: "safe" as const },
  issue: { label: "Isu", badge: "warning" as const },
  recovery: { label: "Pemulihan", badge: "default" as const },
};

interface CasePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = caseStudiesData[slug];
  
  if (!caseStudy) {
    return { title: "Studi Kasus Tidak Ditemukan" };
  }

  return {
    title: `${caseStudy.title} | Transparansi Bantuan Bencana`,
    description: caseStudy.description,
    openGraph: {
      title: `${caseStudy.title} | Transparansi Bantuan Bencana`,
      description: caseStudy.description,
      type: "website",
      locale: "id_ID",
    },
  };
}

export default async function CasePage({ params }: CasePageProps) {
  const { slug } = await params;
  const caseStudy = caseStudiesData[slug];

  if (!caseStudy) {
    notFound();
  }

  return (
    <MainLayout>
      <section className="py-12 md:py-16 bg-background" aria-labelledby="case-heading">
        <div className="container-main">
          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-2 text-sm text-secondary-text mb-4">
              <Badge variant="default">Studi Kasus</Badge>
              <Badge variant={eventTypeConfig[caseStudy.eventType].badge}>
                {eventTypeConfig[caseStudy.eventType].label}
              </Badge>
              <time dateTime={caseStudy.date} className="font-mono">{caseStudy.date}</time>
              <Badge variant={statusConfig[caseStudy.status].variant}>
                {caseStudy.statusLabel}
              </Badge>
            </div>
            <h1 id="case-heading" className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-primary mb-4">
              {caseStudy.title}
            </h1>
            <p className="text-secondary-text text-lg max-w-3xl">{caseStudy.description}</p>
            <div className="mt-6 p-4 rounded-lg border border-border bg-secondary-background text-sm text-secondary-text max-w-3xl">
              <strong className="text-primary">Status Dokumen (Kerangka Studi Kasus):</strong>{" "}
              Kronologi, daftar wilayah indikatif, dan rujukan dokumen di halaman ini masih menunggu impor data resmi terverifikasi
              dari BNPB, BMKG, dan BPBD setempat ke dalam database.
            </div>
          </header>

          {/* Timeline */}
          <section aria-labelledby="timeline-heading" className="mb-16">
            <h2 id="timeline-heading" className="font-display font-semibold text-2xl text-primary mb-8">Kronologi Kejadian</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" aria-hidden="true" />
              <dl className="space-y-8">
                {caseStudy.timeline.map((item, index) => (
                  <div key={index} className="relative flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-background flex items-center justify-center relative z-10">
                      <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <time className="text-sm font-medium text-primary font-mono">{item.date}</time>
                        <Badge variant={typeLabelMap[item.type].badge}>
                          {typeLabelMap[item.type].label}
                        </Badge>
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
                  {caseStudy.affectedRegions.map((region) => (
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
              Status di atas bersifat indikatif berdasarkan laporan awal menggunakan kode BPS resmi. Lihat{" "}
              <Link href="/sumber" className="underline hover:text-primary">
                halaman Sumber
              </Link>{" "}
              untuk daftar sumber terdaftar.
            </p>
          </section>

          {/* Statistics */}
          <section aria-labelledby="stats-heading" className="mb-16">
            <h2 id="stats-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Statistik Dampak
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {caseStudy.stats.map((stat) => (
                <StatisticDisplay key={stat.key} data={stat} variant="featured" />
              ))}
            </div>
            <p className="text-center text-secondary-text text-sm mt-6">
              <strong>Catatan:</strong> Statistik dampak sedang dalam proses pengumpulan dan validasi dari BPBD, BNPB,
              dan instansi terkait. Angka final akan diperbarui setelah verifikasi lapangan selesai.
            </p>
          </section>

          {/* Evidence / Key Documents */}
          <section aria-labelledby="evidence-heading" className="mb-16">
            <h2 id="evidence-heading" className="font-display font-semibold text-2xl text-primary mb-6">
              Bukti & Dokumen Pendukung
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {caseStudy.keyDocuments.map((doc, index) => (
                <Card key={index} className="hover:border-primary transition-colors">
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <Badge
                        variant={
                          doc.type === "OFFICIAL"
                            ? "safe"
                            : doc.type === "MEDIA"
                            ? "warning"
                            : doc.type === "RESEARCH"
                            ? "default"
                            : "neutral"
                        }
                        className="flex-shrink-0 mt-0.5"
                      >
                        {doc.type === "OFFICIAL"
                          ? "Resmi"
                          : doc.type === "MEDIA"
                          ? "Media"
                          : doc.type === "RESEARCH"
                          ? "Penelitian"
                          : "Lainnya"}
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
            <div className="prose prose-secondary max-w-none space-y-6">
              <div>
                <h3 className="font-semibold text-primary mb-2">Pengumpulan Data</h3>
                <ul className="list-disc list-inside text-secondary-text space-y-2">
                  {caseStudy.methodology.dataCollection.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">Validasi & Penyilangan</h3>
                <ul className="list-disc list-inside text-secondary-text space-y-2">
                  {caseStudy.methodology.validation.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">Keterbatasan</h3>
                <ul className="list-disc list-inside text-secondary-text space-y-2">
                  {caseStudy.methodology.limitations.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton variant="secondary" href="/kasus">← Kembali ke Daftar Kasus</LinkButton>
            <LinkButton href="/peta">Lihat di Peta Nasional →</LinkButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
