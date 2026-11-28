'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  RegionMapDTO,
  RegionDetailDTO,
  PublicStatus,
  DisasterIncidentDTO,
  IncidentCategory,
  IncidentsFeedResponse,
} from '@/types/map';
import type { MapSummaryCounts } from '@/lib/map-data';
import { MapFallback } from './MapFallback';
import { MapFilters } from './MapFilters';
import { MapLegend } from './MapLegend';
import { RegionPanel } from './RegionPanel';
import { IncidentPanel } from './IncidentPanel';
import { StatusBadge } from '@/components/ui/Badge';
import {
  useMapInteraction,
  type MapHoverInfo,
  type MapCursorCoords,
} from '@/hooks/useMapInteraction';
import {
  BASEMAP_STYLE_URL,
  INARISK_HAZARD_LAYERS,
  INDONESIA_BOUNDS,
  INDONESIA_CENTER,
  INDONESIA_ZOOM,
  buildIncidentImpactRings,
  buildIndonesiaGraticule,
  computeGeoJSONBounds,
  formatCoordsLSBT,
  formatDateTimeWIB,
  formatIndonesianDecimal,
  getStatusLabel,
  type BasemapMode,
} from '@/lib/map-utils';

interface DisasterMapProps {
  initialRegions: RegionMapDTO[];
  initialRegencies: RegionMapDTO[];
  summaryCounts: MapSummaryCounts;
  initialFilters?: { status?: PublicStatus; provinceCode?: string };
}

interface GeoJSONFeatureProps {
  code?: string;
  name?: string;
  level?: string;
  parentCode?: string;
  provinceCode?: string;
  status?: PublicStatus | null;
}

const ANCHOR_PROVINCE_CODES = new Set([
  '11',
  '12',
  '16',
  '31',
  '35',
  '51',
  '53',
  '61',
  '64',
  '73',
  '81',
  '91',
  '94',
]);

const INCIDENT_CATEGORY_META: Array<{
  key: IncidentCategory | 'ALL';
  label: string;
  color: string;
}> = [
  { key: 'ALL', label: 'Semua', color: '#0f172a' },
  { key: 'FLOOD', label: 'Banjir', color: '#2563eb' },
  { key: 'LANDSLIDE', label: 'Longsor & Akses', color: '#d97706' },
  { key: 'EARTHQUAKE', label: 'Gempabumi', color: '#dc2626' },
  { key: 'EXTREME_WEATHER', label: 'Cuaca Ekstrem', color: '#7c3aed' },
  { key: 'VOLCANO', label: 'Gunung Api', color: '#be123c' },
  { key: 'OTHER', label: 'Karhutla (Satelit)', color: '#ea580c' },
];

const INCIDENT_COLOR_BY_CATEGORY: Record<IncidentCategory, string> = {
  FLOOD: '#2563eb',
  LANDSLIDE: '#d97706',
  EARTHQUAKE: '#dc2626',
  EXTREME_WEATHER: '#7c3aed',
  VOLCANO: '#be123c',
  OTHER: '#ea580c',
};

function getFirstSymbolLayerId(map: maplibregl.Map): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  return layers.find((layer) => layer.type === 'symbol')?.id;
}

function getRegencyInsertBeforeId(map: maplibregl.Map): string | undefined {
  if (map.getLayer('bmkg-nowcast-fill')) return 'bmkg-nowcast-fill';
  if (map.getLayer('incident-impact-rings-fill')) return 'incident-impact-rings-fill';
  if (map.getLayer('incident-spread-lines')) return 'incident-spread-lines';
  if (map.getLayer('disaster-incidents-clusters')) return 'disaster-incidents-clusters';
  if (map.getLayer('disaster-incidents-halo')) return 'disaster-incidents-halo';
  return getFirstSymbolLayerId(map);
}

function getWibDateString(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function escapeCsvField(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function setProvinceLayersFilter(
  map: maplibregl.Map,
  activeProvinceCode: string | null,
  basemapMode: BasemapMode
) {
  const filter: maplibregl.FilterSpecification | null = activeProvinceCode
    ? ['!=', 'code', activeProvinceCode]
    : null;
  for (const layerId of ['province-coastal-halo', 'province-fill', 'province-boundary']) {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, filter);
    }
  }
  if (map.getLayer('province-fill')) {
    if (basemapMode === 'minimal') {
      map.setPaintProperty('province-fill', 'fill-opacity', activeProvinceCode ? 0.45 : 0.95);
    } else {
      map.setPaintProperty('province-fill', 'fill-opacity', 1);
    }
  }
}

export function DisasterMap({
  initialRegions,
  initialRegencies,
  summaryCounts,
  initialFilters,
}: DisasterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapInitialized = useRef(false);
  const mapLoadedRef = useRef(false);
  const provinceFeaturesRef = useRef<Map<string, GeoJSON.Feature>>(new Map());
  const regencyFeaturesRef = useRef<Map<string, GeoJSON.Feature>>(new Map());

  const [regions] = useState<RegionMapDTO[]>(initialRegions);
  const [loadedRegencies, setLoadedRegencies] = useState<RegionMapDTO[]>(initialRegencies);
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('liberty');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PublicStatus | ''>(initialFilters?.status ?? '');
  const [activeProvinceCode, setActiveProvinceCode] = useState<string>(
    initialFilters?.provinceCode ?? ''
  );
  const activeProvinceRef = useRef(activeProvinceCode);
  const [selectedCode, setSelectedCode] = useState<string | null>(initialFilters?.provinceCode ?? null);
  const selectedCodeRef = useRef<string | null>(initialFilters?.provinceCode ?? null);
  const selectedFeatureStateRef = useRef<{ source: string; id: string } | null>(null);
  const [regencyLayerRev, setRegencyLayerRev] = useState(0);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [viewport, setViewport] = useState({ center: INDONESIA_CENTER, zoom: INDONESIA_ZOOM });
  const [cursorCoords, setCursorCoords] = useState<MapCursorCoords | null>(null);
  const [hoverInfo, setHoverInfo] = useState<MapHoverInfo | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [mapWarning, setMapWarning] = useState<string | null>(null);
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [webglAvailable, setWebglAvailable] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      return Boolean(gl);
    } catch {
      return false;
    }
  });
  const [showFallback, setShowFallback] = useState(false);
  const [detailRegion, setDetailRegion] = useState<RegionDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [incidentsData, setIncidentsData] = useState<IncidentsFeedResponse | null>(null);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [showIncidents, setShowIncidents] = useState(true);
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory | 'ALL'>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'Tinggi' | 'Sedang'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [clusterPoints, setClusterPoints] = useState<boolean>(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeHazardLayer, setActiveHazardLayer] = useState<IncidentCategory | null>(null);
  const [showWeatherRadar, setShowWeatherRadar] = useState(false);
  const [showNowcastPolygons, setShowNowcastPolygons] = useState(true);
  const incidentsByIdRef = useRef<Map<string, DisasterIncidentDTO>>(new Map());
  const incidentPopupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    activeProvinceRef.current = activeProvinceCode;
  }, [activeProvinceCode]);

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  const applyIncidentsPayload = useCallback((payload: IncidentsFeedResponse) => {
    setIncidentsData(payload);
    incidentsByIdRef.current = new Map(payload.incidents.map((inc) => [inc.id, inc]));
  }, []);

  const handleManualRefreshIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    try {
      const resp = await fetch('/api/map/incidents?refresh=1');
      if (!resp.ok) return;
      const payload = (await resp.json()) as IncidentsFeedResponse;
      applyIncidentsPayload(payload);
    } catch (error) {
      console.error('Failed to refresh disaster incidents feed:', error);
    } finally {
      setIncidentsLoading(false);
    }
  }, [applyIncidentsPayload]);

  useEffect(() => {
    let cancelled = false;
    const pullLatest = async () => {
      try {
        const resp = await fetch('/api/map/incidents');
        if (!resp.ok || cancelled) return;
        const payload = (await resp.json()) as IncidentsFeedResponse;
        if (!cancelled) applyIncidentsPayload(payload);
      } catch (error) {
        console.error('Failed to fetch disaster incidents feed:', error);
      }
    };
    void pullLatest();
    const timer = window.setInterval(() => {
      void pullLatest();
    }, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyIncidentsPayload]);

  const visibleIncidents = useMemo(() => {
    if (!showIncidents || !incidentsData) return [];
    const refMs = new Date(incidentsData.updatedAt).getTime();
    return incidentsData.incidents.filter((inc) => {
      if (incidentCategory !== 'ALL' && inc.category !== incidentCategory) return false;
      if (activeProvinceCode && inc.provinceCode !== activeProvinceCode) return false;
      if (confidenceFilter !== 'ALL' && inc.metrics?.confidence !== confidenceFilter) {
        return false;
      }
      if (dateFilter !== 'ALL') {
        const incMs = new Date(inc.occurredAt).getTime();
        if (dateFilter === '24H') {
          if (incMs < refMs - 24 * 3600_000) return false;
        } else if (dateFilter === '7D') {
          if (incMs < refMs - 7 * 24 * 3600_000) return false;
        } else if (dateFilter === '30D') {
          if (incMs < refMs - 30 * 24 * 3600_000) return false;
        } else if (getWibDateString(inc.occurredAt) !== dateFilter) {
          return false;
        }
      }
      return true;
    });
  }, [showIncidents, incidentsData, incidentCategory, activeProvinceCode, confidenceFilter, dateFilter]);

  const handleDownloadIncidentsCsv = useCallback(() => {
    const header = [
      'ID',
      'Judul',
      'Kategori',
      'Lokasi',
      'Kode_Provinsi',
      'Kode_KabKota',
      'Lintang',
      'Bujur',
      'Presisi',
      'Waktu_WIB',
      'Sumber',
      'Feed_Live',
      'Kepercayaan',
      'FRP_MW',
      'Magnitudo',
      'Level_Gunung_Api',
    ];
    const rows = visibleIncidents.map((inc) =>
      [
        inc.id,
        inc.title,
        inc.categoryLabel,
        inc.locationText,
        inc.provinceCode ?? '',
        inc.regionCode ?? '',
        inc.coordinates[1].toFixed(5),
        inc.coordinates[0].toFixed(5),
        inc.precisionLabel,
        formatDateTimeWIB(inc.occurredAt),
        inc.source.publisher,
        inc.source.isLive ? 'Live' : 'Snapshot',
        inc.metrics?.confidence ?? '',
        typeof inc.metrics?.frp === 'number' ? inc.metrics.frp.toFixed(1) : '',
        inc.metrics?.magnitude ?? '',
        inc.metrics?.alertLevel ?? '',
      ]
        .map(escapeCsvField)
        .join(',')
    );
    const csv = `\uFEFF${[header.join(','), ...rows].join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `titik-bencana-${dateFilter.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [visibleIncidents, dateFilter]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId || !incidentsData) return null;
    return incidentsData.incidents.find((inc) => inc.id === selectedIncidentId) ?? null;
  }, [selectedIncidentId, incidentsData]);

  const allRegions = useMemo(() => {
    const byCode = new Map<string, RegionMapDTO>();
    for (const r of regions) byCode.set(r.code, r);
    for (const r of loadedRegencies) byCode.set(r.code, r);
    return Array.from(byCode.values());
  }, [regions, loadedRegencies]);

  const provinceNameByCode = useMemo(
    () => new Map(regions.map((r) => [r.code, r.name])),
    [regions]
  );

  const provinceOptions = useMemo(
    () =>
      regions
        .filter((r) => r.level === 'province')
        .map((r) => ({ code: r.code, name: r.name }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [regions]
  );

  const isGlobalSearch = sidebarQuery.trim().length > 0;

  const sidebarRegions = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (q) {
      const matches = allRegions.filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        const parentName = r.parentCode ? (provinceNameByCode.get(r.parentCode) ?? '') : '';
        return (
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          parentName.toLowerCase().includes(q)
        );
      });

      matches.sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        if (a.level !== b.level) return a.level === 'province' ? -1 : 1;
        return a.name.localeCompare(b.name, 'id');
      });

      return matches.slice(0, 80);
    }

    const base = activeProvinceCode
      ? loadedRegencies.filter((r) => r.parentCode === activeProvinceCode)
      : regions;
    if (!statusFilter) return base;
    return base.filter((r) => r.status === statusFilter);
  }, [
    allRegions,
    activeProvinceCode,
    loadedRegencies,
    regions,
    statusFilter,
    sidebarQuery,
    provinceNameByCode,
  ]);

  const fetchRegionDetail = useCallback(async (code: string) => {
    setDetailLoading(true);
    try {
      const resp = await fetch(`/api/map/regions/${encodeURIComponent(code)}`);
      if (!resp.ok) return;
      const payload = (await resp.json()) as {
        region?: RegionDetailDTO;
        regencies?: RegionMapDTO[];
      };
      if (payload.region) {
        setDetailRegion(payload.region);
      }
      if (payload.regencies && payload.regencies.length > 0) {
        setLoadedRegencies((prev) => {
          const merged = new Map(prev.map((r) => [r.code, r]));
          for (const reg of payload.regencies!) merged.set(reg.code, reg);
          return Array.from(merged.values());
        });
      }
    } catch (error) {
      console.error('Failed to fetch region detail:', error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fitFeatureOrCentroid = useCallback(
    (map: maplibregl.Map, code: string, level: 'province' | 'regency', centroid?: [number, number]) => {
      const feat =
        level === 'province'
          ? provinceFeaturesRef.current.get(code)
          : regencyFeaturesRef.current.get(code);
      const bounds = feat ? computeGeoJSONBounds(feat) : null;
      if (bounds) {
        map.fitBounds(bounds, {
          padding: level === 'province' ? 48 : 64,
          maxZoom: level === 'province' ? 8.5 : 10.5,
          duration: reducedMotion ? 0 : 700,
        });
        return;
      }
      if (centroid) {
        if (reducedMotion) {
          map.jumpTo({ center: centroid, zoom: level === 'province' ? 6.5 : 8.5 });
        } else {
          map.flyTo({ center: centroid, zoom: level === 'province' ? 6.5 : 8.5, duration: 700 });
        }
      }
    },
    [reducedMotion]
  );

  const hideAllRegencyLayers = useCallback((map: maplibregl.Map, keepProvinceCode?: string) => {
    const layers = map.getStyle()?.layers ?? [];
    for (const layer of layers) {
      if (
        layer.id.startsWith('regency-fill-') ||
        layer.id.startsWith('regency-boundary-') ||
        layer.id.startsWith('regency-selected-') ||
        layer.id.startsWith('regency-spread-')
      ) {
        const matchesKeep = keepProvinceCode && layer.id.endsWith(`-${keepProvinceCode}`);
        map.setLayoutProperty(layer.id, 'visibility', matchesKeep ? 'visible' : 'none');
      }
    }
  }, []);

  const loadRegenciesForProvince = useCallback(
    async (
      map: maplibregl.Map,
      provinceCode: string,
      mode: BasemapMode,
      options?: { skipDetailUpdate?: boolean }
    ) => {
      const sourceId = `regencies-${provinceCode}`;
      hideAllRegencyLayers(map, provinceCode);

      if (map.getSource(sourceId)) {
        setActiveProvinceCode(provinceCode);
        setProvinceLayersFilter(map, provinceCode, mode);
        setRegencyLayerRev((v) => v + 1);
        return;
      }

      try {
        const [geoResp, apiResp] = await Promise.all([
          fetch(`/geo/regencies/${provinceCode}.geojson`),
          fetch(`/api/map/regions/${encodeURIComponent(provinceCode)}`),
        ]);
        if (!geoResp.ok) {
          throw new Error(`Gagal memuat batas kab/kota untuk provinsi ${provinceCode}`);
        }
        const geoData = (await geoResp.json()) as GeoJSON.FeatureCollection;

        let dbRegencies: RegionMapDTO[] = [];
        if (apiResp.ok) {
          const apiPayload = (await apiResp.json()) as {
            region?: RegionDetailDTO;
            regencies?: RegionMapDTO[];
          };
          if (apiPayload.region && !options?.skipDetailUpdate) {
            setDetailRegion(apiPayload.region);
          }
          if (apiPayload.regencies) dbRegencies = apiPayload.regencies;
        }

        const dbByCode = new Map(dbRegencies.map((r) => [r.code, r]));
        const enrichedFeatures: GeoJSON.Feature[] = (geoData.features ?? []).map((ft) => {
          const p = (ft.properties ?? {}) as GeoJSONFeatureProps;
          const code = String(p.code ?? '');
          const dbMatch = dbByCode.get(code);
          const enriched: GeoJSON.Feature = {
            ...ft,
            properties: {
              ...p,
              code,
              name: dbMatch?.name ?? p.name ?? code,
              level: 'regency',
              parentCode: String(p.parentCode ?? p.provinceCode ?? provinceCode),
              status: dbMatch?.status ?? p.status ?? null,
            },
          };
          regencyFeaturesRef.current.set(code, enriched);
          return enriched;
        });

        const regencyDTOs: RegionMapDTO[] =
          dbRegencies.length > 0
            ? dbRegencies
            : enrichedFeatures
                .map((ft) => ft.properties as GeoJSONFeatureProps)
                .filter((p): p is GeoJSONFeatureProps & { code: string; name: string } =>
                  Boolean(p?.code && p?.name)
                )
                .map((p) => ({
                  code: String(p.code),
                  name: String(p.name),
                  level: 'regency' as const,
                  parentCode: String(p.parentCode ?? provinceCode),
                  status: p.status ?? undefined,
                }));

        setLoadedRegencies((prev) => {
          const merged = new Map(prev.map((r) => [r.code, r]));
          for (const r of regencyDTOs) merged.set(r.code, r);
          return Array.from(merged.values());
        });

        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: enrichedFeatures },
          promoteId: 'code',
        });

        const beforeLabelId = getRegencyInsertBeforeId(map);
        const fillColorExpr: maplibregl.ExpressionSpecification =
          mode === 'liberty'
            ? [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                'rgba(15, 23, 42, 0.28)',
                ['boolean', ['feature-state', 'hover'], false],
                'rgba(15, 23, 42, 0.12)',
                [
                  'match',
                  ['get', 'status'],
                  'DILAPORKAN_BELUM_MENERIMA_BANTUAN',
                  'rgba(239, 108, 0, 0.38)',
                  'AKSES_TERISOLIR',
                  'rgba(198, 40, 40, 0.42)',
                  'BELUM_TERVERIFIKASI',
                  'rgba(100, 116, 139, 0.32)',
                  'rgba(255, 255, 255, 0.08)',
                ],
              ]
            : [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#94a3b8',
                ['boolean', ['feature-state', 'hover'], false],
                '#d5e3ee',
                [
                  'match',
                  ['get', 'status'],
                  'DILAPORKAN_BELUM_MENERIMA_BANTUAN',
                  '#fff3e0',
                  'AKSES_TERISOLIR',
                  '#ffebee',
                  'BELUM_TERVERIFIKASI',
                  '#e2e8f0',
                  '#ffffff',
                ],
              ];

        map.addLayer(
          {
            id: `regency-fill-${provinceCode}`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': fillColorExpr,
              'fill-opacity': mode === 'liberty' ? 1 : 0.92,
            },
          },
          beforeLabelId
        );

        map.addLayer(
          {
            id: `regency-boundary-${provinceCode}`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': mode === 'liberty' ? '#1e293b' : '#475569',
              'line-width': mode === 'liberty' ? 1.4 : 1.2,
              'line-opacity': mode === 'liberty' ? 0.75 : 1,
            },
          },
          beforeLabelId
        );

        map.addLayer(
          {
            id: `regency-spread-${provinceCode}`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['get', 'code'], ''],
            paint: {
              'line-color': '#ea580c',
              'line-width': 2.5,
              'line-dasharray': [2, 1.5],
            },
          },
          beforeLabelId
        );

        map.addLayer(
          {
            id: `regency-selected-${provinceCode}`,
            type: 'line',
            source: sourceId,
            filter: ['==', ['get', 'code'], ''],
            paint: {
              'line-color': '#0f172a',
              'line-width': 2.4,
            },
          },
          beforeLabelId
        );

        setProvinceLayersFilter(map, provinceCode, mode);
        setActiveProvinceCode(provinceCode);
        setRegencyLayerRev((v) => v + 1);
        setMapWarning(null);
      } catch (error) {
        console.error('Failed to load regencies:', error);
        setMapWarning(`Gagal memuat batas kabupaten/kota untuk kode provinsi ${provinceCode}.`);
      }
    },
    [hideAllRegencyLayers]
  );

  const resetNationalView = useCallback(() => {
    setDetailRegion(null);
    setSelectedCode(null);
    setSelectedIncidentId(null);
    setActiveHazardLayer(null);
    setActiveProvinceCode('');
    setStatusFilter('');
    setIncidentCategory('ALL');
    setConfidenceFilter('ALL');
    setDateFilter('ALL');
    setSidebarQuery('');
    setMapWarning(null);

    const map = mapRef.current;
    if (!map) return;

    hideAllRegencyLayers(map);
    setProvinceLayersFilter(map, null, basemapMode);
    map.fitBounds(INDONESIA_BOUNDS, {
      padding: 24,
      duration: reducedMotion ? 0 : 650,
    });
  }, [reducedMotion, hideAllRegencyLayers, basemapMode]);

  const handleSelect = useCallback(
    async (code: string | null, region?: RegionMapDTO) => {
      setSelectedIncidentId(null);
      setSelectedCode(code);
      if (!code) {
        setDetailRegion(null);
        return;
      }

      const resolved = region ?? allRegions.find((r) => r.code === code) ?? null;
      if (resolved) {
        setDetailRegion(resolved);
      }

      const level = resolved?.level ?? (code.length === 2 ? 'province' : 'regency');
      fetchRegionDetail(code);

      if (mapRef.current) {
        if (level === 'province') {
          fitFeatureOrCentroid(mapRef.current, code, 'province', resolved?.centroid);
          await loadRegenciesForProvince(mapRef.current, code, basemapMode);
        } else {
          const parentCode = resolved?.parentCode ?? code.slice(0, 2);
          if (parentCode) {
            await loadRegenciesForProvince(mapRef.current, parentCode, basemapMode, {
              skipDetailUpdate: true,
            });
          }
          fitFeatureOrCentroid(mapRef.current, code, 'regency', resolved?.centroid);
        }
      }
    },
    [allRegions, fitFeatureOrCentroid, loadRegenciesForProvince, fetchRegionDetail, basemapMode]
  );

  const handleSelectIncident = useCallback(
    async (incidentId: string) => {
      const inc = incidentsByIdRef.current.get(incidentId);
      if (!inc) return;

      setDetailRegion(null);
      setSelectedCode(null);
      setSelectedIncidentId(inc.id);
      setActiveHazardLayer(inc.category);

      const map = mapRef.current;
      if (!map) return;

      if (inc.provinceCode) {
        await loadRegenciesForProvince(map, inc.provinceCode, basemapMode, {
          skipDetailUpdate: true,
        });
      }

      const bounds = new maplibregl.LngLatBounds(inc.coordinates, inc.coordinates);
      let hasSpreadPoints = false;
      for (const sr of inc.spreadRegions) {
        if (sr.centroid) {
          bounds.extend(sr.centroid);
          hasSpreadPoints = true;
        }
      }

      if (hasSpreadPoints) {
        map.fitBounds(bounds, {
          padding: 72,
          maxZoom: inc.spreadRegions.length <= 1 ? 10 : 8.8,
          duration: reducedMotion ? 0 : 750,
        });
      } else if (reducedMotion) {
        map.jumpTo({ center: inc.coordinates, zoom: 9.2 });
      } else {
        map.flyTo({ center: inc.coordinates, zoom: 9.2, duration: 750 });
      }
    },
    [basemapMode, loadRegenciesForProvince, reducedMotion]
  );

  const handleSelectSpreadRegion = useCallback(
    (regionCode: string) => {
      setSelectedIncidentId(null);
      handleSelect(regionCode);
    },
    [handleSelect]
  );

  const handleProvinceFilterChange = useCallback(
    (provinceCode: string) => {
      if (!provinceCode) {
        resetNationalView();
        return;
      }
      const prov = regions.find((r) => r.code === provinceCode);
      handleSelect(provinceCode, prov);
    },
    [regions, handleSelect, resetNationalView]
  );

  const handleBasemapSwitch = useCallback((mode: BasemapMode) => {
    setBasemapMode(mode);
    setShowGrid(mode === 'minimal');
    setShowLabels(mode === 'minimal');
    setMapWarning(null);
  }, []);

  const handleViewportChange = useCallback((vp: { center: [number, number]; zoom: number }) => {
    setViewport(vp);
  }, []);

  // Initialize MapLibre map (re-initializes cleanly when basemapMode changes)
  useEffect(() => {
    if (!mapContainerRef.current || mapInitialized.current || !webglAvailable || showFallback) return;

    mapLoadedRef.current = false;
    let mapInstance: maplibregl.Map;
    try {
      maplibregl.setWorkerUrl('/map/maplibre-gl-worker.js');
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: BASEMAP_STYLE_URL[basemapMode],
        center: INDONESIA_CENTER,
        zoom: INDONESIA_ZOOM,
        minZoom: 3.2,
        maxZoom: 16,
        maxBounds: [
          [88, -16],
          [148, 11],
        ],
        attributionControl: false,
      });
    } catch (error) {
      console.error('MapLibre WebGL initialization failed:', error);
      queueMicrotask(() => setWebglAvailable(false));
      return;
    }

    mapRef.current = mapInstance;
    mapInitialized.current = true;

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapInstance.on('load', async () => {
      mapLoadedRef.current = true;
      mapInstance.fitBounds(INDONESIA_BOUNDS, { padding: 24, duration: 0 });
      const beforeLabelId = getFirstSymbolLayerId(mapInstance);

      // Graticule layer (toggled via Grid Koordinat button)
      if (!mapInstance.getSource('graticule')) {
        mapInstance.addSource('graticule', {
          type: 'geojson',
          data: buildIndonesiaGraticule(),
        });
        const graticuleBefore = mapInstance.getLayer('province-coastal-halo')
          ? 'province-coastal-halo'
          : beforeLabelId;
        const initialGridVis = basemapMode === 'minimal' ? 'visible' : 'none';
        mapInstance.addLayer(
          {
            id: 'graticule-lines',
            type: 'line',
            source: 'graticule',
            filter: ['!=', ['get', 'isEquator'], true],
            layout: { visibility: initialGridVis },
            paint: { 'line-color': '#cbdbe8', 'line-width': 0.8 },
          },
          graticuleBefore
        );
        mapInstance.addLayer(
          {
            id: 'graticule-equator',
            type: 'line',
            source: 'graticule',
            filter: ['==', ['get', 'isEquator'], true],
            layout: { visibility: initialGridVis },
            paint: {
              'line-color': '#64748b',
              'line-width': 1,
              'line-dasharray': [4, 4],
              'line-opacity': 0.7,
            },
          },
          graticuleBefore
        );
      }

      // Fetch and mount/hydrate BPS 38 provinces GeoJSON
      try {
        const resp = await fetch('/geo/provinces.geojson');
        if (resp.ok) {
          const provGeo = (await resp.json()) as GeoJSON.FeatureCollection;
          const dbByCode = new Map(regions.map((r) => [r.code, r]));
          const hydratedFeatures: GeoJSON.Feature[] = (provGeo.features ?? []).map((ft) => {
            const p = (ft.properties ?? {}) as GeoJSONFeatureProps;
            const code = String(p.code ?? '');
            const dbMatch = dbByCode.get(code);
            const hydrated: GeoJSON.Feature = {
              ...ft,
              properties: {
                ...p,
                code,
                name: dbMatch?.name ?? p.name ?? code,
                level: 'province',
                status: dbMatch?.status ?? p.status ?? null,
              },
            };
            provinceFeaturesRef.current.set(code, hydrated);
            return hydrated;
          });

          const hydratedCollection: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: hydratedFeatures,
          };

          const existingSrc = mapInstance.getSource('provinces') as
            | maplibregl.GeoJSONSource
            | undefined;
          if (existingSrc) {
            existingSrc.setData(hydratedCollection);
          } else {
            mapInstance.addSource('provinces', {
              type: 'geojson',
              data: hydratedCollection,
              promoteId: 'code',
            });

            // Insert beneath basemap symbol labels so real city/province/road names stay crisp!
            mapInstance.addLayer(
              {
                id: 'province-fill',
                type: 'fill',
                source: 'provinces',
                paint: {
                  'fill-color': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    'rgba(15, 23, 42, 0.24)',
                    ['boolean', ['feature-state', 'hover'], false],
                    'rgba(15, 23, 42, 0.11)',
                    [
                      'match',
                      ['get', 'status'],
                      'DILAPORKAN_BELUM_MENERIMA_BANTUAN',
                      'rgba(239, 108, 0, 0.34)',
                      'AKSES_TERISOLIR',
                      'rgba(198, 40, 40, 0.36)',
                      'BELUM_TERVERIFIKASI',
                      'rgba(100, 116, 139, 0.28)',
                      'rgba(255, 255, 255, 0.01)',
                    ],
                  ],
                  'fill-opacity': 1,
                },
              },
              beforeLabelId
            );

            mapInstance.addLayer(
              {
                id: 'province-boundary',
                type: 'line',
                source: 'provinces',
                paint: {
                  'line-color': '#334155',
                  'line-opacity': 0.55,
                  'line-width': ['interpolate', ['linear'], ['zoom'], 3.5, 0.8, 7, 1.5],
                },
              },
              beforeLabelId
            );

            mapInstance.addLayer(
              {
                id: 'province-selected',
                type: 'line',
                source: 'provinces',
                filter: ['==', ['get', 'code'], ''],
                paint: {
                  'line-color': '#0f172a',
                  'line-width': 2.4,
                },
              },
              beforeLabelId
            );
          }
        }
      } catch (err) {
        console.error('Failed to hydrate provinces GeoJSON:', err);
      }

      // Add BMKG Nowcast CAP polygons, concentric impact rings, spread lines/nodes, and disaster dots above polygon fills, below basemap labels
      if (!mapInstance.getSource('bmkg-nowcast-polygons')) {
        mapInstance.addSource('bmkg-nowcast-polygons', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        mapInstance.addLayer(
          {
            id: 'bmkg-nowcast-fill',
            type: 'fill',
            source: 'bmkg-nowcast-polygons',
            paint: {
              'fill-color': '#7c3aed',
              'fill-opacity': 0.16,
            },
          },
          beforeLabelId
        );
        mapInstance.addLayer(
          {
            id: 'bmkg-nowcast-outline',
            type: 'line',
            source: 'bmkg-nowcast-polygons',
            paint: {
              'line-color': '#6d28d9',
              'line-width': 1.8,
              'line-dasharray': [3, 2],
              'line-opacity': 0.85,
            },
          },
          beforeLabelId
        );
      }

      if (!mapInstance.getSource('incident-impact-rings')) {
        mapInstance.addSource('incident-impact-rings', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        mapInstance.addLayer(
          {
            id: 'incident-impact-rings-fill',
            type: 'fill',
            source: 'incident-impact-rings',
            paint: {
              'fill-color': ['coalesce', ['get', 'color'], '#dc2626'],
              'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.08],
            },
          },
          beforeLabelId
        );
        mapInstance.addLayer(
          {
            id: 'incident-impact-rings-line',
            type: 'line',
            source: 'incident-impact-rings',
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#dc2626'],
              'line-width': ['coalesce', ['get', 'lineWidth'], 1.5],
              'line-opacity': ['coalesce', ['get', 'lineOpacity'], 0.65],
            },
          },
          beforeLabelId
        );
      }

      if (!mapInstance.getSource('incident-spread-lines')) {
        mapInstance.addSource('incident-spread-lines', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        mapInstance.addLayer(
          {
            id: 'incident-spread-lines',
            type: 'line',
            source: 'incident-spread-lines',
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#ea580c'],
              'line-width': 2.2,
              'line-dasharray': [2, 2],
              'line-opacity': 0.85,
            },
          },
          beforeLabelId
        );
      }

      if (!mapInstance.getSource('incident-spread-nodes')) {
        mapInstance.addSource('incident-spread-nodes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        mapInstance.addLayer(
          {
            id: 'incident-spread-nodes',
            type: 'circle',
            source: 'incident-spread-nodes',
            paint: {
              'circle-radius': 6.5,
              'circle-color': 'rgba(255, 255, 255, 0.9)',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': ['coalesce', ['get', 'color'], '#ea580c'],
            },
          },
          beforeLabelId
        );
      }

      setMapLoaded(true);
      const targetProv = activeProvinceRef.current || initialFilters?.provinceCode;
      if (targetProv) {
        const initProv = regions.find((r) => r.code === targetProv);
        fitFeatureOrCentroid(mapInstance, targetProv, 'province', initProv?.centroid);
        loadRegenciesForProvince(mapInstance, targetProv, basemapMode);
      }
    });

    mapInstance.on('error', (e) => {
      const msg = e.error?.message ?? 'Terjadi kendala saat memuat peta.';
      console.error('MapLibre error:', e.error);
      if (msg.toLowerCase().includes('webgl')) {
        setWebglAvailable(false);
        return;
      }
      if (basemapMode === 'liberty' && !mapLoadedRef.current) {
        setBasemapMode('minimal');
        setShowGrid(true);
        setShowLabels(true);
        setMapWarning('Peta dasar eksternal tidak dapat dimuat; beralih otomatis ke mode vektor lokal.');
        return;
      }
      if (!mapLoadedRef.current) {
        setMapWarning(msg);
      }
    });

    return () => {
      mapLoadedRef.current = false;
      selectedFeatureStateRef.current = null;
      incidentPopupRef.current?.remove();
      incidentPopupRef.current = null;
      setMapLoaded(false);
      mapInstance.remove();
      mapRef.current = null;
      mapInitialized.current = false;
    };
  }, [
    webglAvailable,
    showFallback,
    basemapMode,
    regions,
    initialFilters?.provinceCode,
    fitFeatureOrCentroid,
    loadRegenciesForProvince,
  ]);

  // Rebuild incident source & layers cleanly when clustering toggles or map loads
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layerIds = [
      'disaster-incidents-selected',
      'disaster-incidents-cluster-count',
      'disaster-incidents-clusters',
      'disaster-incidents-dot',
      'disaster-incidents-halo',
    ];
    for (const id of layerIds) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource('disaster-incidents')) {
      map.removeSource('disaster-incidents');
    }

    const beforeLabelId = getFirstSymbolLayerId(map);
    const features: GeoJSON.Feature[] = visibleIncidents.map((inc) => ({
      type: 'Feature',
      properties: {
        id: inc.id,
        title: inc.title,
        category: inc.category,
        categoryLabel: inc.categoryLabel,
        precisionLabel: inc.precisionLabel,
      },
      geometry: {
        type: 'Point',
        coordinates: inc.coordinates,
      },
    }));

    map.addSource('disaster-incidents', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
      promoteId: 'id',
      ...(clusterPoints ? { cluster: true, clusterMaxZoom: 8, clusterRadius: 42 } : {}),
    });

    if (clusterPoints) {
      map.addLayer(
        {
          id: 'disaster-incidents-clusters',
          type: 'circle',
          source: 'disaster-incidents',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': ['step', ['get', 'point_count'], '#f97316', 25, '#ea580c', 100, '#dc2626'],
            'circle-radius': ['step', ['get', 'point_count'], 15, 25, 20, 100, 26],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        },
        beforeLabelId
      );

      const style = map.getStyle();
      const symLayer = (style?.layers ?? []).find((l) => {
        if (l.type !== 'symbol') return false;
        const layout = l.layout as Record<string, unknown> | undefined;
        const font = layout?.['text-font'];
        return Array.isArray(font) && font.length > 0 && typeof font[0] === 'string';
      });
      const textFont = (symLayer?.layout as Record<string, unknown> | undefined)?.['text-font'];
      if (style?.glyphs && Array.isArray(textFont)) {
        map.addLayer(
          {
            id: 'disaster-incidents-cluster-count',
            type: 'symbol',
            source: 'disaster-incidents',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': textFont as string[],
              'text-size': 11,
            },
            paint: {
              'text-color': '#ffffff',
            },
          },
          beforeLabelId
        );
      }
    }

    const unclusteredFilter: maplibregl.FilterSpecification = ['!', ['has', 'point_count']];

    map.addLayer(
      {
        id: 'disaster-incidents-halo',
        type: 'circle',
        source: 'disaster-incidents',
        filter: unclusteredFilter,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 9, 14],
          'circle-color': [
            'match',
            ['get', 'category'],
            'FLOOD',
            '#2563eb',
            'LANDSLIDE',
            '#d97706',
            'EARTHQUAKE',
            '#dc2626',
            'EXTREME_WEATHER',
            '#7c3aed',
            'VOLCANO',
            '#be123c',
            '#ea580c',
          ],
          'circle-opacity': 0.24,
        },
      },
      beforeLabelId
    );

    map.addLayer(
      {
        id: 'disaster-incidents-dot',
        type: 'circle',
        source: 'disaster-incidents',
        filter: unclusteredFilter,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3.8, 9, 6.8],
          'circle-color': [
            'match',
            ['get', 'category'],
            'FLOOD',
            '#2563eb',
            'LANDSLIDE',
            '#d97706',
            'EARTHQUAKE',
            '#dc2626',
            'EXTREME_WEATHER',
            '#7c3aed',
            'VOLCANO',
            '#be123c',
            '#ea580c',
          ],
          'circle-stroke-width': 1.6,
          'circle-stroke-color': '#ffffff',
        },
      },
      beforeLabelId
    );

    map.addLayer(
      {
        id: 'disaster-incidents-selected',
        type: 'circle',
        source: 'disaster-incidents',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedIncidentId ?? '']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 9, 13],
          'circle-color': 'rgba(0, 0, 0, 0)',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#0f172a',
        },
      },
      beforeLabelId
    );
  }, [mapLoaded, basemapMode, clusterPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync disaster point GeoJSON source on filter/data/basemap changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const src = map.getSource('disaster-incidents') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = visibleIncidents.map((inc) => ({
      type: 'Feature',
      properties: {
        id: inc.id,
        title: inc.title,
        category: inc.category,
        categoryLabel: inc.categoryLabel,
        precisionLabel: inc.precisionLabel,
      },
      geometry: {
        type: 'Point',
        coordinates: inc.coordinates,
      },
    }));

    src.setData({ type: 'FeatureCollection', features });
  }, [mapLoaded, basemapMode, clusterPoints, visibleIncidents]);

  // Sync concentric rings, spread lines, target nodes, and regency spread outlines when an incident is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const ringsSrc = map.getSource('incident-impact-rings') as maplibregl.GeoJSONSource | undefined;
    const linesSrc = map.getSource('incident-spread-lines') as maplibregl.GeoJSONSource | undefined;
    const nodesSrc = map.getSource('incident-spread-nodes') as maplibregl.GeoJSONSource | undefined;

    if (map.getLayer('disaster-incidents-selected')) {
      map.setFilter('disaster-incidents-selected', [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'id'], selectedIncident?.id ?? ''],
      ]);
    }

    const emptyFilter: maplibregl.FilterSpecification = ['==', ['get', 'code'], ''];
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.id.startsWith('regency-spread-')) {
        map.setFilter(layer.id, emptyFilter);
      }
    }

    if (!selectedIncident) {
      ringsSrc?.setData({ type: 'FeatureCollection', features: [] });
      linesSrc?.setData({ type: 'FeatureCollection', features: [] });
      nodesSrc?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    ringsSrc?.setData(buildIncidentImpactRings(selectedIncident));

    const color = INCIDENT_COLOR_BY_CATEGORY[selectedIncident.category];
    const lineFeatures: GeoJSON.Feature[] = [];
    const nodeFeatures: GeoJSON.Feature[] = [];
    const spreadCodesByProv = new Map<string, string[]>();

    for (const sr of selectedIncident.spreadRegions) {
      if (!spreadCodesByProv.has(sr.provinceCode)) spreadCodesByProv.set(sr.provinceCode, []);
      spreadCodesByProv.get(sr.provinceCode)!.push(sr.code);

      if (sr.centroid) {
        nodeFeatures.push({
          type: 'Feature',
          properties: { code: sr.code, name: sr.name, color },
          geometry: { type: 'Point', coordinates: sr.centroid },
        });
        lineFeatures.push({
          type: 'Feature',
          properties: { code: sr.code, color },
          geometry: {
            type: 'LineString',
            coordinates: [selectedIncident.coordinates, sr.centroid],
          },
        });
      }
    }

    linesSrc?.setData({ type: 'FeatureCollection', features: lineFeatures });
    nodesSrc?.setData({ type: 'FeatureCollection', features: nodeFeatures });

    for (const [provCode, codes] of spreadCodesByProv.entries()) {
      const layerId = `regency-spread-${provCode}`;
      if (map.getLayer(layerId) && codes.length > 0) {
        map.setFilter(layerId, ['match', ['get', 'code'], codes, true, false]);
        map.setPaintProperty(layerId, 'line-color', color);
      }
    }
  }, [mapLoaded, basemapMode, selectedIncident, regencyLayerRev]);

  // Anchored on-map MapLibre popup showing timestamp, precision, source & quick metrics
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    incidentPopupRef.current?.remove();
    incidentPopupRef.current = null;

    if (!selectedIncident) return;

    const container = document.createElement('div');
    container.className = 'text-xs text-primary space-y-1 pr-2 font-sans';

    const titleEl = document.createElement('p');
    titleEl.className = 'font-semibold text-sm text-primary leading-snug';
    titleEl.textContent = selectedIncident.locationText;
    container.appendChild(titleEl);

    if (selectedIncident.metrics?.satellite) {
      const confEl = document.createElement('p');
      confEl.className = 'text-secondary-text';
      const frpSuffix =
        typeof selectedIncident.metrics.frp === 'number'
          ? ` · FRP ${formatIndonesianDecimal(selectedIncident.metrics.frp.toFixed(1))} MW`
          : '';
      confEl.textContent = `Kepercayaan: ${selectedIncident.metrics.confidence ?? 'Sedang'}${frpSuffix}`;
      container.appendChild(confEl);

      const satEl = document.createElement('p');
      satEl.className = 'text-secondary-text';
      satEl.textContent = `Satelit: ${selectedIncident.metrics.satellite}`;
      container.appendChild(satEl);
    } else {
      const precisionEl = document.createElement('p');
      precisionEl.className = 'text-secondary-text';
      precisionEl.textContent = `${selectedIncident.categoryLabel} · ${selectedIncident.precisionLabel}`;
      container.appendChild(precisionEl);

      const srcEl = document.createElement('p');
      srcEl.className = 'text-secondary-text';
      srcEl.textContent = `Sumber: ${selectedIncident.source.publisher} (${selectedIncident.source.isLive ? 'Live' : 'Snapshot'})`;
      container.appendChild(srcEl);
    }

    if (selectedIncident.category === 'EARTHQUAKE' && selectedIncident.metrics?.magnitude) {
      const eqEl = document.createElement('p');
      eqEl.className = 'font-medium text-primary';
      eqEl.textContent = `M ${formatIndonesianDecimal(selectedIncident.metrics.magnitude)} · Kedalaman ${selectedIncident.metrics.depth ?? '-'} · ${formatCoordsLSBT(selectedIncident.coordinates)}`;
      container.appendChild(eqEl);
    }

    if (selectedIncident.category === 'VOLCANO' && selectedIncident.metrics?.alertLevel) {
      const volEl = document.createElement('p');
      volEl.className = 'font-medium text-primary';
      const elevStr =
        typeof selectedIncident.metrics.elevationM === 'number'
          ? ` · ${selectedIncident.metrics.elevationM.toLocaleString('id-ID')} mdpl`
          : '';
      const vonaStr = selectedIncident.metrics.hasVona ? ' · VONA Aktif' : '';
      volEl.textContent = `${selectedIncident.metrics.alertLevel}${elevStr}${vonaStr}`;
      container.appendChild(volEl);
    }

    if (selectedIncident.metrics?.validUntil) {
      const validEl = document.createElement('p');
      validEl.className = 'text-secondary-text';
      validEl.textContent = `Berlaku s/d: ${formatDateTimeWIB(selectedIncident.metrics.validUntil)}`;
      container.appendChild(validEl);
    }

    const timeEl = document.createElement('p');
    timeEl.className = 'text-primary font-medium pt-0.5';
    timeEl.textContent = formatDateTimeWIB(selectedIncident.occurredAt);
    container.appendChild(timeEl);

    const updatedEl = document.createElement('p');
    updatedEl.className = 'text-[11px] text-secondary-text';
    updatedEl.textContent = `Diperbarui: ${formatDateTimeWIB(selectedIncident.source.updatedAt)}`;
    container.appendChild(updatedEl);

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      offset: 14,
    })
      .setLngLat(selectedIncident.coordinates)
      .setDOMContent(container)
      .addTo(map);

    incidentPopupRef.current = popup;
    let cleaningUp = false;
    popup.on('close', () => {
      if (!cleaningUp && incidentPopupRef.current === popup) {
        incidentPopupRef.current = null;
      }
    });

    return () => {
      cleaningUp = true;
      popup.remove();
    };
  }, [mapLoaded, basemapMode, selectedIncident]);

  // Official BNPB inaRISK Merah-Kuning-Hijau Hazard Zone Raster Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('inarisk-hazard-layer')) {
      map.removeLayer('inarisk-hazard-layer');
    }
    if (map.getSource('inarisk-hazard-source')) {
      map.removeSource('inarisk-hazard-source');
    }

    if (!activeHazardLayer) return;

    const meta = INARISK_HAZARD_LAYERS[activeHazardLayer];
    map.addSource('inarisk-hazard-source', {
      type: 'raster',
      tiles: [meta.tileUrl],
      tileSize: 256,
      attribution: 'Zona Bahaya: inaRISK BNPB (gis.bnpb.go.id)',
    });

    const beforeId = map.getLayer('province-boundary')
      ? 'province-boundary'
      : getRegencyInsertBeforeId(map);

    map.addLayer(
      {
        id: 'inarisk-hazard-layer',
        type: 'raster',
        source: 'inarisk-hazard-source',
        paint: {
          'raster-opacity': 0.56,
        },
      },
      beforeId
    );
  }, [mapLoaded, basemapMode, activeHazardLayer]);

  // Sync BMKG Nowcast CAP Warning Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const src = map.getSource('bmkg-nowcast-polygons') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (showNowcastPolygons && incidentsData?.nowcastPolygons) {
      src.setData(incidentsData.nowcastPolygons);
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [mapLoaded, basemapMode, incidentsData, showNowcastPolygons]);

  // RainViewer Live Precipitation Radar Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('rainviewer-radar-layer')) {
      map.removeLayer('rainviewer-radar-layer');
    }
    if (map.getSource('rainviewer-radar-source')) {
      map.removeSource('rainviewer-radar-source');
    }

    const tileUrl = incidentsData?.weatherRadar?.tileUrl;
    if (!showWeatherRadar || !tileUrl) return;

    map.addSource('rainviewer-radar-source', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 7,
      attribution: 'Radar Presipitasi Live: RainViewer',
    });

    const beforeId = map.getLayer('province-boundary')
      ? 'province-boundary'
      : getRegencyInsertBeforeId(map);

    map.addLayer(
      {
        id: 'rainviewer-radar-layer',
        type: 'raster',
        source: 'rainviewer-radar-source',
        paint: {
          'raster-opacity': 0.55,
          'raster-resampling': 'linear',
        },
      },
      beforeId
    );
  }, [mapLoaded, basemapMode, showWeatherRadar, incidentsData?.weatherRadar?.tileUrl]);

  // Sync polygon darken & crisp border highlight from selectedCode (works from sidebar, search, or canvas click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (selectedFeatureStateRef.current) {
      const prev = selectedFeatureStateRef.current;
      if (map.getSource(prev.source)) {
        map.setFeatureState(prev, { selected: false });
      }
      selectedFeatureStateRef.current = null;
    }

    const emptyFilter: maplibregl.FilterSpecification = ['==', ['get', 'code'], ''];
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.id === 'province-selected' || layer.id.startsWith('regency-selected-')) {
        map.setFilter(layer.id, emptyFilter);
      }
    }

    if (!selectedCode) return;

    if (selectedCode.length === 2) {
      if (map.getSource('provinces')) {
        map.setFeatureState({ source: 'provinces', id: selectedCode }, { selected: true });
        selectedFeatureStateRef.current = { source: 'provinces', id: selectedCode };
      }
      if (map.getLayer('province-selected') && activeProvinceCode !== selectedCode) {
        map.setFilter('province-selected', ['==', ['get', 'code'], selectedCode]);
      }
    } else {
      const matched = allRegions.find((r) => r.code === selectedCode);
      const targetProv = matched?.parentCode ?? (activeProvinceCode || selectedCode.slice(0, 2));
      const regSource = `regencies-${targetProv}`;
      if (map.getSource(regSource)) {
        map.setFeatureState({ source: regSource, id: selectedCode }, { selected: true });
        selectedFeatureStateRef.current = { source: regSource, id: selectedCode };
      }
      const selectedLayerId = `regency-selected-${targetProv}`;
      if (map.getLayer(selectedLayerId)) {
        map.setFilter(selectedLayerId, ['==', ['get', 'code'], selectedCode]);
      }
    }
  }, [selectedCode, activeProvinceCode, mapLoaded, basemapMode, regencyLayerRev, allRegions]);

  // Toggle graticule visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const vis = showGrid ? 'visible' : 'none';
    for (const id of ['graticule-lines', 'graticule-equator']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    }
  }, [mapLoaded, showGrid]);

  // Lightweight toggleable HTML region labels (zero external font glyphs)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !showLabels) return;

    const markers: maplibregl.Marker[] = [];

    if (activeProvinceCode) {
      const regencies = loadedRegencies.filter((r) => r.parentCode === activeProvinceCode);
      for (const reg of regencies) {
        const feat = regencyFeaturesRef.current.get(reg.code);
        const bounds = feat ? computeGeoJSONBounds(feat) : null;
        const coord: [number, number] | undefined =
          reg.centroid ??
          (bounds
            ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
            : undefined);
        if (!coord) continue;

        const el = document.createElement('div');
        el.className =
          'pointer-events-none px-1.5 py-0.5 rounded bg-white/85 border border-slate-300 text-[10px] font-medium text-slate-800 whitespace-nowrap';
        el.textContent = reg.name;
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coord)
          .addTo(map);
        markers.push(marker);
      }
    } else {
      const showAllProvinces = viewport.zoom >= 5.2;
      for (const prov of regions) {
        if (!prov.centroid) continue;
        if (!showAllProvinces && !ANCHOR_PROVINCE_CODES.has(prov.code)) continue;

        const el = document.createElement('div');
        el.className =
          'pointer-events-none px-1.5 py-0.5 rounded bg-white/85 border border-slate-300 text-[10px] font-medium text-slate-800 whitespace-nowrap';
        el.textContent = prov.name;
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(prov.centroid)
          .addTo(map);
        markers.push(marker);
      }
    }

    return () => {
      for (const m of markers) m.remove();
    };
  }, [mapLoaded, showLabels, activeProvinceCode, loadedRegencies, regions, viewport.zoom]);

  useMapInteraction({
    mapRef,
    mapLoaded,
    regions: allRegions,
    selectedCode,
    onSelect: handleSelect,
    onSelectIncident: handleSelectIncident,
    onHover: setHoverInfo,
    onCursorMove: setCursorCoords,
    onViewportChange: handleViewportChange,
    reducedMotion,
  });

  const activeProvinceName = activeProvinceCode
    ? regions.find((r) => r.code === activeProvinceCode)?.name ?? activeProvinceCode
    : null;

  return (
    <div className="space-y-4 p-4">
      {/* Live Neon DB KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Ringkasan cakupan peta">
        <div className="border border-border rounded-lg p-3 bg-secondary-background/60">
          <p className="text-xs text-secondary-text">Provinsi Terpetakan</p>
          <p className="font-display font-bold text-2xl text-primary mt-0.5">
            {summaryCounts.provinceCount}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-secondary-background/60">
          <p className="text-xs text-secondary-text">Kab/Kota Terpetakan</p>
          <p className="font-display font-bold text-2xl text-primary mt-0.5">
            {summaryCounts.regencyCount}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-secondary-background/60">
          <p className="text-xs text-secondary-text">Laporan Status Aktif</p>
          <p className="font-display font-bold text-2xl text-primary mt-0.5">
            {summaryCounts.activeStatusCount}
          </p>
        </div>
        <div className="border border-border rounded-lg p-3 bg-secondary-background/60">
          <p className="text-xs text-secondary-text">Sumber Terdaftar</p>
          <p className="font-display font-bold text-2xl text-primary mt-0.5">
            {summaryCounts.sourceCount}
          </p>
        </div>
      </div>

      {/* Filters & Tracker Toolbar */}
      <div className="space-y-3">
        <MapFilters
          provinces={provinceOptions}
          status={statusFilter}
          provinceCode={activeProvinceCode}
          confidenceFilter={confidenceFilter}
          dateFilter={dateFilter}
          datesAvailable={incidentsData?.datesAvailable ?? []}
          visibleIncidentCount={visibleIncidents.length}
          hasAnyFilter={Boolean(
            statusFilter ||
              activeProvinceCode ||
              incidentCategory !== 'ALL' ||
              confidenceFilter !== 'ALL' ||
              dateFilter !== 'ALL'
          )}
          onStatusChange={setStatusFilter}
          onProvinceChange={handleProvinceFilterChange}
          onConfidenceChange={setConfidenceFilter}
          onDateChange={setDateFilter}
          onDownloadCsv={handleDownloadIncidentsCsv}
          onReset={resetNationalView}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-secondary-text">Fokus Cepat:</span>
            <button
              type="button"
              onClick={() => handleProvinceFilterChange('11')}
              className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                activeProvinceCode === '11'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Aceh (11)
            </button>
            <button
              type="button"
              onClick={() => handleProvinceFilterChange('53')}
              className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                activeProvinceCode === '53'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              NTT / Flores (53)
            </button>

            <span className="text-xs font-medium text-secondary-text ml-2">Peta Dasar:</span>
            <button
              type="button"
              onClick={() => handleBasemapSwitch('liberty')}
              aria-pressed={basemapMode === 'liberty'}
              className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                basemapMode === 'liberty'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Peta Lengkap
            </button>
            <button
              type="button"
              onClick={() => handleBasemapSwitch('minimal')}
              aria-pressed={basemapMode === 'minimal'}
              className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                basemapMode === 'minimal'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Minimalis (Offline)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {webglAvailable && !showFallback && (
              <>
                <button
                  type="button"
                  onClick={() => setShowGrid((prev) => !prev)}
                  aria-pressed={showGrid}
                  className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    showGrid
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-primary hover:bg-secondary-background'
                  }`}
                >
                  Grid Koordinat
                </button>
                <button
                  type="button"
                  onClick={() => setShowLabels((prev) => !prev)}
                  aria-pressed={showLabels}
                  className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    showLabels
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-primary hover:bg-secondary-background'
                  }`}
                >
                  Label BPS
                </button>
                <button
                  type="button"
                  onClick={resetNationalView}
                  className="min-h-[36px] px-3 py-1 rounded-lg border border-border bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors"
                >
                  Reset Nusantara
                </button>
              </>
            )}
            <button
              type="button"
              className="min-h-[36px] px-3 py-1 bg-background border border-border rounded-lg text-xs font-medium text-primary hover:bg-secondary-background transition-colors"
              onClick={() => setShowFallback((prev) => !prev)}
              aria-pressed={showFallback}
            >
              {showFallback || !webglAvailable ? 'Lihat Peta WebGL' : 'Mode Teks (Aksesibilitas)'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowIncidents((prev) => !prev)}
              aria-pressed={showIncidents}
              className={`min-h-[36px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                showIncidents
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Titik Bencana ({incidentsData ? incidentsData.incidents.length : '…'})
            </button>
            {showIncidents &&
              INCIDENT_CATEGORY_META.map((cat) => {
                const count =
                  cat.key === 'ALL'
                    ? incidentsData?.incidents.length
                    : incidentsData?.countsByCategory[cat.key];
                const active = incidentCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setIncidentCategory(cat.key)}
                    aria-pressed={active}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border text-primary hover:bg-secondary-background'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/80"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span>{cat.label}</span>
                    {typeof count === 'number' && (
                      <span className={`font-mono text-[11px] ${active ? 'text-white/80' : 'text-secondary-text'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-text">
            {incidentsData && (
              <span>
                BMKG:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.bmkg === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · Cuaca CAP:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.bmkgNowcast === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · MAGMA:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.magmaVolcano === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · NASA FIRMS:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.nasaFirms === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · USGS:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.usgs === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · BNPB:{' '}
                <strong className="text-primary">
                  {incidentsData.liveStatus.bnpbWeekly === 'live' ? 'Live' : 'Snapshot'}
                </strong>{' '}
                · Diperbarui: <strong className="text-primary">{formatDateTimeWIB(incidentsData.updatedAt)}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={handleManualRefreshIncidents}
              disabled={incidentsLoading}
              className="min-h-[36px] px-3 py-1 rounded-lg border border-border bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors disabled:opacity-50"
            >
              {incidentsLoading ? 'Memperbarui…' : 'Perbarui Data'}
            </button>
          </div>
        </div>

        {/* Official BNPB inaRISK Merah-Kuning-Hijau Hazard Layer Toggle + Live Cuaca & Radar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-secondary-text mr-1">Zona Rawan (inaRISK BNPB):</span>
            <button
              type="button"
              onClick={() => setActiveHazardLayer(null)}
              aria-pressed={activeHazardLayer === null}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                activeHazardLayer === null
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Nonaktif
            </button>
            {INCIDENT_CATEGORY_META.filter((c) => c.key !== 'ALL').map((cat) => {
              const catKey = cat.key as IncidentCategory;
              const active = activeHazardLayer === catKey;
              return (
                <button
                  key={`hazard-${cat.key}`}
                  type="button"
                  onClick={() => setActiveHazardLayer(active ? null : catKey)}
                  aria-pressed={active}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-primary hover:bg-secondary-background'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setClusterPoints((prev) => !prev)}
              aria-pressed={clusterPoints}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                clusterPoints
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Klaster Titik
            </button>
            <button
              type="button"
              onClick={() => setShowNowcastPolygons((prev) => !prev)}
              aria-pressed={showNowcastPolygons}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                showNowcastPolygons
                  ? 'bg-[#6d28d9] text-white border-[#6d28d9]'
                  : 'bg-background border-border text-primary hover:bg-secondary-background'
              }`}
            >
              Poligon Cuaca BMKG
            </button>
            {incidentsData?.weatherRadar?.tileUrl && (
              <button
                type="button"
                onClick={() => setShowWeatherRadar((prev) => !prev)}
                aria-pressed={showWeatherRadar}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  showWeatherRadar
                    ? 'bg-[#0284c7] text-white border-[#0284c7]'
                    : 'bg-background border-border text-primary hover:bg-secondary-background'
                }`}
              >
                Radar Hujan (Live)
              </button>
            )}
          </div>
        </div>
      </div>

      {mapWarning && (
        <div role="status" className="p-3 rounded-lg border border-border bg-secondary-background text-sm text-primary">
          {mapWarning}
        </div>
      )}

      {!webglAvailable || showFallback ? (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-secondary-background">
            <span className="text-sm text-secondary-text">
              {!webglAvailable
                ? 'Peramban tidak mendukung WebGL. Menampilkan daftar wilayah alternatif yang setara.'
                : 'Mode tampilan teks aktif untuk aksesibilitas dan pembaca layar.'}
            </span>
            {webglAvailable && (
              <button
                type="button"
                className="text-sm font-medium text-primary underline min-h-[44px] px-2"
                onClick={() => setShowFallback(false)}
              >
                Kembali ke peta
              </button>
            )}
          </div>
          <MapFallback
            regions={sidebarRegions}
            selectedCode={selectedCode}
            onSelect={handleSelect}
          />
          <MapLegend statusCounts={summaryCounts.statusCounts} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* WebGL Map Viewport */}
          <div className="lg:col-span-8 relative border border-border rounded-lg overflow-hidden bg-[#d8e7f2]">
            <div
              ref={mapContainerRef}
              className="w-full h-[460px] lg:h-[600px]"
              role="application"
              aria-label="Peta interaktif sebaran bencana Indonesia"
            />

            {activeProvinceCode && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <button
                  type="button"
                  className="bg-background border border-border rounded-lg px-3 min-h-[44px] text-sm font-medium text-primary hover:bg-secondary-background transition-colors"
                  onClick={resetNationalView}
                >
                  ← Semua Provinsi
                </button>
              </div>
            )}

            {hoverInfo && (!selectedIncident || hoverInfo.kind === 'incident') && (
              <div
                className="pointer-events-none absolute z-20 bg-background border border-border rounded-lg px-3 py-2 text-xs max-w-[260px]"
                style={{
                  left: Math.min(hoverInfo.x + 12, 480),
                  top: Math.max(hoverInfo.y - 12, 12),
                }}
              >
                <p className="font-mono text-secondary-text">
                  {hoverInfo.kind === 'incident'
                    ? hoverInfo.code
                    : `${hoverInfo.code} · ${hoverInfo.level === 'province' ? 'Provinsi' : 'Kab/Kota'}`}
                </p>
                <p className="font-medium text-primary">{hoverInfo.name}</p>
                <p className="text-secondary-text mt-0.5">
                  {hoverInfo.subtitle ??
                    (hoverInfo.status ? getStatusLabel(hoverInfo.status) : 'Tidak ada laporan')}
                </p>
              </div>
            )}

            {(activeHazardLayer || (showWeatherRadar && incidentsData?.weatherRadar)) && (
              <div className="pointer-events-none absolute bottom-10 left-3 z-10 flex flex-col gap-2 max-w-[240px]">
                {showWeatherRadar && incidentsData?.weatherRadar && (
                  <div
                    className="bg-background/95 border border-border rounded-lg p-2.5 text-xs"
                    aria-label="Informasi overlay radar presipitasi"
                  >
                    <p className="font-semibold text-primary">Radar Hujan Live (RainViewer)</p>
                    <p className="text-[11px] text-secondary-text mt-0.5">
                      Sapuan radar:{' '}
                      <strong className="text-primary">
                        {formatDateTimeWIB(incidentsData.weatherRadar.updatedAt)}
                      </strong>
                    </p>
                  </div>
                )}
                {activeHazardLayer && (
                  <div
                    className="bg-background/95 border border-border rounded-lg p-2.5 text-xs"
                    aria-label="Legenda zona rawan inaRISK BNPB"
                  >
                    <p className="font-semibold text-primary mb-1.5">
                      {INARISK_HAZARD_LAYERS[activeHazardLayer].label}
                    </p>
                    <div className="space-y-1 text-[11px] text-secondary-text">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 rounded-sm bg-[#dc2626] border border-black/20 flex-shrink-0" aria-hidden="true" />
                        <span>Zona Rawan Tinggi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 rounded-sm bg-[#facc15] border border-black/20 flex-shrink-0" aria-hidden="true" />
                        <span>Zona Rawan Sedang</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 rounded-sm bg-[#15803d] border border-black/20 flex-shrink-0" aria-hidden="true" />
                        <span>Zona Rawan Rendah</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-secondary-text mt-1.5 pt-1 border-t border-border">
                      Sumber: inaRISK BNPB
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pointer-events-none absolute bottom-10 right-3 z-10 bg-background/90 border border-border rounded px-2.5 py-1 text-[11px] font-mono text-secondary-text">
              {cursorCoords
                ? `${cursorCoords.lat.toFixed(2)}°, ${cursorCoords.lng.toFixed(2)}° · Z ${cursorCoords.zoom.toFixed(1)}`
                : `${viewport.center[1].toFixed(2)}°, ${viewport.center[0].toFixed(2)}° · Z ${viewport.zoom.toFixed(1)}`}
            </div>
          </div>

          {/* Searchable Tracker Sidebar */}
          <aside
            className="lg:col-span-4 border border-border rounded-lg bg-background flex flex-col h-[460px] lg:h-[600px]"
            aria-label="Daftar wilayah interaktif"
          >
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <nav aria-label="Breadcrumb wilayah" className="text-xs text-secondary-text flex items-center gap-1 min-w-0 truncate">
                  <button
                    type="button"
                    onClick={resetNationalView}
                    className={`hover:underline ${!activeProvinceCode ? 'font-semibold text-primary' : ''}`}
                  >
                    Indonesia
                  </button>
                  {activeProvinceName && (
                    <>
                      <span>/</span>
                      <span className="font-semibold text-primary truncate">{activeProvinceName}</span>
                    </>
                  )}
                </nav>
                <span className="text-xs font-mono text-secondary-text flex-shrink-0">
                  {sidebarRegions.length}
                </span>
              </div>

              <label htmlFor="sidebar-region-search" className="sr-only">
                Cari provinsi, kabupaten/kota, atau kode BPS
              </label>
              <input
                id="sidebar-region-search"
                type="search"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Cari provinsi, kab/kota, atau kode BPS..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {sidebarRegions.length === 0 ? (
                <div className="p-6 text-center text-sm text-secondary-text">
                  Tidak ada wilayah yang cocok dengan filter atau pencarian saat ini.
                </div>
              ) : (
                sidebarRegions.map((region) => {
                  const isSelected = region.code === selectedCode;
                  const parentProvinceName =
                    isGlobalSearch && region.level === 'regency' && region.parentCode
                      ? provinceNameByCode.get(region.parentCode)
                      : undefined;
                  return (
                    <button
                      key={region.code}
                      type="button"
                      onClick={() => handleSelect(region.code, region)}
                      aria-pressed={isSelected}
                      className={`w-full text-left px-4 py-3 min-h-[48px] transition-colors flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'hover:bg-secondary-background text-primary'
                      }`}
                    >
                      <div className="min-w-0">
                        <div>
                          <span className={`font-mono text-xs mr-2 ${isSelected ? 'text-white/80' : 'text-secondary-text'}`}>
                            {region.code}
                          </span>
                          <span className="font-medium text-sm">{region.name}</span>
                        </div>
                        {isGlobalSearch && (
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/75' : 'text-secondary-text'}`}>
                            {region.level === 'province'
                              ? 'Provinsi'
                              : `Kab/Kota · ${parentProvinceName ?? region.parentCode ?? ''}`}
                          </p>
                        )}
                      </div>
                      {region.status ? (
                        <StatusBadge status={getStatusLabel(region.status)} />
                      ) : (
                        <span className={`text-xs flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-secondary-text'}`}>
                          {region.level === 'province' ? 'Buka →' : 'Detail'}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}

      {detailRegion && (
        <RegionPanel
          region={detailRegion}
          loading={detailLoading}
          onClose={() => {
            setDetailRegion(null);
            setSelectedCode(null);
          }}
        />
      )}

      {selectedIncident && (
        <IncidentPanel
          incident={selectedIncident}
          activeHazardLayer={activeHazardLayer}
          onToggleHazardLayer={setActiveHazardLayer}
          onClose={() => setSelectedIncidentId(null)}
          onSelectRegion={handleSelectSpreadRegion}
        />
      )}
    </div>
  );
}
