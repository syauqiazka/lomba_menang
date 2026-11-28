'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RegionDetailDTO } from '@/types/map';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CASE_STUDY_BY_PROVINCE, getStatusLabel, formatNumber, formatDate } from '@/lib/map-utils';

interface RegionPanelProps {
  region: RegionDetailDTO | null;
  onClose: () => void;
  loading?: boolean;
}

function isSafeHttpUrl(url?: string): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export function RegionPanel({ region, onClose, loading }: RegionPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!region) return null;

  const statusLabel = region.status ? getStatusLabel(region.status) : 'Tidak ada laporan';
  const provinceCode = region.level === 'province' ? region.code : region.parentCode;
  const caseStudy = provinceCode ? CASE_STUDY_BY_PROVINCE[provinceCode] : undefined;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col"
      role="complementary"
      aria-label={`Detail wilayah: ${region.name}`}
    >
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-lg text-primary truncate">{region.name}</h2>
          <p className="text-sm text-secondary-text">
            {region.level === 'province' ? 'Provinsi' : 'Kabupaten/Kota'} · Kode BPS{' '}
            <span className="font-mono text-xs">{region.code}</span>
          </p>
          {region.centroid && (
            <p className="text-xs text-secondary-text font-mono mt-0.5">
              Centroid: {region.centroid[1].toFixed(4)}°, {region.centroid[0].toFixed(4)}°
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          aria-label="Tutup panel"
          className="min-w-[44px] min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3" role="status">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" aria-hidden="true" />
          <span className="text-sm text-secondary-text">Memuat detail dari database...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={statusLabel} />
            {region.status === undefined && (
              <span className="text-sm text-secondary-text">Belum ada laporan bencana untuk wilayah ini</span>
            )}
          </div>

          {caseStudy && (
            <div className="p-3 rounded-lg border border-border bg-secondary-background">
              <p className="text-xs text-secondary-text mb-1">Tersedia dokumentasi studi kasus:</p>
              <Link
                href={caseStudy.href}
                className="text-sm font-medium text-primary underline hover:text-black"
              >
                {caseStudy.title} →
              </Link>
            </div>
          )}

          {region.stats && region.stats.length > 0 && (
            <section aria-labelledby="stats-heading">
              <h3 id="stats-heading" className="font-display font-medium text-base text-primary mb-3">
                Statistik Terkini
              </h3>
              <dl className="space-y-3">
                {region.stats.map((stat) => (
                  <div key={stat.key} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <dt className="font-body font-medium text-secondary-text flex-1">{stat.label}</dt>
                      <dd className="font-display font-semibold text-primary text-lg whitespace-nowrap">
                        {formatNumber(stat.value)}
                        {stat.unit && <span className="font-body font-normal text-secondary-text text-sm ml-1">{stat.unit}</span>}
                      </dd>
                    </div>
                    <div className="mt-2 text-xs text-secondary-text flex items-center gap-2 flex-wrap">
                      <span>Per: <time dateTime={stat.asOfDate}>{formatDate(stat.asOfDate)}</time></span>
                      <span>Sumber: {stat.source.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-secondary-background">
                        {stat.source.category}
                      </span>
                    </div>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {region.eventImpacts && region.eventImpacts.length > 0 && (
            <section aria-labelledby="events-heading">
              <h3 id="events-heading" className="font-display font-medium text-base text-primary mb-3">
                Riwayat Bencana
              </h3>
              <div className="space-y-3">
                {region.eventImpacts.map((impact) => (
                  <article key={impact.eventId} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-body font-medium text-primary flex-1">{impact.eventName}</h4>
                      {impact.status && <StatusBadge status={getStatusLabel(impact.status)} />}
                    </div>
                    <dl className="grid grid-cols-2 gap-1 text-sm">
                      <dt className="text-secondary-text">Jenis</dt>
                      <dd className="font-medium capitalize">{impact.eventType.toLowerCase().replace(/_/g, ' ')}</dd>
                      <dt className="text-secondary-text">Kategori</dt>
                      <dd className="font-medium capitalize">{impact.eventNature.toLowerCase()}</dd>
                      <dt className="text-secondary-text">Terjadi</dt>
                      <dd><time dateTime={impact.occurredAt}>{formatDate(impact.occurredAt)}</time></dd>
                      {impact.affectedCount !== undefined && (
                        <>
                          <dt className="text-secondary-text">Terdampak</dt>
                          <dd className="font-medium">{formatNumber(impact.affectedCount)} jiwa</dd>
                        </>
                      )}
                      {impact.displacedCount !== undefined && (
                        <>
                          <dt className="text-secondary-text">Mengungsi</dt>
                          <dd className="font-medium">{formatNumber(impact.displacedCount)} jiwa</dd>
                        </>
                      )}
                      {impact.fatalitiesCount !== undefined && (
                        <>
                          <dt className="text-secondary-text">Meninggal</dt>
                          <dd className="font-medium">{formatNumber(impact.fatalitiesCount)} jiwa</dd>
                        </>
                      )}
                      {impact.damagedHouses !== undefined && (
                        <>
                          <dt className="text-secondary-text">Rumah rusak</dt>
                          <dd className="font-medium">{formatNumber(impact.damagedHouses)} unit</dd>
                        </>
                      )}
                    </dl>
                    {impact.notes && (
                      <p className="mt-2 text-sm text-secondary-text italic">{impact.notes}</p>
                    )}
                    {impact.source && (
                      <div className="mt-2 pt-2 border-t border-border text-xs text-secondary-text flex items-center gap-2 flex-wrap">
                        <span>Sumber: {impact.source.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-secondary-background">
                          {impact.source.category}
                        </span>
                        <time dateTime={impact.source.accessDate}>Diakses: {formatDate(impact.source.accessDate)}</time>
                        {isSafeHttpUrl(impact.source.url) && (
                          <a href={impact.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            Lihat sumber
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {!region.stats?.length && !region.eventImpacts?.length && (
            <div className="text-center py-8 text-secondary-text border border-border rounded-lg p-4">
              <svg className="w-10 h-10 mx-auto opacity-50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">
                Belum ada data statistik atau riwayat kejadian bencana yang terhubung di database untuk wilayah ini.
              </p>
              <Link href="/sumber" className="text-xs text-primary underline inline-block mt-2">
                Lihat Registri Sumber →
              </Link>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
