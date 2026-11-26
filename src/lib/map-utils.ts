import type { PublicStatus } from '@/types/map';

export const STATUS_FILL_COLOR: Record<PublicStatus, string> = {
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: '#fff3e0',
  AKSES_TERISOLIR: '#ffebee',
  BELUM_TERVERIFIKASI: '#f5f5f5',
};

export const STATUS_FILL_COLOR_DARK: Record<PublicStatus, string> = {
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: '#e65100',
  AKSES_TERISOLIR: '#b71c1c',
  BELUM_TERVERIFIKASI: '#757575',
};

export const STATUS_TEXT_COLOR: Record<PublicStatus, string> = {
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: '#ef6c00',
  AKSES_TERISOLIR: '#c62828',
  BELUM_TERVERIFIKASI: '#616161',
};

export const STATUS_BADGE_VARIANT: Record<PublicStatus, string> = {
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: 'status-dilaporkan',
  AKSES_TERISOLIR: 'status-terisolir',
  BELUM_TERVERIFIKASI: 'status-belum-terverifikasi',
};

export const STATUS_LABEL: Record<PublicStatus, string> = {
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: 'Dilaporkan belum menerima bantuan',
  AKSES_TERISOLIR: 'Akses terisolir',
  BELUM_TERVERIFIKASI: 'Belum terverifikasi',
};

export const DEFAULT_FILL_COLOR = '#e0e0e0';
export const DEFAULT_FILL_COLOR_DARK = '#616161';

export function getFillColor(status?: PublicStatus, dark = false): string {
  if (!status) return dark ? DEFAULT_FILL_COLOR_DARK : DEFAULT_FILL_COLOR;
  return dark ? STATUS_FILL_COLOR_DARK[status] : STATUS_FILL_COLOR[status];
}

export function getTextColor(status?: PublicStatus): string {
  if (!status) return '#1a1a1a';
  return STATUS_TEXT_COLOR[status];
}

export function getBadgeVariant(status?: PublicStatus): string {
  if (!status) return 'neutral';
  return STATUS_BADGE_VARIANT[status];
}

export function getStatusLabel(status?: PublicStatus): string {
  if (!status) return 'Tidak ada laporan';
  return STATUS_LABEL[status];
}

export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '–';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} jt`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)} rb`;
  return num.toLocaleString('id-ID');
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export const INDONESIA_CENTER: [number, number] = [118.0, -2.0];
export const INDONESIA_ZOOM = 4.2;