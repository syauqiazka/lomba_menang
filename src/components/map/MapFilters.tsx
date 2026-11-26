'use client';

import { useState, useEffect } from 'react';
import { PublicStatus } from '@/types/map';
import { Button } from '@/components/ui/Button';
import { getAllProvinceCodes } from '@/lib/indonesian-admin-codes';

interface MapFiltersProps {
  initialStatus?: PublicStatus;
  initialProvince?: string;
  onFilterChange: (filters: { status?: PublicStatus; provinceCode?: string }) => void;
  loading?: boolean;
}

export function MapFilters({ initialStatus, initialProvince, onFilterChange, loading }: MapFiltersProps) {
  const [status, setStatus] = useState<PublicStatus | ''>(initialStatus ?? '');
  const [province, setProvince] = useState<string>(initialProvince ?? '');
  const [provinces, setProvinces] = useState<{ code: string; name: string }[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);

  useEffect(() => {
    async function loadProvinces() {
      try {
        const codes = await getAllProvinceCodes();
        const provinceData = codes.map((code) => {
          const match = INDONESIAN_PROVINCES.find((p) => p.code === code);
          return { code, name: match?.name ?? code };
        });
        setProvinces(provinceData);
      } catch (error) {
        console.error('Failed to load provinces:', error);
      } finally {
        setProvincesLoading(false);
      }
    }
    loadProvinces();
  }, []);

  useEffect(() => {
    const filters: { status?: PublicStatus; provinceCode?: string } = {};
    if (status) filters.status = status;
    if (province) filters.provinceCode = province;
    onFilterChange(filters);
  }, [status, province, onFilterChange]);

  const handleReset = () => {
    setStatus('');
    setProvince('');
  };

  const hasActiveFilters = status || province;

  return (
    <div className="bg-background border border-border rounded-lg p-4" role="search" aria-label="Filter peta">
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-primary mb-1">
            Filter Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as PublicStatus | '')}
            disabled={loading}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter status bantuan"
          >
            <option value="">Semua Status</option>
            <option value="DILAPORKAN_BELUM_MENERIMA_BANTUAN">Dilaporkan belum menerima bantuan</option>
            <option value="AKSES_TERISOLIR">Akses terisolir</option>
            <option value="BELUM_TERVERIFIKASI">Belum terverifikasi</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="province-filter" className="block text-sm font-medium text-primary mb-1">
            Filter Provinsi
          </label>
          <select
            id="province-filter"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={loading || provincesLoading}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-primary focus:ring-2 focus:ring-primary focus:border-transparent transition"
            aria-label="Filter provinsi"
          >
            <option value="">Semua Provinsi</option>
            {provincesLoading ? (
              <option value="" disabled>Memuat daftar provinsi...</option>
            ) : (
              provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))
            )}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
        <Button variant="secondary" size="sm" onClick={handleReset} className="w-full sm:w-auto">
          Reset Filter
        </Button>
      )}
    </div>
  );
}

const INDONESIAN_PROVINCES = [
  { code: "11", name: "Aceh" },
  { code: "12", name: "Sumatera Utara" },
  { code: "13", name: "Sumatera Barat" },
  { code: "14", name: "Riau" },
  { code: "15", name: "Jambi" },
  { code: "16", name: "Sumatera Selatan" },
  { code: "17", name: "Bengkulu" },
  { code: "18", name: "Lampung" },
  { code: "19", name: "Kepulauan Bangka Belitung" },
  { code: "21", name: "Kepulauan Riau" },
  { code: "31", name: "DKI Jakarta" },
  { code: "32", name: "Jawa Barat" },
  { code: "33", name: "Jawa Tengah" },
  { code: "34", name: "DI Yogyakarta" },
  { code: "35", name: "Jawa Timur" },
  { code: "36", name: "Banten" },
  { code: "51", name: "Bali" },
  { code: "52", name: "Nusa Tenggara Barat" },
  { code: "53", name: "Nusa Tenggara Timur" },
  { code: "61", name: "Kalimantan Barat" },
  { code: "62", name: "Kalimantan Tengah" },
  { code: "63", name: "Kalimantan Selatan" },
  { code: "64", name: "Kalimantan Timur" },
  { code: "65", name: "Kalimantan Utara" },
  { code: "71", name: "Sulawesi Utara" },
  { code: "72", name: "Sulawesi Tengah" },
  { code: "73", name: "Sulawesi Selatan" },
  { code: "74", name: "Sulawesi Tenggara" },
  { code: "75", name: "Gorontalo" },
  { code: "76", name: "Sulawesi Barat" },
  { code: "81", name: "Maluku" },
  { code: "82", name: "Maluku Utara" },
  { code: "91", name: "Papua Barat" },
  { code: "92", name: "Papua" },
  { code: "93", name: "Papua Tengah" },
  { code: "94", name: "Papua Pegunungan" },
  { code: "95", name: "Papua Selatan" },
  { code: "96", name: "Papua Barat Daya" },
];