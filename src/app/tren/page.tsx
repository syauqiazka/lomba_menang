import { Suspense } from 'react';
import { Metadata } from 'next';
import { connection } from 'next/server';
import { MainLayout } from '@/components/layout';
import { TrendsDashboard } from '@/components/trends/TrendsDashboard';
import { getDisasterTrends } from '@/lib/trends-data';

export const metadata: Metadata = {
  title: 'Tren Bencana Nasional | Transparansi Bantuan Bencana',
  description:
    'Analisis tren kejadian bencana harian lintas wilayah Indonesia (banjir, gempabumi, longsor, cuaca ekstrem, gunung api, dan karhutla) beserta perbandingan mingguan, tahunan, dan rapor 38 provinsi.',
  openGraph: {
    title: 'Tren Bencana Nasional | Transparansi Bantuan Bencana',
    description:
      'Grafik kejadian bencana per hari, perbandingan dengan periode sebelumnya, dan rapor 38 provinsi Indonesia.',
    type: 'website',
    locale: 'id_ID',
  },
};

async function TrendsLoader() {
  await connection();
  const initialData = await getDisasterTrends({ category: 'ALL', rangeDays: 30 });
  return <TrendsDashboard initialData={initialData} />;
}

function TrendsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat analisis tren bencana">
      <div className="h-10 w-64 rounded-lg bg-secondary-background" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl border border-border bg-secondary-background/60" />
        <div className="h-28 rounded-xl border border-border bg-secondary-background/60" />
        <div className="h-28 rounded-xl border border-border bg-secondary-background/60" />
      </div>
      <div className="h-80 rounded-xl border border-border bg-secondary-background/60" />
    </div>
  );
}

export default function TrendsPage() {
  return (
    <MainLayout>
      <section className="py-10 md:py-14 bg-background" aria-labelledby="trends-heading">
        <div className="container-main">
          <Suspense fallback={<TrendsSkeleton />}>
            <TrendsLoader />
          </Suspense>
        </div>
      </section>
    </MainLayout>
  );
}
