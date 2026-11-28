'use client';

import dynamic from 'next/dynamic';
import type { MapSummaryCounts } from '@/lib/map-data';
import type { RegionMapDTO, PublicStatus } from '@/types/map';

const DisasterMap = dynamic(
  () => import('@/components/map/DisasterMap').then((mod) => mod.DisasterMap),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[74px] rounded-lg border border-border bg-secondary-background/60 animate-pulse" />
          ))}
        </div>
        <div className="h-[132px] rounded-lg border border-border bg-secondary-background/40 animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 h-[460px] lg:h-[600px] rounded-lg border border-border bg-secondary-background/60 flex flex-col items-center justify-center p-6">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" aria-hidden="true" />
            <p className="text-sm text-secondary-text">Menyiapkan kanvas peta interaktif Indonesia…</p>
          </div>
          <div className="lg:col-span-4 h-[460px] lg:h-[600px] rounded-lg border border-border bg-secondary-background/40 animate-pulse" />
        </div>
      </div>
    ),
  }
);

interface DisasterMapClientProps {
  initialRegions: RegionMapDTO[];
  initialRegencies: RegionMapDTO[];
  summaryCounts: MapSummaryCounts;
  initialFilters?: { status?: PublicStatus; provinceCode?: string };
}

export function DisasterMapClient({
  initialRegions,
  initialRegencies,
  summaryCounts,
  initialFilters,
}: DisasterMapClientProps) {
  return (
    <DisasterMap
      initialRegions={initialRegions}
      initialRegencies={initialRegencies}
      summaryCounts={summaryCounts}
      initialFilters={initialFilters}
    />
  );
}
