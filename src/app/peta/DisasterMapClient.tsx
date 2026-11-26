'use client';

import { DisasterMap } from '@/components/map/DisasterMap';
import type { RegionMapDTO, PublicStatus } from '@/types/map';

interface DisasterMapClientProps {
  initialRegions: RegionMapDTO[];
  initialFilters?: { status?: PublicStatus; provinceCode?: string };
}

export function DisasterMapClient({ initialRegions, initialFilters }: DisasterMapClientProps) {
  return <DisasterMap initialRegions={initialRegions} initialFilters={initialFilters} />;
}