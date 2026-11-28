import type { IncidentCategory } from '@/types/map';

export type TrendCategory = IncidentCategory | 'ALL';
export type TrendRange = 7 | 30 | 90 | 365;

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD (WIB)
  label: string; // e.g., "28 Okt"
  count: number;
  prevYearCount?: number;
}

export type ProvinceTrendReportStatus =
  | 'WORSENING_STREAK'
  | 'WORSENING'
  | 'IMPROVING_STREAK'
  | 'IMPROVING'
  | 'STABLE'
  | 'NO_DATA';

export interface ProvinceTrendRow {
  code: string;
  name: string;
  count7d: number;
  prev7d: number;
  diff7d: number;
  pctVsPrevWeek: number | null;
  count30d: number;
  prevYear7d: number;
  pctVsPrevYear: number | null;
  ratioVsPrevYear: number | null;
  weekly4: [number, number, number, number]; // oldest -> newest 4 weekly buckets
  reportStatus: ProvinceTrendReportStatus;
  reportLabel: string;
}

export interface TrendsResponse {
  updatedAt: string;
  dataUntilDate: string; // YYYY-MM-DD
  dataUntilLabel: string; // e.g., "28 Nov"
  category: TrendCategory;
  categoryLabel: string;
  rangeDays: TrendRange;
  unitLabel: string; // e.g., "kejadian" | "titik panas"
  hasPrevYearComparison: boolean;
  periodLabels: {
    current7d: string;
    prev7d: string;
    prevYear7d: string;
  };
  summary: {
    last7dCount: number;
    prev7dCount: number;
    pctVsPrevWeek: number | null;
    prevYear7dCount: number;
    pctVsPrevYear: number | null;
    ratioVsPrevYear: number | null;
    totalRangeCount: number;
    avgPerDay: number;
    peakDay: {
      date: string;
      label: string;
      count: number;
    } | null;
  };
  dailySeries: DailyTrendPoint[];
  topIncreases: ProvinceTrendRow[];
  provinces: ProvinceTrendRow[];
  streakCounts: {
    worseStreak2Plus: number;
    betterStreak2Plus: number;
  };
  liveStatus: {
    usgs: 'live' | 'snapshot';
    eonet: 'live' | 'snapshot';
    gdacs: 'live' | 'snapshot';
    nasaFirms7d: 'live' | 'snapshot';
    bnpbWeekly: 'live' | 'snapshot';
    bmkg: 'live' | 'snapshot';
    magmaVolcano: 'live' | 'snapshot';
    puAccess: 'snapshot';
  };
  sourceSummary: string;
}
