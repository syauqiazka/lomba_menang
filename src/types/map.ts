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

export type IncidentCategory =
  | 'FLOOD'
  | 'LANDSLIDE'
  | 'EARTHQUAKE'
  | 'EXTREME_WEATHER'
  | 'VOLCANO'
  | 'OTHER';

export type LocationPrecision =
  | 'OFFICIAL_GPS_POINT'
  | 'EXACT_EPICENTER'
  | 'OFFICIAL_VOLCANO_STATION'
  | 'SATELLITE_HOTSPOT'
  | 'BMKG_NOWCAST_AREA'
  | 'REGENCY_CENTROID';

export interface SpreadRegionDTO {
  code: string;
  name: string;
  provinceCode: string;
  centroid?: [number, number];
  summary?: string;
}

export interface DisasterIncidentDTO {
  id: string;
  title: string;
  category: IncidentCategory;
  categoryLabel: string;
  coordinates: [number, number]; // [lng, lat]
  precision: LocationPrecision;
  precisionLabel: string;
  occurredAt: string;
  locationText: string;
  regionCode?: string;
  provinceCode?: string;
  summary: string;
  metrics?: {
    magnitude?: string;
    depth?: string;
    feltAreas?: string;
    potential?: string;
    affectedCount?: number;
    displacedCount?: number;
    fatalitiesCount?: number;
    damagedHouses?: number;
    satellite?: string;
    confidence?: 'Tinggi' | 'Sedang' | 'Rendah';
    frp?: number;
    brightness?: number;
    burnedAreaHa?: number;
    airQualityPm25?: string;
    alertLevel?: string;
    elevationM?: number;
    hasVona?: boolean;
    validUntil?: string;
    gdacsAlert?: string;
  };
  spreadRegions: SpreadRegionDTO[];
  spreadExplanation: string;
  source: {
    title: string;
    publisher: string;
    url: string;
    category: SourceCategory;
    isLive: boolean;
    updatedAt: string;
  };
}

export interface IncidentsFeedResponse {
  updatedAt: string;
  liveStatus: {
    bmkg: 'live' | 'snapshot';
    bmkgNowcast: 'live' | 'snapshot';
    magmaVolcano: 'live' | 'snapshot';
    gdacs: 'live' | 'snapshot';
    rainViewer: 'live' | 'unavailable';
    bnpbWeekly: 'live' | 'snapshot';
    nasaFirms: 'live' | 'snapshot';
    usgs: 'live' | 'snapshot';
    puAccess: 'snapshot';
    nttGempa: 'snapshot';
  };
  weatherRadar?: {
    tileUrl: string;
    updatedAt: string;
    host: string;
    path: string;
  } | null;
  nowcastPolygons?: GeoJSON.FeatureCollection;
  datesAvailable?: string[];
  countsByCategory: Record<IncidentCategory, number>;
  incidents: DisasterIncidentDTO[];
}