'use client';

import type { PublicStatus } from '@/types/map';
import { Button } from '@/components/ui/Button';

interface MapFiltersProps {
  provinces: Array<{ code: string; name: string }>;
  status: PublicStatus | '';
  provinceCode: string;
  confidenceFilter: 'ALL' | 'Tinggi' | 'Sedang';
  dateFilter: string;
  datesAvailable: string[];
  visibleIncidentCount: number;
  hasAnyFilter?: boolean;
  onStatusChange: (status: PublicStatus | '') => void;
  onProvinceChange: (provinceCode: string) => void;
  onConfidenceChange: (confidence: 'ALL' | 'Tinggi' | 'Sedang') => void;
  onDateChange: (dateFilter: string) => void;
  onDownloadCsv: () => void;
  onReset: () => void;
  loading?: boolean;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatShortDateLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const monthIdx = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  if (!Number.isFinite(day) || monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${day} ${SHORT_MONTHS[monthIdx]}`;
}

export function MapFilters({
  provinces,
  status,
  provinceCode,
  confidenceFilter,
  dateFilter,
  datesAvailable,
  visibleIncidentCount,
  hasAnyFilter,
  onStatusChange,
  onProvinceChange,
  onConfidenceChange,
  onDateChange,
  onDownloadCsv,
  onReset,
  loading = false,
}: MapFiltersProps) {
  const showReset =
    hasAnyFilter ??
    Boolean(status || provinceCode || confidenceFilter !== 'ALL' || dateFilter !== 'ALL');

  return (
    <div className="bg-background border border-border rounded-lg p-4" role="search" aria-label="Filter peta">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-3">
          <label htmlFor="province-filter" className="block text-xs font-medium text-secondary-text mb-1">
            Provinsi
          </label>
          <select
            id="province-filter"
            value={provinceCode}
            onChange={(e) => onProvinceChange(e.target.value)}
            disabled={loading}
            className="w-full min-h-[44px] px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter provinsi"
          >
            <option value="">Semua Provinsi ({provinces.length})</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label htmlFor="status-filter" className="block text-xs font-medium text-secondary-text mb-1">
            Status Wilayah
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as PublicStatus | '')}
            disabled={loading}
            className="w-full min-h-[44px] px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter status bantuan"
          >
            <option value="">Semua Status</option>
            <option value="DILAPORKAN_BELUM_MENERIMA_BANTUAN">Dilaporkan belum menerima bantuan</option>
            <option value="AKSES_TERISOLIR">Akses terisolir</option>
            <option value="BELUM_TERVERIFIKASI">Belum terverifikasi</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="confidence-filter" className="block text-xs font-medium text-secondary-text mb-1">
            Tingkat Kepercayaan
          </label>
          <select
            id="confidence-filter"
            value={confidenceFilter}
            onChange={(e) => onConfidenceChange(e.target.value as 'ALL' | 'Tinggi' | 'Sedang')}
            disabled={loading}
            className="w-full min-h-[44px] px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter tingkat kepercayaan satelit"
          >
            <option value="ALL">Semua</option>
            <option value="Tinggi">Tinggi (High)</option>
            <option value="Sedang">Sedang (Nominal)</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="date-filter" className="block text-xs font-medium text-secondary-text mb-1">
            Tanggal
          </label>
          <select
            id="date-filter"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={loading}
            className="w-full min-h-[44px] px-3 py-2 border border-border rounded-lg bg-background text-primary text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter tanggal kejadian bencana"
          >
            <option value="ALL">Semua tanggal</option>
            <option value="24H">24 jam terakhir</option>
            <option value="7D">7 hari terakhir</option>
            <option value="30D">30 hari terakhir</option>
            {datesAvailable.map((d) => (
              <option key={d} value={d}>
                {formatShortDateLabel(d)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={loading || visibleIncidentCount === 0}
            className="flex-1 min-h-[44px] px-3 py-2 border border-border rounded-lg bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Unduh CSV ({visibleIncidentCount.toLocaleString('id-ID')})
          </button>
          {showReset && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              className="min-h-[44px] px-3 whitespace-nowrap"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
