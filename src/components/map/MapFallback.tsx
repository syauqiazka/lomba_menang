'use client';

import { useState } from 'react';
import { RegionMapDTO } from '@/types/map';
import { StatusBadge } from '@/components/ui/Badge';
import { getStatusLabel, formatNumber } from '@/lib/map-utils';

interface MapFallbackProps {
  regions: RegionMapDTO[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  loading?: boolean;
}

export function MapFallback({ regions, selectedCode, onSelect, loading }: MapFallbackProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  const isExpanded = (code: string) => manuallyExpanded.has(code) || selectedCode === code;

  const toggleExpand = (code: string) => {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  if (loading) {
    return (
      <nav aria-label="Navigasi wilayah (memuat)" className="space-y-2" role="status">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary-background rounded-lg border" />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Navigasi wilayah (alternatif peta)" className="space-y-2">
      {regions.map((region) => {
        const isSelected = region.code === selectedCode;
        const hasDetails = (region.stats && region.stats.length > 0) || region.status;

        return (
          <div key={region.code} className="group">
            <button
              type="button"
              className={`w-full text-left p-4 rounded-lg border transition-all duration-150 flex items-center justify-between gap-4 ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-background hover:bg-secondary-background border-border'
              }`}
              onClick={() => onSelect(region.code)}
              aria-pressed={isSelected}
              aria-expanded={hasDetails ? isExpanded(region.code) : undefined}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body font-medium truncate">{region.name}</span>
                  {region.status && (
                    <StatusBadge status={getStatusLabel(region.status)} />
                  )}
                  {!region.status && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-neutral-bg text-status-neutral-text">
                      Tidak ada laporan
                    </span>
                  )}
                </div>
                {isExpanded(region.code) && region.stats && region.stats.length > 0 && (
                  <dl className="mt-2 text-sm text-secondary-text grid grid-cols-2 sm:grid-cols-4 gap-1">
                    {region.stats.map((stat) => (
                      <>
                        <dt key={stat.key} className="font-medium text-primary">
                          {stat.label}
                        </dt>
                        <dd className="text-secondary-text">
                          {formatNumber(stat.value)}{' '}
                          {stat.unit && <span className="text-xs opacity-70">{stat.unit}</span>}
                        </dd>
                      </>
                    ))}
                  </dl>
                )}
              </div>
              {hasDetails && (
                <button
                  type="button"
                  className="flex-shrink-0 p-1 rounded text-secondary-text hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(region.code);
                  }}
                  aria-label={isExpanded(region.code) ? `Sembunyikan detail ${region.name}` : `Tampilkan detail ${region.name}`}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded(region.code) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}