'use client';

import Link from 'next/link';
import type { MapSummaryCounts } from '@/lib/map-data';
import { getStatusLabel } from '@/lib/map-utils';

interface MapLegendProps {
  className?: string;
  statusCounts?: MapSummaryCounts['statusCounts'];
}

export function MapLegend({ className = '', statusCounts }: MapLegendProps) {
  const legendItems = [
    {
      label: 'Tidak ada laporan',
      count: statusCounts?.tidakAdaLaporan,
      color: '#f8fafc',
      textColor: '#1a1a1a',
    },
    {
      label: getStatusLabel('DILAPORKAN_BELUM_MENERIMA_BANTUAN'),
      count: statusCounts?.belumMenerimaBantuan,
      color: '#fff3e0',
      textColor: '#ef6c00',
    },
    {
      label: getStatusLabel('AKSES_TERISOLIR'),
      count: statusCounts?.aksesTerisolir,
      color: '#ffebee',
      textColor: '#c62828',
    },
    {
      label: getStatusLabel('BELUM_TERVERIFIKASI'),
      count: statusCounts?.belumTerverifikasi,
      color: '#e2e8f0',
      textColor: '#475569',
    },
  ];

  return (
    <div className={`bg-background border border-border rounded-lg p-4 ${className}`} role="region" aria-label="Legenda peta">
      <h3 className="font-display font-semibold text-sm text-primary mb-3">Legenda Status Bantuan</h3>
      <div className="flex flex-col gap-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-5 h-5 rounded border flex-shrink-0"
                style={{
                  backgroundColor: item.color,
                  borderColor: item.textColor,
                }}
                aria-hidden="true"
              />
              <span className="text-sm font-body" style={{ color: item.textColor }}>
                {item.label}
              </span>
            </div>
            {typeof item.count === 'number' && (
              <span className="text-xs font-mono text-secondary-text whitespace-nowrap">
                {item.count} kab/kota
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border text-xs text-secondary-text space-y-1">
        <p><strong>Peta Dasar:</strong> OpenFreeMap &amp; OpenMapTiles (© kontributor OpenStreetMap) dengan cadangan vektor lokal offline.</p>
        <p><strong>Batas Administratif:</strong> Data administratif Indonesia dari Badan Informasi Geospasial (BIG) / BPS.</p>
        <p>
          <strong>Sumber Data Bencana:</strong> BMKG TEWS &amp; Nowcast CAP, PVMBG MAGMA Indonesia, RainViewer Radar, GDACS (UN OCHA / Copernicus), NASA FIRMS (VIIRS NOAA-20 &amp; MODIS), USGS, BNPB Geoportal (<code>gis.bnpb.go.id</code> &amp; inaRISK), serta SITABA Kementerian PU.{' '}
          <Link href="/sumber" className="text-primary underline hover:text-black">
            Lihat Registri Sumber →
          </Link>
        </p>
        <p><strong>Lisensi:</strong> Data geometri administratif untuk kepentingan publik. Data bencana mengikuti lisensi masing-masing sumber.</p>
      </div>
    </div>
  );
}