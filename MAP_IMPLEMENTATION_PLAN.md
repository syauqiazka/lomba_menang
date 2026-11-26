# MapLibre GL JS Integration Architecture

## Overview
Stage 1 MVP map per AGENTS.md §7: no external tile service, minimal local background style, province/regency GeoJSON, progressive loading, text alternative, no-WebGL fallback.

## Data Format

### GeoJSON Structure
- **Source**: BPS / BIG official administrative boundaries (verified against 38 provinces, 514 regencies/cities)
- **Files**: 
  - `public/geo/provinces.geojson` — 38 features, simplified
  - `public/geo/regencies/<province-code>.geojson` — per-province regency files (lazy-loaded)
- **Properties per feature**:
  ```json
  {
    "type": "Feature",
    "properties": {
      "code": "53",              // BPS code (string, stable identifier)
      "name": "Nusa Tenggara Timur",
      "level": "province"        // or "regency"
    },
    "geometry": { ... }
  }
  ```
- **Simplification**: Visvalingam-Whyatt (mapshaper) to ~50KB/province, ~20KB/regency file; preserve topology.
- **CRS**: WGS84 (EPSG:4326), standard GeoJSON.

### Region Identifiers
- **Primary key**: BPS administrative code (string)
  - Province: 2-digit (e.g., "53" = NTT)
  - Regency/City: 4-digit (e.g., "5306" = Ngada)
- **Join strategy**: Prisma `Region.code` (unique) ↔ GeoJSON `properties.code`
- **Never** join by name (spelling/hierarchy changes).

### Data-to-Region Mapping
| Data Layer | Source | Join Key | Display |
|------------|--------|----------|---------|
| EventImpact.status | `EventImpact.status` (PublicStatus enum) | `Region.code` = `EventImpact.regionId` | Fill color per status |
| Statistic cards | `Stat` (key/value/asOfDate) | `Stat.regionId` → `Region.code` | Click region → panel |
| Source attribution | `Source` (category, title, url) | `EventImpact.sourceId` / `Stat.sourceId` | Footer/panel link |

## MapLibre Integration

### Dynamic Import (Client Component)
```tsx
// src/components/map/DisasterMap.tsx
'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const MapLibre = dynamic(() => import('maplibre-gl'), { ssr: false });
const MapLibreCSS = dynamic(() => import('maplibre-gl/dist/maplibre-gl.css'), { ssr: false });

export function DisasterMap({ initialRegionCode }: { initialRegionCode?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { setWebglSupported(false); return; }
    // Initialize map...
  }, []);

  if (!webglSupported) return <MapFallback />; // Text-based region list

  return (
    <div ref={containerRef} className="w-full h-[600px]" role="application" aria-label="Peta bencana Indonesia" />
  );
}
```

### Minimal Style (No External Tiles)
```json
// public/map/style.json
{
  "version": 8,
  "name": "Bismillah Menang Base",
  "sources": {
    "provinces": { "type": "geojson", "data": "/geo/provinces.geojson" }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#f8fafc" } },
    {
      "id": "province-fill",
      "type": "fill",
      "source": "provinces",
      "paint": {
        "fill-color": ["match", ["get", "code"], "53", "#ef4444", "#94a3b8"],
        "fill-opacity": 0.6
      }
    },
    {
      "id": "province-boundary",
      "type": "line",
      "source": "provinces",
      "paint": { "line-color": "#64748b", "line-width": 1.5 }
    }
  ]
}
```

### Progressive Regency Loading
```tsx
async function loadRegencies(provinceCode: string) {
  const resp = await fetch(`/geo/regencies/${provinceCode}.geojson`);
  const data = await resp.json();
  map.addSource(`regencies-${provinceCode}`, { type: 'geojson', data });
  map.addLayer({ id: `regency-fill-${provinceCode}`, source: `regencies-${provinceCode}`, type: 'fill', ... });
  map.addLayer({ id: `regency-boundary-${provinceCode}`, source: `regencies-${provinceCode}`, type: 'line', ... });
}

// On province click/zoom:
map.on('click', 'province-fill', (e) => {
  const code = e.features[0].properties.code;
  if (map.getSource(`regencies-${code}`)) return; // already loaded
  loadRegencies(code);
  map.setFilter('province-fill', ['!=', 'code', code]); // hide other provinces
});
```

### Feature State for Selection/Status
```tsx
// On region click:
const feature = e.features[0];
map.setFeatureState({ source: 'provinces', id: feature.id }, { selected: true, status: feature.properties.status });
// On unselect:
map.setFeatureState({ source: 'provinces', id: prevId }, { selected: false });
```

### WebGL Fallback (Text-Based Alternative)
```tsx
// src/components/map/MapFallback.tsx
export function MapFallback({ regions, selectedCode, onSelect }: MapFallbackProps) {
  return (
    <nav aria-label="Navigasi wilayah (fallback peta)">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {regions.map(r => (
          <li key={r.code}>
            <button
              className={`w-full text-left p-3 rounded-lg border transition ${r.code === selectedCode ? 'bg-primary text-white' : 'bg-background hover:bg-secondary-background'}`}
              onClick={() => onSelect(r.code)}
              aria-pressed={r.code === selectedCode}
            >
              <span className="font-medium">{r.name}</span>
              {r.status && <StatusBadge status={r.status} />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Attribution (Required)
- **Geometry**: "Batas administrasi: BPS / BIG (tanggal akses: YYYY-MM-DD)"
- **Data**: Per-layer source citations from `Source` registry
- Displayed in map footer and `/sumber` page.

### Accessibility
- `prefers-reduced-motion`: disable map animations (`map.jumpTo` instead of `flyTo`)
- Keyboard navigation: Tab to map, arrow keys to pan, Enter to select region
- Focus visible on selected region
- ARIA labels on map container and fallback list
- Color-blind safe palette (design.md tokens) + pattern/texture for status fills

### Performance
- GeoJSON total < 500KB initial (provinces only)
- Regency files loaded on demand (~20KB each)
- `maplibre-gl` chunk code-split via `dynamic(..., { ssr: false })`
- No `ScrollTrigger` on map; native camera transitions only

## Integration Points

| File | Purpose |
|------|---------|
| `src/app/peta/page.tsx` | Server component: fetches region list + status stats, passes to client map |
| `src/components/map/DisasterMap.tsx` | Client component: MapLibre, interactions, fallback |
| `src/components/map/MapFallback.tsx` | No-WebGL / reduced-motion alternative |
| `src/lib/map-data.ts` | Server-only: queries `Region` + `EventImpact` + `Stat`, returns serializable DTO |
| `public/geo/` | Static GeoJSON files (committed) |
| `public/map/style.json` | MapLibre style (committed) |

## Acceptance Criteria (Phase 3 Gate)
- [ ] Map renders provinces with status fills (no external tiles)
- [ ] Click province → loads regencies, shows region panel with stats + sources
- [ ] Fallback list works without WebGL, keyboard accessible
- [ ] `prefers-reduced-motion` respected
- [ ] Attribution visible
- [ ] No hydration errors, builds static
- [ ] Total map JS < 150KB gzipped (maplibre-gl ~120KB)