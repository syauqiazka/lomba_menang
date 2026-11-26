export type PublicStatus =
  | 'DILAPORKAN_BELUM_MENERIMA_BANTUAN'
  | 'AKSES_TERISOLIR'
  | 'BELUM_TERVERIFIKASI';

export type SourceCategory = 'OFFICIAL' | 'MEDIA' | 'RESEARCH' | 'EDITORIAL';

export interface StatDTO {
  key: string;
  label: string;
  value: string;
  unit?: string;
  asOfDate: string;
  source: {
    title: string;
    category: SourceCategory;
    url?: string;
  };
}

export interface RegionMapDTO {
  code: string;
  name: string;
  level: 'province' | 'regency';
  parentCode?: string;
  status?: PublicStatus;
  stats?: StatDTO[];
  centroid?: [number, number];
}

export interface MapFilters {
  status?: PublicStatus;
  provinceCode?: string;
}

export interface RegionDetailDTO extends RegionMapDTO {
  eventImpacts?: Array<{
    eventId: string;
    eventName: string;
    eventType: string;
    eventNature: string;
    occurredAt: string;
    status?: PublicStatus;
    affectedCount?: number;
    displacedCount?: number;
    injuredCount?: number;
    fatalitiesCount?: number;
    damagedHouses?: number;
    notes?: string;
    source?: {
      title: string;
      category: SourceCategory;
      url?: string;
      publicationDate?: string;
      accessDate: string;
    };
  }>;
}

export type MapViewport = {
  center: [number, number];
  zoom: number;
};