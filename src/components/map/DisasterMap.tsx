'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RegionMapDTO, PublicStatus } from '@/types/map';
import { MapFallback } from './MapFallback';
import { MapLegend } from './MapLegend';
import { RegionPanel } from './RegionPanel';
import { useMapInteraction } from '@/hooks/useMapInteraction';
import { INDONESIA_CENTER, INDONESIA_ZOOM } from '@/lib/map-utils';

interface DisasterMapProps {
  initialRegions: RegionMapDTO[];
  initialFilters?: { status?: PublicStatus; provinceCode?: string };
}

function addFeatureStateLayers(map: maplibregl.Map) {
  map.addLayer({
    id: 'province-selected',
    type: 'line',
    source: 'provinces',
    paint: {
      'line-color': '#1a1a1a',
      'line-width': 3,
    },
    filter: ['==', ['feature-state', 'selected'], true],
  });

  map.addLayer({
    id: 'province-hover',
    type: 'line',
    source: 'provinces',
    paint: {
      'line-color': '#1a1a1a',
      'line-width': 2,
    },
    filter: ['==', ['feature-state', 'hover'], true],
  });
}

export function DisasterMap({ initialRegions, initialFilters }: DisasterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapInitialized = useRef(false);

  const [regions] = useState<RegionMapDTO[]>(initialRegions);
  const [selectedCode, setSelectedCode] = useState<string | null>(initialFilters?.provinceCode ?? null);
  const [viewport, setViewport] = useState({ center: INDONESIA_CENTER, zoom: INDONESIA_ZOOM });
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [webglAvailable] = useState(() => {
    if (typeof window === 'undefined') return true;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  });
  const [showFallback, setShowFallback] = useState(false);
  const [detailRegion, setDetailRegion] = useState<RegionMapDTO | null>(null);

  const loadRegenciesForProvince = useCallback(async (map: maplibregl.Map, provinceCode: string) => {
    const sourceId = `regencies-${provinceCode}`;
    if (map.getSource(sourceId)) return;

    try {
      const resp = await fetch(`/geo/regencies/${provinceCode}.geojson`);
      if (!resp.ok) throw new Error(`Failed to load regencies for ${provinceCode}`);
      const data = await resp.json();

      map.addSource(sourceId, { type: 'geojson', data, generateId: true });

      const fillLayerId = `regency-fill-${provinceCode}`;
      const boundaryLayerId = `regency-boundary-${provinceCode}`;

      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'match',
            ['get', 'status'],
            'DILAPORKAN_BELUM_MENERIMA_BANTUAN', '#fff3e0',
            'AKSES_TERISOLIR', '#ffebee',
            'BELUM_TERVERIFIKASI', '#f5f5f5',
            '#e0e0e0',
          ],
          'fill-opacity': 0.6,
          'fill-outline-color': '#b0bec5',
        },
      });

      map.addLayer({
        id: boundaryLayerId,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#b0bec5', 'line-width': 1 },
      });

      map.addLayer({
        id: `regency-selected-${provinceCode}`,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#1a1a1a', 'line-width': 3 },
        filter: ['==', ['feature-state', 'selected'], true],
      });

      map.addLayer({
        id: `regency-hover-${provinceCode}`,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#1a1a1a', 'line-width': 2 },
        filter: ['==', ['feature-state', 'hover'], true],
      });

      map.setFilter('province-fill', ['!=', 'code', provinceCode]);
      map.setFilter('province-boundary', ['!=', 'code', provinceCode]);
      map.setFilter('province-label', ['!=', 'code', provinceCode]);
    } catch (error) {
      console.error('Failed to load regencies:', error);
    }
  }, []);

  const handleSelect = useCallback((code: string | null, region?: RegionMapDTO) => {
    setSelectedCode(code);
    if (code && region) {
      setDetailRegion(region);
      if (region.level === 'province' && mapRef.current) {
        loadRegenciesForProvince(mapRef.current, code);
      }
    } else {
      setDetailRegion(null);
      if (mapRef.current) {
        mapRef.current.setFilter('province-fill', null);
        mapRef.current.setFilter('province-boundary', null);
        mapRef.current.setFilter('province-label', null);
      }
    }
  }, [loadRegenciesForProvince]);

  const handleViewportChange = useCallback((vp: { center: [number, number]; zoom: number }) => {
    setViewport(vp);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInitialized.current || !webglAvailable) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: '/map/style.json',
      center: viewport.center,
      zoom: viewport.zoom,
      attributionControl: false,
    });

    mapRef.current = mapInstance;
    mapInitialized.current = true;

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      addFeatureStateLayers(mapInstance);
      if (initialFilters?.provinceCode) {
        loadRegenciesForProvince(mapInstance, initialFilters.provinceCode);
      }
    });

    mapInstance.on('error', (e) => {
      console.error('MapLibre error:', e.error);
      setShowFallback(true);
    });

    return () => {
      mapInstance.remove();
      mapRef.current = null;
      mapInitialized.current = false;
    };
  }, [webglAvailable, initialFilters?.provinceCode, viewport.center, viewport.zoom, loadRegenciesForProvince]);

  useMapInteraction({
    mapRef,
    regions,
    selectedCode,
    onSelect: handleSelect,
    onViewportChange: handleViewportChange,
    reducedMotion,
  });

  if (!webglAvailable || showFallback) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-sm text-secondary-text">Mode tampilan teks (WebGL tidak tersedia atau preferensi gerakan dikurangi)</span>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setShowFallback(false)}
            aria-label="Coba muat peta interaktif"
          >
            Coba muat peta
          </button>
        </div>
        <MapFallback
          regions={regions}
          selectedCode={selectedCode}
          onSelect={handleSelect}
        />
        <MapLegend />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={mapContainerRef}
        className="w-full aspect-video bg-secondary-background rounded-lg overflow-hidden"
        role="application"
        aria-label="Peta interaktif sebaran bencana Indonesia"
        style={{ minHeight: '400px' }}
      />
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          className="bg-background border border-border rounded-lg p-2 shadow hover:bg-secondary-background transition"
          onClick={() => setShowFallback(true)}
          aria-label="Beralih ke tampilan teks (aksesibilitas)"
          title="Tampilan teks"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          type="button"
          className="bg-background border border-border rounded-lg p-2 shadow hover:bg-secondary-background transition"
          onClick={() => mapRef.current?.fitBounds(mapRef.current.getBounds(), { padding: 20, duration: reducedMotion ? 0 : 500 })}
          aria-label="Zoom ke seluruh Indonesia"
          title="Zoom nasional"
        >
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <MapLegend className="shadow-lg" />
      </div>

      {detailRegion && (
        <RegionPanel
          region={detailRegion}
          onClose={() => {
            setDetailRegion(null);
            setSelectedCode(null);
            if (mapRef.current) {
              mapRef.current.setFilter('province-fill', null);
              mapRef.current.setFilter('province-boundary', null);
              mapRef.current.setFilter('province-label', null);
            }
          }}
        />
      )}

      <div className="absolute bottom-4 right-4 z-10" aria-live="polite" aria-atomic="true">
        {selectedCode && (
          <div className="bg-background border border-border rounded-lg p-3 shadow text-sm">
            <p className="font-medium text-primary">Wilayah dipilih:</p>
            <p className="text-secondary-text">{regions.find(r => r.code === selectedCode)?.name}</p>
            <p className="text-xs text-secondary-text mt-1">Tekan Escape untuk menghapus pilihan</p>
          </div>
        )}
      </div>
    </div>
  );
}