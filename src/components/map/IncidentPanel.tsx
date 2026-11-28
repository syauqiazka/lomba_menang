'use client';

import { useEffect } from 'react';
import type { DisasterIncidentDTO, IncidentCategory } from '@/types/map';
import { Button } from '@/components/ui/Button';
import {
  INARISK_HAZARD_LAYERS,
  formatCoordsLSBT,
  formatDateTimeWIB,
  formatDateTimeWIBWithSeconds,
  formatIndonesianDecimal,
  formatNumber,
} from '@/lib/map-utils';

interface IncidentPanelProps {
  incident: DisasterIncidentDTO | null;
  activeHazardLayer: IncidentCategory | null;
  onToggleHazardLayer: (cat: IncidentCategory | null) => void;
  onClose: () => void;
  onSelectRegion: (regionCode: string) => void;
}

const CATEGORY_STYLE: Record<IncidentCategory, { bg: string; text: string; border: string; dot: string }> = {
  FLOOD: { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd', dot: '#2563eb' },
  LANDSLIDE: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d', dot: '#d97706' },
  EARTHQUAKE: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5', dot: '#dc2626' },
  EXTREME_WEATHER: { bg: '#f5f3ff', text: '#6d28d9', border: '#c4b5fd', dot: '#7c3aed' },
  VOLCANO: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af', dot: '#be123c' },
  OTHER: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74', dot: '#ea580c' },
};

function isSafeHttpUrl(url?: string): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function IncidentPanel({
  incident,
  activeHazardLayer,
  onToggleHazardLayer,
  onClose,
  onSelectRegion,
}: IncidentPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!incident) return null;

  const badgeStyle = CATEGORY_STYLE[incident.category];
  const hazardMeta = INARISK_HAZARD_LAYERS[incident.category];
  const isHazardActive = activeHazardLayer === incident.category;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col"
      role="complementary"
      aria-label={`Detail titik bencana: ${incident.title}`}
    >
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold border"
              style={{
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.text,
                borderColor: badgeStyle.border,
              }}
            >
              {incident.categoryLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-border bg-secondary-background text-secondary-text">
              {incident.source.isLive ? 'Feed Resmi Live' : 'Snapshot Resmi'}
            </span>
          </div>
          <h2 className="font-display font-semibold text-base text-primary leading-snug">
            {incident.title}
          </h2>
          <p className="text-xs text-secondary-text mt-1">{incident.locationText}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          aria-label="Tutup panel titik bencana"
          className="min-w-[44px] min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Structured Metric Card (BMKG / BNPB style) */}
        <section aria-labelledby="incident-metrics-heading" className="border border-border rounded-lg bg-background divide-y divide-border">
          <h3 id="incident-metrics-heading" className="sr-only">
            Parameter dan Waktu Kejadian
          </h3>

          {incident.category === 'EARTHQUAKE' && incident.metrics?.magnitude && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#dc2626] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h3l3-7 4 14 3-7h5" />
                </svg>
                Magnitudo:
              </span>
              <span className="font-display font-bold text-primary">
                {formatIndonesianDecimal(incident.metrics.magnitude)}
              </span>
            </div>
          )}

          {incident.category === 'EARTHQUAKE' && incident.metrics?.depth && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#16a34a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <circle cx="12" cy="12" r="4" strokeWidth={2} />
                </svg>
                Kedalaman:
              </span>
              <span className="font-display font-bold text-primary">{incident.metrics.depth}</span>
            </div>
          )}

          {incident.category === 'EARTHQUAKE' && incident.metrics?.eventStatus && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
              <span className="text-secondary-text">Status Deteksi:</span>
              <span className="font-semibold text-primary text-right">{incident.metrics.eventStatus}</span>
            </div>
          )}

          {incident.category === 'EARTHQUAKE' && incident.metrics?.eventId && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
              <span className="text-secondary-text">ID Event BMKG:</span>
              <span className="font-mono font-medium text-primary">{incident.metrics.eventId}</span>
            </div>
          )}

          {incident.category === 'EARTHQUAKE' && typeof incident.metrics?.phaseCount === 'number' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
              <span className="text-secondary-text">Fase Seismik:</span>
              <span className="font-semibold text-primary">{incident.metrics.phaseCount} stasiun</span>
            </div>
          )}

          {incident.category === 'EARTHQUAKE' && incident.metrics?.focalMechanism === 'mt_yes' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
              <span className="text-secondary-text">Mekanisme Fokus:</span>
              <span className="font-semibold text-primary">Moment Tensor Tersedia</span>
            </div>
          )}

          {incident.category !== 'EARTHQUAKE' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white"
                  style={{ backgroundColor: badgeStyle.dot }}
                  aria-hidden="true"
                />
                Kategori Kejadian:
              </span>
              <span className="font-display font-bold text-primary">{incident.categoryLabel}</span>
            </div>
          )}

          {incident.metrics?.satellite && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#ea580c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 0110 10M12 6a6 6 0 016 6M12 10a2 2 0 012 2m-8 8l6-6" />
                </svg>
                Satelit:
              </span>
              <span className="font-display font-bold text-primary">{incident.metrics.satellite}</span>
            </div>
          )}

          {incident.metrics?.confidence && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#d97706] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kepercayaan:
              </span>
              <span className="font-display font-bold text-primary">{incident.metrics.confidence}</span>
            </div>
          )}

          {typeof incident.metrics?.frp === 'number' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#dc2626] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                Daya Radiasi (FRP):
              </span>
              <span className="font-display font-bold text-primary">
                {formatIndonesianDecimal(incident.metrics.frp.toFixed(1))} MW
              </span>
            </div>
          )}

          {incident.metrics?.alertLevel && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#be123c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
                Status Aktivitas:
              </span>
              <span className="font-display font-bold text-primary">{incident.metrics.alertLevel}</span>
            </div>
          )}

          {typeof incident.metrics?.elevationM === 'number' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#be123c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 20l6.5-11 4 6.5 2.5-4L21 20H3z" />
                </svg>
                Ketinggian Puncak:
              </span>
              <span className="font-display font-bold text-primary">
                {formatNumber(incident.metrics.elevationM)} mdpl
              </span>
            </div>
          )}

          {typeof incident.metrics?.hasVona === 'boolean' && incident.category === 'VOLCANO' && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#0284c7] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Peringatan Penerbangan (VONA):
              </span>
              <span className="font-display font-bold text-primary">
                {incident.metrics.hasVona ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>
          )}

          {incident.metrics?.validUntil && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
              <span className="inline-flex items-center gap-2 text-secondary-text">
                <svg className="w-4 h-4 text-[#7c3aed] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Berlaku s/d:
              </span>
              <time dateTime={incident.metrics.validUntil} className="font-semibold text-primary text-right">
                {formatDateTimeWIB(incident.metrics.validUntil)}
              </time>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
            <span className="inline-flex items-center gap-2 text-secondary-text">
              <svg className="w-4 h-4 text-[#ea580c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
                <circle cx="12" cy="11" r="2" strokeWidth={2} />
              </svg>
              Lokasi:
            </span>
            <span className="font-display font-bold text-primary font-mono text-xs sm:text-sm">
              {formatCoordsLSBT(incident.coordinates)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-2 text-secondary-text">
              <svg className="w-4 h-4 text-secondary-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Waktu Kejadian:
            </span>
            <time dateTime={incident.occurredAt} className="font-semibold text-primary text-right">
              {incident.category === 'EARTHQUAKE'
                ? formatDateTimeWIBWithSeconds(incident.occurredAt)
                : formatDateTimeWIB(incident.occurredAt)}
            </time>
          </div>

          <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs bg-secondary-background/40">
            <span className="text-secondary-text">Presisi Titik:</span>
            <span className="font-medium text-primary text-right">{incident.precisionLabel}</span>
          </div>
        </section>

        {/* Summary & Official Counts */}
        <section aria-labelledby="incident-summary-heading" className="space-y-3">
          <h3 id="incident-summary-heading" className="font-display font-medium text-sm text-primary">
            Ringkasan Dampak Resmi
          </h3>
          <p className="text-sm text-primary leading-relaxed">{incident.summary}</p>

          {incident.metrics &&
            (typeof incident.metrics.affectedCount === 'number' ||
              typeof incident.metrics.displacedCount === 'number' ||
              typeof incident.metrics.damagedHouses === 'number' ||
              typeof incident.metrics.fatalitiesCount === 'number' ||
              typeof incident.metrics.brightness === 'number' ||
              typeof incident.metrics.burnedAreaHa === 'number' ||
              Boolean(incident.metrics.airQualityPm25) ||
              Boolean(incident.metrics.feltAreas) ||
              Boolean(incident.metrics.potential)) && (
              <dl className="grid grid-cols-2 gap-2 text-xs border border-border rounded-lg p-3">
                {typeof incident.metrics.brightness === 'number' && (
                  <>
                    <dt className="text-secondary-text">Suhu Kecerahan</dt>
                    <dd className="font-semibold text-primary">
                      {formatIndonesianDecimal(incident.metrics.brightness.toFixed(1))} K
                    </dd>
                  </>
                )}
                {typeof incident.metrics.burnedAreaHa === 'number' && (
                  <>
                    <dt className="text-secondary-text">Luas Terbakar Prov. (SiPongi 2026)</dt>
                    <dd className="font-semibold text-primary">{formatNumber(incident.metrics.burnedAreaHa)} ha</dd>
                  </>
                )}
                {incident.metrics.airQualityPm25 && (
                  <>
                    <dt className="text-secondary-text">Kualitas Udara PM2.5 (BNPB)</dt>
                    <dd className="font-semibold text-primary">{incident.metrics.airQualityPm25}</dd>
                  </>
                )}
                {incident.metrics.potential && (
                  <>
                    <dt className="text-secondary-text">Potensi</dt>
                    <dd className="font-medium text-primary">{incident.metrics.potential}</dd>
                  </>
                )}
                {incident.metrics.feltAreas && (
                  <>
                    <dt className="text-secondary-text">Skala MMI BMKG</dt>
                    <dd className="font-medium text-primary">{incident.metrics.feltAreas}</dd>
                  </>
                )}
                {typeof incident.metrics.affectedCount === 'number' && (
                  <>
                    <dt className="text-secondary-text">Terdampak</dt>
                    <dd className="font-semibold text-primary">{formatNumber(incident.metrics.affectedCount)} jiwa</dd>
                  </>
                )}
                {typeof incident.metrics.displacedCount === 'number' && (
                  <>
                    <dt className="text-secondary-text">Mengungsi</dt>
                    <dd className="font-semibold text-primary">{formatNumber(incident.metrics.displacedCount)} jiwa</dd>
                  </>
                )}
                {typeof incident.metrics.damagedHouses === 'number' && (
                  <>
                    <dt className="text-secondary-text">Rumah Rusak</dt>
                    <dd className="font-semibold text-primary">{formatNumber(incident.metrics.damagedHouses)} unit</dd>
                  </>
                )}
                {typeof incident.metrics.fatalitiesCount === 'number' && incident.metrics.fatalitiesCount > 0 && (
                  <>
                    <dt className="text-secondary-text">Meninggal</dt>
                    <dd className="font-semibold text-primary">{formatNumber(incident.metrics.fatalitiesCount)} jiwa</dd>
                  </>
                )}
              </dl>
            )}
        </section>

        {/* Impact Spread + Official inaRISK Toggle */}
        <section aria-labelledby="incident-spread-heading" className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 id="incident-spread-heading" className="font-display font-medium text-sm text-primary">
              Sebaran Dampak &amp; Zona Rawan
            </h3>
            <span className="text-xs font-mono text-secondary-text">
              {incident.spreadRegions.length} kab/kota
            </span>
          </div>
          <p className="text-xs text-secondary-text leading-relaxed">
            {incident.spreadExplanation}
          </p>

          <button
            type="button"
            onClick={() => onToggleHazardLayer(isHazardActive ? null : incident.category)}
            aria-pressed={isHazardActive}
            className={`w-full min-h-[44px] px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
              isHazardActive
                ? 'bg-primary text-white border-primary'
                : 'bg-secondary-background/60 border-border text-primary hover:bg-secondary-background'
            }`}
          >
            <span>
              {isHazardActive
                ? `Sembunyikan ${hazardMeta.label} (inaRISK BNPB)`
                : `Tampilkan ${hazardMeta.label} (Merah–Kuning–Hijau inaRISK)`}
            </span>
            <span className="font-mono text-[11px]">{isHazardActive ? 'Aktif' : 'Off'}</span>
          </button>

          <p className="text-[11px] text-secondary-text leading-relaxed">
            Cincin jangkauan di peta bersifat indikatif dari parameter kejadian; gunakan layer inaRISK BNPB untuk zonasi bahaya resmi Merah (Tinggi) – Kuning (Sedang) – Hijau (Rendah).
          </p>

          {incident.spreadRegions.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
              {incident.spreadRegions.map((sr) => (
                <button
                  key={sr.code}
                  type="button"
                  onClick={() => onSelectRegion(sr.code)}
                  className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-secondary-background transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary truncate">
                      <span className="font-mono text-secondary-text mr-1.5">{sr.code}</span>
                      {sr.name}
                    </p>
                    {sr.summary && (
                      <p className="text-[11px] text-secondary-text truncate mt-0.5">{sr.summary}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-primary font-medium flex-shrink-0">Buka →</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Source Attribution & Update Time */}
        <section className="pt-3 border-t border-border text-xs text-secondary-text space-y-1.5">
          <p className="font-medium text-primary">Sumber Resmi &amp; Waktu Pembaruan</p>
          <p>{incident.source.title}</p>
          <p>
            Penerbit: <span className="text-primary font-medium">{incident.source.publisher}</span>
          </p>
          <p>
            Terakhir diperbarui:{' '}
            <time dateTime={incident.source.updatedAt} className="text-primary font-medium">
              {formatDateTimeWIB(incident.source.updatedAt)}
            </time>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {isSafeHttpUrl(incident.source.url) && (
              <a
                href={incident.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-primary underline hover:text-black"
              >
                Buka sumber resmi →
              </a>
            )}
            {isSafeHttpUrl(incident.metrics?.shakemapUrl) && (
              <a
                href={incident.metrics.shakemapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[#dc2626] underline hover:text-black"
              >
                Peta Guncangan (Shakemap) →
              </a>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
