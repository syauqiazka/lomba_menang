# GIS Architecture — Phase 4B.1 (National Disaster Map)

## Overview

This document defines the MapLibre GL JS architecture for the national disaster transparency map (`/peta`), incorporating the ArcGIS integration evaluation from `ARCGIS_INTEGRATION_RESEARCH.md`. It extends `MAP_IMPLEMENTATION_PLAN.md` with implementation-ready specifications.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, MapLibre GL JS 6.19+, Tailwind 4.3.3
**Design System**: `design.md` (editorial data-journalism aesthetic, no external tiles Stage 1)
**Constraints**: AGENTS.md §7 (Stage 1 MVP), §8 (GSAP rules), §6 (performance), §5 (security)

---

## Architecture Decision Record

| Decision | Rationale |
|----------|-----------|
| **MapLibre GL JS (not Mapbox/Leaflet/ArcGIS SDK)** | Open source, no tile server required, React-friendly, small bundle (~120KB gzipped) |
| **No external basemap Stage 1** | AGENTS.md §7: "Use no external base-map tiles"; local style avoids token management, costs, attribution complexity |
| **@esri/maplibre-arcgis plugin optional Stage 2** | Preserves MapLibre codebase; enables ArcGIS Basemap Styles if approved post-MVP; Apache 2.0 license |
| **Server-side token management** | AGENTS.md §5.1: "Keep secrets out of source, logs, errors"; API keys never in client bundle |
| **Progressive GeoJSON loading** | AGENTS.md §6: "Load detailed regency/city geometry only when needed"; total initial < 500KB |
| **Text fallback mandatory** | AGENTS.md §7: "Provide a text-based alternative... no-WebGL fallback" |

---

## Component Architecture

```
src/
├── app/
│   ├── peta/
│   │   ├── page.tsx                 # Server Component: fetches data, passes to client map
│   │   └── loading.tsx              # Streaming SSR loading state
│   └── api/
│       └── map/
│           └── basemap-token/
│               └── route.ts         # Route Handler: returns short-lived ArcGIS BasemapSession token (Stage 2)
├── components/
│   ├── map/
│   │   ├── DisasterMap.tsx          # Client Component: MapLibre, interactions, feature state
│   │   ├── MapFallback.tsx          # No-WebGL / reduced-motion text alternative
│   │   ├── MapLegend.tsx            # Status legend + attribution
│   │   ├── MapFilters.tsx           # Status/province filters (client state)
│   │   └── RegionPanel.tsx          # Slide-over panel: region details, stats, sources
│   └── ui/
│       ├── Badge.tsx                # Status badges (uses design.md tokens)
│       ├── Card.tsx                 # Panel containers
│       └── Button.tsx               # Filter controls
├── lib/
│   ├── map-data.ts                  # Server-only: Prisma queries → serializable DTO
│   ├── map-utils.ts                 # Client utilities: color maps, formatters
│   └── arcgis-token.ts              # Server utility: BasemapSession token fetch (Stage 2)
├── hooks/
│   └── useMapInteraction.ts         # MapLibre event handlers (click, hover, zoom)
└── types/
    └── map.ts                       # Shared TypeScript interfaces (DTOs, feature props)
```

---

## Data Flow

### Server Component (`src/app/peta/page.tsx`)
```tsx
// 1. Fetch serializable region data (provinces + status + stats)
const regions = await getMapRegions(); // → RegionMapDTO[]

// 2. Pass to client map (no Prisma models, no Date objects)
return <DisasterMapClient initialRegions={regions} />;
```

### Client Component (`DisasterMap.tsx`)
```tsx
'use client';
import dynamic from 'next/dynamic';
const MapLibre = dynamic(() => import('maplibre-gl'), { ssr: false });
const MapLibreCSS = dynamic(() => import('maplibre-gl/dist/maplibre-gl.css'), { ssr: false });

// 3. Initialize map with local style.json
// 4. Add provinces source from /geo/provinces.geojson
// 5. Apply feature-state for selection/status
// 6. On province click → lazy-load regencies/<code>.geojson
// 7. Sync selection → RegionPanel (via React state)
```

### Data Transfer Objects (`src/types/map.ts`)
```tsx
interface RegionMapDTO {
  code: string;           // BPS code (e.g., "53", "5306")
  name: string;           // Display name
  level: 'province' | 'regency';
  parentCode?: string;    // For regencies
  status?: PublicStatus;  // DILAPORKAN_BELUM_MENERIMA_BANTUAN | AKSES_TERISOLIR | BELUM_TERVERIFIKASI
  stats?: StatDTO[];      // Key statistics for panel
  centroid?: [number, number]; // [lng, lat] for map flyTo
}

interface StatDTO {
  key: string;
  label: string;
  value: string;
  unit?: string;
  asOfDate: string;       // ISO 8601
  source: {
    title: string;
    category: SourceCategory;
    url?: string;
  };
}
```

---

## MapLibre Style Specification (`public/map/style.json`)

```json
{
  "version": 8,
  "name": "Bismillah Menang Base",
  "metadata": {
    "attribution": "Batas administrasi: BPS / BIG (akses: 2026-11-26)"
  },
  "sources": {
    "provinces": {
      "type": "geojson",
      "data": "/geo/provinces.geojson",
      "generateId": true
    }
  },
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#f8fafc" } },
    {
      "id": "province-fill",
      "type": "fill",
      "source": "provinces",
      "paint": {
        "fill-color": [
          "match",
          ["get", "status"],
          "DILAPORKAN_BELUM_MENERIMA_BANTUAN", "#fff3e0",
          "AKSES_TERISOLIR", "#ffebee",
          "BELUM_TERVERIFIKASI", "#f5f5f5",
          "#e0e0e0"
        ],
        "fill-opacity": 0.7,
        "fill-outline-color": "#9e9e9e"
      }
    },
    {
      "id": "province-boundary",
      "type": "line",
      "source": "provinces",
      "paint": { "line-color": "#9e9e9e", "line-width": 1.5 }
    },
    {
      "id": "province-label",
      "type": "symbol",
      "source": "provinces",
      "layout": {
        "text-field": ["get", "name"],
        "text-font": ["Roboto Regular"],
        "text-size": 11,
        "text-anchor": "center"
      },
      "paint": { "text-color": "#1a1a1a", "text-halo-color": "#ffffff", "text-halo-width": 1 }
    }
  ]
}
```

**Status Color Mapping** (from `design.md` §1.3):
| Status | Fill | Text | Use Case |
|--------|------|------|----------|
| `DILAPORKAN_BELUM_MENERIMA_BANTUAN` | `#fff3e0` (warning bg) | `#ef6c00` | Reported no assistance |
| `AKSES_TERISOLIR` | `#ffebee` (danger bg) | `#c62828` | Isolated access |
| `BELUM_TERVERIFIKASI` | `#f5f5f5` (neutral bg) | `#616161` | Unverified |
| Default (no status) | `#e0e0e0` | `#1a1a1a` | No reports |

**Accessibility**: Colors meet WCAG AA; pattern overlays not needed at province scale (per `design.md` §6.1: "legible without relying on color alone" — labels + boundaries provide redundancy).

---

## Progressive Regency Loading

```tsx
// In DisasterMap.tsx
async function loadRegencies(provinceCode: string) {
  if (map.getSource(`regencies-${provinceCode}`)) return;

  const resp = await fetch(`/geo/regencies/${provinceCode}.geojson`);
  if (!resp.ok) throw new Error(`Failed to load regencies for ${provinceCode}`);
  const data = await resp.json();

  map.addSource(`regencies-${provinceCode}`, { type: 'geojson', data, generateId: true });

  // Fill layer with status colors
  map.addLayer({
    id: `regency-fill-${provinceCode}`,
    type: 'fill',
    source: `regencies-${provinceCode}`,
    paint: {
      'fill-color': [ /* same status match expression */ ],
      'fill-opacity': 0.6,
      'fill-outline-color': '#b0bec5'
    }
  });

  // Boundary layer
  map.addLayer({
    id: `regency-boundary-${provinceCode}`,
    type: 'line',
    source: `regencies-${provinceCode}`,
    paint: { 'line-color': '#b0bec5', 'line-width': 1 }
  });

  // Hide other provinces
  map.setFilter('province-fill', ['!=', 'code', provinceCode]);
  map.setFilter('province-boundary', ['!=', 'code', provinceCode]);
  map.setFilter('province-label', ['!=', 'code', provinceCode]);
}
```

**File Structure** (committed to repo):
```
public/geo/
├── provinces.geojson          # ~50KB, 38 features, simplified
└── regencies/
    ├── 11.geojson             # Aceh regencies (~20KB)
    ├── 12.geojson             # Sumatera Utara
    ... (514 total across 38 directories)
    └── 94.geojson             # Papua Selatan
```

**Simplification**: Visvalingam-Whyatt via `mapshaper` to target sizes; topology preserved (`-simplify 10% keep-shapes`).

---

## Feature State & Selection

```tsx
// On region click (province or regency)
map.on('click', 'province-fill', (e) => handleRegionClick(e.features[0]));
map.on('click', /regency-fill-.*/, (e) => handleRegionClick(e.features[0]));

function handleRegionClick(feature) {
  const { code, name, level, status } = feature.properties;
  const sourceId = feature.layer.id.includes('regency') ? `regencies-${code.slice(0,2)}` : 'provinces';

  // Clear previous selection
  if (selectedFeatureId) {
    map.setFeatureState({ source: selectedSource, id: selectedFeatureId }, { selected: false });
  }

  // Set new selection
  map.setFeatureState({ source: sourceId, id: feature.id }, { selected: true, status });
  selectedFeatureId = feature.id;
  selectedSource = sourceId;

  // Update React state for RegionPanel
  setSelectedRegion({ code, name, level, status, sourceId });
}
```

**Feature State Styles** (added after map load):
```tsx
map.addLayer({
  id: 'province-selected',
  type: 'line',
  source: 'provinces',
  paint: {
    'line-color': '#1a1a1a',
    'line-width': 3
  },
  filter: ['==', ['feature-state', 'selected'], true]
});
```

---

## Text Fallback (`MapFallback.tsx`)

```tsx
export function MapFallback({ regions, selectedCode, onSelect }: MapFallbackProps) {
  return (
    <nav aria-label="Navigasi wilayah (alternatif peta)" className="space-y-2">
      {regions.map((r) => (
        <button
          key={r.code}
          className={`w-full text-left p-3 rounded-lg border transition ${
            r.code === selectedCode
              ? 'bg-primary text-white border-primary'
              : 'bg-background hover:bg-secondary-background border-border'
          }`}
          onClick={() => onSelect(r.code)}
          aria-pressed={r.code === selectedCode}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.name}</span>
            {r.status && <StatusBadge status={r.status} />}
          </div>
          {r.stats && (
            <dl className="mt-2 text-sm text-secondary-text grid grid-cols-2 gap-1">
              {r.stats.map((s) => (
                <>
                  <dt key={s.key}>{s.label}</dt>
                  <dd>{s.value} {s.unit ?? ''}</dd>
                </>
              ))}
            </dl>
          )}
        </button>
      ))}
    </nav>
  );
}
```

**Trigger Conditions**:
- `prefers-reduced-motion: reduce` (CSS media query)
- WebGL unavailable (`canvas.getContext('webgl')` returns null)
- User toggles "Teks Alternatif" button in map toolbar

---

## Accessibility Implementation

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | `map.getCanvas().tabIndex = 0`; arrow keys pan; Enter selects; Escape clears |
| Focus visible | CSS `:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }` on canvas |
| ARIA labels | `<div role="application" aria-label="Peta bencana Indonesia">` |
| Live region | `aria-live="polite"` on RegionPanel for selection changes |
| Color blindness | Status colors distinguishable in protanopia/deuteranopia (tested via Coblis) |
| Reduced motion | `prefers-reduced-motion` → `map.jumpTo()` instead of `flyTo()`; disable GSAP |
| Text alternative | `MapFallback` component rendered when WebGL unavailable or toggled |

---

## Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial map JS (gzipped) | < 150KB | `maplibre-gl` ~120KB + app code ~20KB |
| `provinces.geojson` | < 100KB | Simplified to ~50KB |
| Regency GeoJSON (per province) | < 25KB | Simplified to ~20KB |
| Time to Interactive (map) | < 3s on 3G | Code-split via `dynamic(..., { ssr: false })` |
| Largest Contentful Paint | < 2.5s | SSR HTML + streaming `loading.tsx` |

**Optimizations**:
- `dynamic()` import for MapLibre (no SSR bundle)
- GeoJSON served as static files (CDN cacheable, `Cache-Control: public, max-age=31536000, immutable`)
- Regency files loaded on-demand (user interaction)
- No `ScrollTrigger` on map (AGENTS.md §8.3)

---

## Stage 2 Extension Points (Post-MVP)

### ArcGIS Basemap Integration
```tsx
// In DisasterMap.tsx (guarded by feature flag)
import maplibreArcGIS from '@esri/maplibre-arcgis';

async function applyArcGISBasemap(map: maplibregl.Map) {
  const tokenResp = await fetch('/api/map/basemap-token');
  const { token } = await tokenResp.json();

  const session = new maplibreArcGIS.BasemapSession({ token });
  await maplibreArcGIS.BasemapStyle.applyStyle(map, {
    style: 'arcgis/light-gray', // Matches design.md light theme
    basemapSession: session
  });

  // Re-add our GeoJSON layers on top
  readdLocalLayers(map);
}
```

**Server Route Handler** (`src/app/api/map/basemap-token/route.ts`):
```tsx
export async function GET() {
  const apiKey = process.env.ARCGIS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const resp = await fetch('https://basemaps.arcgis.com/arcgis/rest/services/basemap-sessions/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ apiKey, duration: '60' }) // 60 min token
  });

  if (!resp.ok) return NextResponse.json({ error: 'Token failed' }, { status: 502 });
  const data = await resp.json();
  return NextResponse.json({ token: data.token, expires: data.expires });
}
```

### Additional Layers (Future)
| Layer | Source | Integration |
|-------|--------|-------------|
| BMKG Real-time Earthquake | BMKG API / Feature Service | `FeatureLayer` from `@esri/maplibre-arcgis` |
| NASA FIRMS Hotspots | FIRMS API (CSV → GeoJSON) | Periodic import → static GeoJSON |
| InaRISK Hazard Zones | BIG/InaRISK Vector Tiles | `VectorTileLayer` |
| Flood Extents | BNPB / Sentinel-1 | Raster tile service (separate evaluation) |

---

## Security Checklist

- [ ] No API keys in client bundle (tokens from `/api/map/basemap-token`)
- [ ] Rate limit `/api/map/basemap-token` (e.g., 10 req/min/IP)
- [ ] Validate GeoJSON on import (no executable content)
- [ ] CSP allows `maplibre-gl` WASM/CDN if used
- [ ] No user input in map style expressions (prevent injection)
- [ ] AttributionControl auto-handles Esri credits

---

## Testing Requirements

| Test | Command | Criteria |
|------|---------|----------|
| TypeScript | `npx tsc --noEmit` | Zero errors |
| Lint | `npm run lint` | Zero warnings |
| Build | `npm run build` | Successful, map chunk < 150KB gz |
| Unit: map-data.ts | `npm run test` | DTO serialization correct |
| Integration: map loads | Playwright (headed) | Provinces render, click loads regencies |
| Fallback: no WebGL | Playwright (headless, `--disable-gpu`) | MapFallback renders, keyboard works |
| Reduced motion | Playwright + `prefers-reduced-motion` | No `flyTo`, static transitions |
| Accessibility | `npm run test:a11y` (axe-core) | WCAG AA, no violations |

---

## Deployment Checklist

- [ ] `public/geo/provinces.geojson` committed (verified 38 features, BPS codes)
- [ ] `public/geo/regencies/<code>.geojson` committed (514 total, validated hierarchy)
- [ ] `public/map/style.json` committed
- [ ] `ARCGIS_API_KEY` in Vercel/Neon env (Stage 2 only)
- [ ] Cache headers for `/geo/**` and `/map/style.json` (1 year, immutable)
- [ ] `robots.txt` allows `/geo/**` and `/map/**`
- [ ] Sentry/error tracking on map initialization failures

---

## File Inventory (Current → Target)

| File | Status | Notes |
|------|--------|-------|
| `src/app/peta/page.tsx` | ⬜ Placeholder | Convert to Server Component + data fetch |
| `src/app/peta/loading.tsx` | ❌ Missing | Add streaming loading skeleton |
| `src/components/map/DisasterMap.tsx` | ❌ Missing | Core client map component |
| `src/components/map/MapFallback.tsx` | ❌ Missing | Text alternative |
| `src/components/map/RegionPanel.tsx` | ❌ Missing | Slide-over detail panel |
| `src/components/map/MapFilters.tsx` | ❌ Missing | Status/province filters |
| `src/components/map/MapLegend.tsx` | ❌ Missing | Legend + attribution |
| `src/lib/map-data.ts` | ❌ Missing | Server queries → DTO |
| `src/lib/map-utils.ts` | ❌ Missing | Color maps, formatters |
| `src/types/map.ts` | ❌ Missing | Shared interfaces |
| `src/hooks/useMapInteraction.ts` | ❌ Missing | Event handlers |
| `public/geo/provinces.geojson` | ⬜ Empty | Ingest BPS/BIG boundaries |
| `public/geo/regencies/*.geojson` | ❌ Missing | Ingest per-province |
| `public/map/style.json` | ❌ Missing | Minimal local style |

---

## References

- `MAP_IMPLEMENTATION_PLAN.md` — Original blueprint
- `ARCGIS_INTEGRATION_RESEARCH.md` — Plugin vs SDK evaluation
- `design.md` — Visual tokens, accessibility, responsive specs
- `AGENTS.md` — Non-negotiable rules (§6, §7, §8)
- `DATA_INGESTION.md` — GeoJSON import pipeline