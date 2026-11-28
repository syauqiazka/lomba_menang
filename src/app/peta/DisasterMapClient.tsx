'use client';

import { DisasterMap } from '@/components/map/DisasterMap';
import type { MapSummaryCounts } from '@/lib/map-data';
import type { RegionMapDTO, PublicStatus } from '@/types/map';

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
