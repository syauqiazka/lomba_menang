import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { RegionMapDTO, MapViewport, PublicStatus } from '@/types/map';

export interface MapHoverInfo {
  kind?: 'region' | 'incident';
  code: string;
  name: string;
  level: 'province' | 'regency';
  status?: PublicStatus;
  subtitle?: string;
  x: number;
  y: number;
}

export interface MapCursorCoords {
  lng: number;
  lat: number;
  zoom: number;
}

interface UseMapInteractionProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  regions: RegionMapDTO[];
  selectedCode: string | null;
  onSelect: (code: string | null, region?: RegionMapDTO) => void;
  onSelectIncident?: (incidentId: string) => void;
  onHover?: (info: MapHoverInfo | null) => void;
  onCursorMove?: (coords: MapCursorCoords | null) => void;
  onViewportChange: (viewport: MapViewport) => void;
  reducedMotion: boolean;
}

function getInteractiveLayers(map: maplibregl.Map): string[] {
  const styleLayers = map.getStyle()?.layers;
  if (!styleLayers) return [];
  return styleLayers
    .filter((layer) => layer.id === 'province-fill' || layer.id.startsWith('regency-fill-'))
    .map((layer) => layer.id);
}

export function useMapInteraction({
  mapRef,
  mapLoaded,
  regions,
  selectedCode,
  onSelect,
  onSelectIncident,
  onHover,
  onCursorMove,
  onViewportChange,
  reducedMotion,
}: UseMapInteractionProps) {
  const regionsRef = useRef(regions);
  const selectedCodeRef = useRef(selectedCode);
  const onSelectIncidentRef = useRef(onSelectIncident);
  const hoveredFeatureRef = useRef<{ source: string; id: string | number } | null>(null);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    onSelectIncidentRef.current = onSelectIncident;
  }, [onSelectIncident]);

  const clearHoverState = useCallback(
    (map: maplibregl.Map) => {
      if (hoveredFeatureRef.current) {
        const { source, id } = hoveredFeatureRef.current;
        if (map.getSource(source)) {
          map.setFeatureState({ source, id }, { hover: false });
        }
        hoveredFeatureRef.current = null;
      }
      map.getCanvas().style.cursor = '';
      onHover?.(null);
    },
    [onHover]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onViewportChange({
        center: [center.lng, center.lat],
        zoom,
      });
      onCursorMove?.({ lng: center.lng, lat: center.lat, zoom });
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [mapRef, mapLoaded, onViewportChange, onCursorMove]);

  const handleClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      if (map.getLayer('disaster-incidents-clusters')) {
        const clusterFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['disaster-incidents-clusters'],
        });
        if (clusterFeatures.length > 0) {
          const cf = clusterFeatures[0];
          const clusterId = Number(cf.properties?.cluster_id);
          const coords = (cf.geometry as GeoJSON.Point).coordinates as [number, number];
          const src = map.getSource('disaster-incidents') as maplibregl.GeoJSONSource | undefined;
          if (src && Number.isFinite(clusterId)) {
            onHover?.(null);
            void src
              .getClusterExpansionZoom(clusterId)
              .then((zoom) => {
                map.easeTo({
                  center: coords,
                  zoom: Math.min(zoom + 0.5, 11),
                  duration: reducedMotion ? 0 : 450,
                });
              })
              .catch(() => {
                map.easeTo({
                  center: coords,
                  zoom: Math.min(map.getZoom() + 2, 10),
                  duration: reducedMotion ? 0 : 450,
                });
              });
            return;
          }
        }
      }

      if (map.getLayer('disaster-incidents-dot')) {
        const incidentFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['disaster-incidents-dot'],
        });
        if (incidentFeatures.length > 0) {
          const incId = String(incidentFeatures[0].properties?.id ?? '');
          if (incId) {
            onSelectIncidentRef.current?.(incId);
            return;
          }
        }
      }

      const interactiveLayers = getInteractiveLayers(map);
      if (interactiveLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers,
      });

      if (features.length > 0) {
        const feature = features[0];
        const props = feature.properties ?? {};
        const code = String(props.code ?? '');

        const matched = regionsRef.current.find((r) => r.code === code);
        const rawLevel = String(props.level ?? '').toLowerCase();
        const region: RegionMapDTO = matched ?? {
          code,
          name: String(props.name ?? code),
          level: rawLevel === 'province' ? 'province' : 'regency',
          parentCode: props.parentCode
            ? String(props.parentCode)
            : props.provinceCode
              ? String(props.provinceCode)
              : undefined,
          status: (props.status as PublicStatus) ?? undefined,
        };
        onSelect(code, region);
      } else {
        onSelect(null);
      }
    },
    [onSelect, onHover, mapRef, reducedMotion]
  );

  const handleMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      onCursorMove?.({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        zoom: map.getZoom(),
      });

      if (map.getLayer('disaster-incidents-clusters')) {
        const clusterFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['disaster-incidents-clusters'],
        });
        if (clusterFeatures.length > 0) {
          if (hoveredFeatureRef.current) {
            const { source, id } = hoveredFeatureRef.current;
            if (map.getSource(source)) {
              map.setFeatureState({ source, id }, { hover: false });
            }
            hoveredFeatureRef.current = null;
          }
          const count = Number(clusterFeatures[0].properties?.point_count ?? 0);
          map.getCanvas().style.cursor = 'pointer';
          onHover?.({
            kind: 'incident',
            code: 'Klaster',
            name: `${count.toLocaleString('id-ID')} titik bencana`,
            level: 'regency',
            subtitle: 'Klik untuk memperbesar area ini',
            x: e.point.x,
            y: e.point.y,
          });
          return;
        }
      }

      if (map.getLayer('disaster-incidents-dot')) {
        const incidentFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['disaster-incidents-dot'],
        });
        if (incidentFeatures.length > 0) {
          if (hoveredFeatureRef.current) {
            const { source, id } = hoveredFeatureRef.current;
            if (map.getSource(source)) {
              map.setFeatureState({ source, id }, { hover: false });
            }
            hoveredFeatureRef.current = null;
          }
          const props = incidentFeatures[0].properties ?? {};
          map.getCanvas().style.cursor = 'pointer';
          onHover?.({
            kind: 'incident',
            code: String(props.categoryLabel ?? 'Bencana'),
            name: String(props.title ?? ''),
            level: 'regency',
            subtitle: `${String(props.precisionLabel ?? '')} · Klik untuk sebaran dampak`,
            x: e.point.x,
            y: e.point.y,
          });
          return;
        }
      }

      const interactiveLayers = getInteractiveLayers(map);
      if (interactiveLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers,
      });

      if (features.length === 0) {
        clearHoverState(map);
        return;
      }

      const feature = features[0];
      const props = feature.properties ?? {};
      const code = String(props.code ?? '');
      const matched = regionsRef.current.find((r) => r.code === code);
      const rawLevel = String(props.level ?? '').toLowerCase();
      const level = matched?.level ?? (rawLevel === 'province' ? 'province' : 'regency');
      const source = feature.source;
      const id = feature.id;

      if (
        hoveredFeatureRef.current &&
        (hoveredFeatureRef.current.source !== source || hoveredFeatureRef.current.id !== id)
      ) {
        if (map.getSource(hoveredFeatureRef.current.source)) {
          map.setFeatureState(hoveredFeatureRef.current, { hover: false });
        }
        hoveredFeatureRef.current = null;
      }

      if (source && id !== undefined && map.getSource(source)) {
        map.setFeatureState({ source, id }, { hover: true });
        hoveredFeatureRef.current = { source, id };
      }

      map.getCanvas().style.cursor = 'pointer';
      onHover?.({
        code,
        name: matched?.name ?? String(props.name ?? code),
        level,
        status: matched?.status ?? ((props.status as PublicStatus) ?? undefined),
        x: e.point.x,
        y: e.point.y,
      });
    },
    [mapRef, clearHoverState, onHover, onCursorMove]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const canvas = map.getCanvas();
      if (document.activeElement !== canvas) return;

      const currentCode = selectedCodeRef.current;
      const currentRegion = currentCode ? regionsRef.current.find((r) => r.code === currentCode) : null;

      if (e.key === 'Escape') {
        onSelect(null);
        return;
      }

      if (e.key === 'Enter' && currentRegion) {
        if (currentRegion.centroid) {
          flyToRegion(map, currentRegion, reducedMotion);
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        navigateMap(map, e.key, reducedMotion);
      }
    },
    [onSelect, reducedMotion, mapRef]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const canvas = map.getCanvas();
    const handleMouseLeave = () => {
      clearHoverState(map);
      onCursorMove?.(null);
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.tabIndex = 0;

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [mapRef, mapLoaded, handleClick, handleMouseMove, handleKeyDown, clearHoverState, onCursorMove]);
}

function flyToRegion(map: maplibregl.Map, region: RegionMapDTO, reducedMotion: boolean) {
  if (!region.centroid) return;
  const [lng, lat] = region.centroid;
  if (reducedMotion) {
    map.jumpTo({ center: [lng, lat], zoom: region.level === 'province' ? 6.5 : 8.5 });
  } else {
    map.flyTo({ center: [lng, lat], zoom: region.level === 'province' ? 6.5 : 8.5, duration: 750 });
  }
}

function navigateMap(map: maplibregl.Map, direction: string, reducedMotion: boolean) {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const panDistance = 0.5 / Math.pow(2, zoom - 4);

  let newCenter: [number, number] = [center.lng, center.lat];
  switch (direction) {
    case 'ArrowUp':
      newCenter = [center.lng, center.lat + panDistance];
      break;
    case 'ArrowDown':
      newCenter = [center.lng, center.lat - panDistance];
      break;
    case 'ArrowLeft':
      newCenter = [center.lng - panDistance, center.lat];
      break;
    case 'ArrowRight':
      newCenter = [center.lng + panDistance, center.lat];
      break;
  }

  if (reducedMotion) {
    map.jumpTo({ center: newCenter });
  } else {
    map.panTo(newCenter, { duration: 300 });
  }
}
