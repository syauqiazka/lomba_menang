import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { CaseStudyDetailView } from "@/components/cases/CaseStudyDetailView";
import {
  getAvailableCaseSlugs,
  getCaseStudyDetail,
  getCaseStudyMeta,
} from "@/lib/case-studies";

interface CasePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAvailableCaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = getCaseStudyMeta(slug);

  if (!meta) {
    return { title: "Studi Kasus Tidak Ditemukan" };
  }

  return {
    title: `${meta.title} | Transparansi Bantuan Bencana`,
    description: meta.description,
    openGraph: {
      title: `${meta.title} | Transparansi Bantuan Bencana`,
      description: meta.description,
      type: "website",
      locale: "id_ID",
    },
  };
}

async function CaseDetailLoader({ params }: CasePageProps) {
  const { slug } = await params;
  const caseStudy = await getCaseStudyDetail(slug);
  if (!caseStudy) {
    notFound();
  }
  return <CaseStudyDetailView caseStudy={caseStudy} />;
}

function CaseDetailSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-background" role="status" aria-label="Memuat detail studi kasus">
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

export default function CasePage({ params }: CasePageProps) {
  return (
    <MainLayout>
      <Suspense fallback={<CaseDetailSkeleton />}>
        <CaseDetailLoader params={params} />
      </Suspense>
    </MainLayout>
  );
}
