import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { RegionMapDTO, MapViewport } from '@/types/map';

interface UseMapInteractionProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  regions: RegionMapDTO[];
  selectedCode: string | null;
  onSelect: (code: string | null, region?: RegionMapDTO) => void;
  onViewportChange: (viewport: MapViewport) => void;
  reducedMotion: boolean;
}

export function useMapInteraction({
  mapRef,
  regions,
  selectedCode,
  onSelect,
  onViewportChange,
  reducedMotion,
}: UseMapInteractionProps) {
  const regionsRef = useRef(regions);
  const selectedCodeRef = useRef(selectedCode);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    selectedCodeRef.current = selectedCode;
  }, [selectedCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMoveEnd = () => {
      onViewportChange({
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
      });
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [mapRef, onViewportChange]);

  const handleClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['province-fill', 'regency-fill'],
      });
      if (features.length > 0) {
        const feature = features[0];
        const code = feature.properties?.code as string;
        const region = regionsRef.current.find((r) => r.code === code);
        onSelect(code, region);
      } else {
        onSelect(null);
      }
    },
    [onSelect, mapRef]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const map = mapRef.current;
      if (!map) return;
      const canvas = map.getCanvas();
      if (document.activeElement !== canvas) return;

      const currentCode = selectedCodeRef.current;
      const currentRegion = currentCode ? regionsRef.current.find((r) => r.code === currentCode) : null;
      const currentLevel = currentRegion?.level;

      if (e.key === 'Escape') {
        onSelect(null);
        return;
      }

      if (e.key === 'Enter' && currentRegion) {
        if (currentLevel === 'province') {
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
    if (!map) return;

    map.on('click', 'province-fill', handleClick);
    map.on('click', 'regency-fill', handleClick);

    const canvas = map.getCanvas();
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.tabIndex = 0;

    return () => {
      map.off('click', 'province-fill', handleClick);
      map.off('click', 'regency-fill', handleClick);
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [mapRef, handleClick, handleKeyDown]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCode) return;
    const region = regionsRef.current.find((r) => r.code === selectedCode);
    if (region?.centroid) {
      flyToRegion(map, region, reducedMotion);
    }
  }, [mapRef, selectedCode, reducedMotion]);
}

function flyToRegion(map: maplibregl.Map, region: RegionMapDTO, reducedMotion: boolean) {
  if (!region.centroid) return;
  const [lng, lat] = region.centroid;
  if (reducedMotion) {
    map.jumpTo({ center: [lng, lat], zoom: region.level === 'province' ? 6 : 8 });
  } else {
    map.flyTo({ center: [lng, lat], zoom: region.level === 'province' ? 6 : 8, duration: 800 });
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