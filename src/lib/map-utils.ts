import type { PublicStatus, IncidentCategory, DisasterIncidentDTO } from '@/types/map';

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

export const INDONESIA_CENTER: [number, number] = [118.0, -2.5];
export const INDONESIA_ZOOM = 4.0;
export const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [94.8, -11.2],
  [141.2, 6.2],
];

export type BasemapMode = 'liberty' | 'minimal';

export const BASEMAP_STYLE_URL: Record<BasemapMode, string> = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  minimal: '/map/style.json',
};

export const CASE_STUDY_BY_PROVINCE: Record<
  string,
  { slug: string; title: string; href: string }
> = {
  '11': {
    slug: 'aceh-2026',
    title: 'Studi Kasus: Banjir & Longsor Aceh 2026',
    href: '/kasus/aceh-2026',
  },
  '53': {
    slug: 'ntt-2026',
    title: 'Studi Kasus: Gempa Flores NTT 2026',
    href: '/kasus/ntt-2026',
  },
};

function walkCoordinates(
  coords: unknown,
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number; found: boolean }
): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const lng = coords[0];
    const lat = coords[1];
    if (lng < bounds.minLng) bounds.minLng = lng;
    if (lng > bounds.maxLng) bounds.maxLng = lng;
    if (lat < bounds.minLat) bounds.minLat = lat;
    if (lat > bounds.maxLat) bounds.maxLat = lat;
    bounds.found = true;
    return;
  }
  for (const child of coords) {
    walkCoordinates(child, bounds);
  }
}

export function computeGeoJSONBounds(
  geojsonOrGeometry: unknown
): [[number, number], [number, number]] | null {
  if (!geojsonOrGeometry || typeof geojsonOrGeometry !== 'object') return null;
  const obj = geojsonOrGeometry as {
    type?: string;
    coordinates?: unknown;
    geometry?: unknown;
    features?: Array<{ geometry?: unknown }>;
  };

  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
    found: false,
  };

  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    for (const feat of obj.features) {
      if (feat.geometry && typeof feat.geometry === 'object') {
        walkCoordinates((feat.geometry as { coordinates?: unknown }).coordinates, bounds);
      }
    }
  } else if (obj.type === 'Feature' && obj.geometry && typeof obj.geometry === 'object') {
    walkCoordinates((obj.geometry as { coordinates?: unknown }).coordinates, bounds);
  } else if (obj.coordinates) {
    walkCoordinates(obj.coordinates, bounds);
  }

  if (!bounds.found) return null;
  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}

export function buildIndonesiaGraticule(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (let lng = 95; lng <= 140; lng += 5) {
    features.push({
      type: 'Feature',
      properties: { kind: 'meridian', value: lng, isEquator: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [lng, -13],
          [lng, 8],
        ],
      },
    });
  }

  for (let lat = -10; lat <= 5; lat += 5) {
    features.push({
      type: 'Feature',
      properties: { kind: 'parallel', value: lat, isEquator: lat === 0 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [92, lat],
          [143, lat],
        ],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function formatDateTimeWIB(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    const datePart = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
      .format(date)
      .replace(':', '.');
    return `${datePart} pukul ${timePart} WIB`;
  } catch {
    return isoString;
  }
}

export function formatIndonesianDecimal(value: string | number): string {
  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value).replace('.', ',');
  return String(value).replace('.', ',');
}

export function formatCoordsLSBT(coords: [number, number]): string {
  const [lng, lat] = coords;
  const latDir = lat < 0 ? 'LS' : 'LU';
  const lngDir = lng >= 0 ? 'BT' : 'BB';
  const latStr = Math.abs(lat).toFixed(2).replace('.', ',');
  const lngStr = Math.abs(lng).toFixed(2).replace('.', ',');
  return `${latStr} ${latDir}–${lngStr} ${lngDir}`;
}

export function buildGeodesicCircle(
  center: [number, number],
  radiusKm: number,
  steps = 64
): [number, number][] {
  const earthRadiusKm = 6371.0088;
  const latRad = (center[1] * Math.PI) / 180;
  const lngRad = (center[0] * Math.PI) / 180;
  const angularDist = radiusKm / earthRadiusKm;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinAd = Math.sin(angularDist);
  const cosAd = Math.cos(angularDist);

  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const destLat = Math.asin(sinLat * cosAd + cosLat * sinAd * Math.cos(bearing));
    const destLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * sinAd * cosLat,
        cosAd - sinLat * Math.sin(destLat)
      );
    ring.push([(destLng * 180) / Math.PI, (destLat * 180) / Math.PI]);
  }
  if (ring.length > 0) {
    ring[ring.length - 1] = [...ring[0]];
  }
  return ring;
}

export const INARISK_HAZARD_LAYERS: Record<
  IncidentCategory,
  { service: string; label: string; tileUrl: string }
> = {
  FLOOD: {
    service: 'inarisk/layer_bahaya_banjir_30',
    label: 'Zona Bahaya Banjir',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
  LANDSLIDE: {
    service: 'inarisk/layer_bahaya_tanah_longsor_30',
    label: 'Zona Bahaya Tanah Longsor',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanah_longsor_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
  EARTHQUAKE: {
    service: 'inarisk/layer_bahaya_gempabumi_30',
    label: 'Zona Bahaya Gempabumi',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
  EXTREME_WEATHER: {
    service: 'inarisk/layer_bahaya_cuaca_ekstrim_30',
    label: 'Zona Bahaya Cuaca Ekstrem',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_cuaca_ekstrim_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
  VOLCANO: {
    service: 'inarisk/layer_bahaya_letusan_gunungapi_30',
    label: 'Zona Bahaya Gunungapi',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_letusan_gunungapi_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
  OTHER: {
    service: 'inarisk/layer_bahaya_kebakaran_hutan_dan_lahan_30',
    label: 'Zona Bahaya Karhutla',
    tileUrl:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_kebakaran_hutan_dan_lahan_30/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image',
  },
};

export function buildIncidentImpactRings(incident: DisasterIncidentDTO): GeoJSON.FeatureCollection {
  let color = '#ea580c';
  let radiiKm: number[];

  if (incident.category === 'EARTHQUAKE') {
    color = '#dc2626';
    const rawMag = incident.metrics?.magnitude
      ? Number.parseFloat(incident.metrics.magnitude.replace(',', '.'))
      : incident.title.includes('NTT 2026')
        ? 7.7
        : 5.0;
    const mag = Number.isFinite(rawMag) ? rawMag : 5.0;
    const baseKm = Math.max(18, Math.min(120, Math.round(Math.pow(10, 0.42 * mag - 0.85))));
    radiiKm = [0.22, 0.45, 0.72, 1.05, 1.45].map((f) => Math.max(4, Math.round(baseKm * f)));
  } else if (incident.category === 'FLOOD') {
    color = '#2563eb';
    radiiKm = incident.precision === 'OFFICIAL_GPS_POINT' ? [2.5, 6, 11] : [6, 14, 24];
  } else if (incident.category === 'LANDSLIDE') {
    color = '#d97706';
    radiiKm = incident.precision === 'OFFICIAL_GPS_POINT' ? [1.5, 4, 8] : [5, 11, 20];
  } else if (incident.category === 'EXTREME_WEATHER') {
    color = '#7c3aed';
    radiiKm = [5, 12, 22];
  } else if (incident.category === 'VOLCANO') {
    color = '#be123c';
    const lvl = incident.metrics?.alertLevel?.toLowerCase() ?? '';
    radiiKm = lvl.includes('awas')
      ? [5, 10, 18]
      : lvl.includes('siaga')
        ? [4, 8, 14]
        : [3, 6, 10];
  } else {
    color = '#ea580c';
    radiiKm = [5, 12, 22];
  }

  // Build outermost rings first so inner rings sit crisply on top
  const features: GeoJSON.Feature[] = [];
  const total = radiiKm.length;
  for (let i = total - 1; i >= 0; i--) {
    const t = total > 1 ? i / (total - 1) : 0; // 0 = inner, 1 = outer
    const radiusKm = radiiKm[i];
    features.push({
      type: 'Feature',
      properties: {
        ringIndex: i + 1,
        radiusKm,
        color,
        fillOpacity: Number((0.14 - t * 0.11).toFixed(3)),
        lineOpacity: Number((0.88 - t * 0.56).toFixed(3)),
        lineWidth: i === 0 ? 2.2 : 1.5,
        label: `Radius ~${radiusKm} km`,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [buildGeodesicCircle(incident.coordinates, radiusKm)],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
