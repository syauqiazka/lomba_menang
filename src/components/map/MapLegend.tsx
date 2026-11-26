'use client';

import { getStatusLabel } from '@/lib/map-utils';

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className = '' }: MapLegendProps) {
  const legendItems = [
    { label: 'Tidak ada laporan', color: '#e0e0e0', textColor: '#1a1a1a' },
    { label: getStatusLabel('DILAPORKAN_BELUM_MENERIMA_BANTUAN'), color: '#fff3e0', textColor: '#ef6c00' },
    { label: getStatusLabel('AKSES_TERISOLIR'), color: '#ffebee', textColor: '#c62828' },
    { label: getStatusLabel('BELUM_TERVERIFIKASI'), color: '#f5f5f5', textColor: '#616161' },
  ];

  return (
    <div className={`bg-background border border-border rounded-lg p-4 ${className}`} role="region" aria-label="Legenda peta">
      <h3 className="font-display font-semibold text-sm text-primary mb-3">Legenda Status Bantuan</h3>
      <div className="flex flex-col gap-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
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
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border text-xs text-secondary-text space-y-1">
        <p><strong>Sumber Data Geometri:</strong> Data administratif Indonesia dari Badan Informasi Geospasial (BIG) / Ina-GEO.</p>
        <p><strong>Sumber Data Bencana:</strong> BNPB, BPBD provinsi/kabupaten, media terpercaya, penelitian akademis.</p>
        <p><strong>Lisensi:</strong> Data geometri administratif untuk kepentingan publik. Data bencana mengikuti lisensi masing-masing sumber.</p>
      </div>
    </div>
  );
}