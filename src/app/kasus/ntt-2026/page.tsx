import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { CaseStudyDetailView } from "@/components/cases/CaseStudyDetailView";
import { getCaseStudyDetail } from "@/lib/case-studies";

export const metadata: Metadata = {
  title: "Kasus Gempa Flores NTT Agustus 2026 | Transparansi Bantuan Bencana",
  description:
    "Studi kasus gempabumi Flores NTT Agustus 2026 berbasis data resmi BNPB Geoportal: kerusakan rumah, pengungsi, status akses per kabupaten/kota, dan jejak sumber.",
  openGraph: {
    title: "Kasus Gempa Flores NTT Agustus 2026 | Transparansi Bantuan Bencana",
    description:
      "Studi kasus gempabumi Flores NTT Agustus 2026 berbasis data resmi BNPB Geoportal.",
    type: "website",
    locale: "id_ID",
  },
};

async function NttCaseLoader() {
  const caseStudy = await getCaseStudyDetail("ntt-2026");
  if (!caseStudy) {
    notFound();
  }
  return <CaseStudyDetailView caseStudy={caseStudy} />;
}

function NttCaseSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-background" role="status" aria-label="Memuat studi kasus Flores NTT">
      <div className="container-main space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-secondary-background" />
        <div className="h-12 w-3/4 rounded bg-secondary-background" />
        <div className="grid gap-6 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border border-border bg-secondary-background/60" />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-border bg-secondary-background/60" />
      </div>
    </section>
  );
}

export default function NTT2026CasePage() {
  return (
    <MainLayout>
      <Suspense fallback={<NttCaseSkeleton />}>
        <NttCaseLoader />
      </Suspense>
    </MainLayout>
  );
}
