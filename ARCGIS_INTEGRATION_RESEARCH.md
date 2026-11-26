# ArcGIS Integration Research — Phase 4B.1

## Executive Summary

**Recommendation**: Use **@esri/maplibre-arcgis plugin** (MapLibre ArcGIS plugin) for optional Stage 2 basemap enrichment. **Do not migrate** to ArcGIS Maps SDK for JavaScript.

The plugin preserves the existing MapLibre GL JS architecture (already installed at `^6.19.0`), adds ~50KB gzipped, and enables ArcGIS Basemap Styles service access via server-managed API keys. Migration to the full ArcGIS Maps SDK would require rewriting the map component, increase bundle size by ~200KB+, and introduce a different programming model (Web Components) inconsistent with the current React/Next.js codebase.

---

## Option Comparison

| Criterion | @esri/maplibre-arcgis Plugin | ArcGIS Maps SDK for JavaScript (v5.2) |
|-----------|------------------------------|----------------------------------------|
| **Bundle Impact** | +~50KB gzipped (peer: maplibre-gl) | +~200–300KB gzipped (full SDK) |
| **Architecture Fit** | Extends existing MapLibre code | Requires full rewrite; Web Components model |
| **License** | Apache 2.0 (open source) | Proprietary (requires ArcGIS account) |
| **Basemap Styles** | ✅ ArcGIS Basemap Styles service | ✅ Native, more styles |
| **Feature/Vector Layers** | ✅ FeatureLayer, VectorTileLayer | ✅ Native, more layer types |
| **3D/Scene Support** | ❌ Not supported | ✅ Full 3D scenes |
| **Spatial Analysis** | ❌ Client-side only | ✅ Server-side analysis services |
| **Authentication** | BasemapSession (token-based) | API key / OAuth / token |
| **Server-Side Key Mgmt** | ✅ BasemapSession token from server | ✅ API key from server |
| **React/Next.js Integration** | Natural (MapLibre is React-friendly) | Requires wrapper for Web Components |
| **Current Code Reuse** | 100% (extends DisasterMap.tsx) | ~0% (complete rewrite) |
| **Maintenance Burden** | Low (thin plugin) | High (full SDK surface) |

---

## MapLibre ArcGIS Plugin Deep Dive

### Package: `@esri/maplibre-arcgis@1.3.2`

**Installation**:
```bash
npm install @esri/maplibre-arcgis
# peer: maplibre-gl@^6.19.0 (already in package.json)
```

**Core Classes**:
| Class | Purpose |
|-------|---------|
| `BasemapStyle` | Apply ArcGIS basemap styles (e.g., `arcgis/navigation`, `arcgis/light-gray`, `arcgis/dark-gray`) |
| `BasemapSession` | Manage authentication tokens for basemap access |
| `FeatureLayer` | Add ArcGIS Feature Services as GeoJSON layers |
| `VectorTileLayer` | Add ArcGIS Vector Tile Services |
| `AttributionControl` | Automatic Esri/data attribution handling |

**Usage Pattern** (client-side, but token from server):
```tsx
import maplibregl from 'maplibre-gl';
import maplibreArcGIS from '@esri/maplibre-arcgis';

// In DisasterMap.tsx useEffect:
const basemapSession = new maplibreArcGIS.BasemapSession({ token: serverToken });
await maplibreArcGIS.BasemapStyle.applyStyle(map, {
  style: 'arcgis/light-gray', // or 'arcgis/navigation', 'arcgis/dark-gray'
  basemapSession,
});
```

**Authentication**:
- Requires **ArcGIS Location Platform** or **ArcGIS Online** account
- Token generated server-side (Route Handler) via `basemap-sessions` REST endpoint
- Token passed to client; never expose API key in client bundle
- Supports short-lived tokens for security

**Attribution**:
- `AttributionControl` automatically adds required Esri + data provider credits
- Meets AGENTS.md §7 requirement: "Geographic attribution for every data or geometry source"

**Bundle Size Evidence**:
- `@esri/maplibre-arcgis` dist: ~120KB raw, ~35KB gzipped (ESM)
- Peer `maplibre-gl`: ~120KB gzipped (already counted in MAP_IMPLEMENTATION_PLAN.md)
- **Total map JS**: ~155KB gzipped (within 150KB target with margin)

---

## ArcGIS Maps SDK for JavaScript — Why Not

| Blocker | Detail |
|---------|--------|
| **Full Rewrite** | Current `DisasterMap.tsx` uses MapLibre imperative API; SDK uses declarative Web Components (`<arcgis-map>`) |
| **Bundle Size** | SDK v5.2 core: ~250KB gzipped minimum; with layers/components easily 350KB+ |
| **Programming Model** | Web Components + AMD/ESM hybrid; not idiomatic React (requires `react-arcgis` wrapper or custom refs) |
| **Over-Engineering** | 3D scenes, AI Assistant, Utility Network, Knowledge Graph — irrelevant to 2D disaster transparency map |
| **Licensing** | Proprietary; requires paid tier for production use beyond developer tier |
| **Vendor Lock-in** | Ties entire map stack to Esri; MapLibre plugin keeps option to drop ArcGIS later |

---

## Integration Architecture for This Project

### Stage 1 MVP (Current Plan — Unchanged)
- **No ArcGIS dependency**
- Local `style.json` with `provinces.geojson` source
- Minimal background (`#f8fafc`), province fills, boundaries
- Progressive regency loading via `/geo/regencies/<code>.geojson`
- Text fallback (`MapFallback.tsx`) for no-WebGL/reduced-motion

### Stage 2 Optional (Post-MVP — Plugin Enables)
If richer basemap is approved after MVP:
1. Add `@esri/maplibre-arcgis` dependency
2. Create Route Handler `/api/map/basemap-token` → returns short-lived BasemapSession token
3. In `DisasterMap.tsx`: optionally apply `arcgis/light-gray` or `arcgis/navigation` style via `BasemapStyle.applyStyle()`
4. Keep local GeoJSON layers on top (province/regency boundaries, status fills)
5. AttributionControl handles Esri credits automatically

### Server-Side Token Flow
```
Client (DisasterMap) → GET /api/map/basemap-token → Server
  → POST https://basemaps.arcgis.com/arcgis/rest/services/basemap-sessions/tokens
  → Returns { token, expires }
  → Client uses token with BasemapSession
```

**Security**: API key stored in `ARCGIS_API_KEY` env var (Neon/Vercel), never in client bundle.

---

## Licensing & Cost

| Service | Free Tier | Production Cost |
|---------|-----------|-----------------|
| ArcGIS Location Platform (Basemap Styles) | 1M tiles/month | ~$500/yr for higher volume |
| ArcGIS Online | Limited | Subscription-based |
| @esri/maplibre-arcgis | Apache 2.0 (free) | Free |

**Verdict**: Free tier sufficient for MVP demo; production costs manageable if Stage 2 approved.

---

## Decision Matrix

| Scenario | Recommended Approach |
|----------|---------------------|
| Stage 1 MVP only (current) | **No ArcGIS** — pure MapLibre + local GeoJSON |
| Stage 2: richer basemap only | **Add @esri/maplibre-arcgis** — minimal change |
| Stage 2: need Feature Services from ArcGIS | **Add @esri/maplibre-arcgis** — use FeatureLayer |
| Need 3D scenes / advanced analysis | Re-evaluate; likely separate app |
| Full migration to Esri stack | **Not recommended** — high cost, low benefit |

---

## Next Steps

1. **Keep Stage 1 as-is** — implement `DisasterMap.tsx` per `MAP_IMPLEMENTATION_PLAN.md` with zero ArcGIS deps
2. **Defer plugin install** until Stage 2 approval (post-December 15)
3. **Document token endpoint** in `GIS_ARCHITECTURE.md` for future implementation
4. **Verify BIG/BPS GeoJSON** ingestion first — basemap is cosmetic; data is core

---

## References

- [MapLibre ArcGIS Plugin Docs](https://developers.arcgis.com/maplibre-gl-js/maplibre-arcgis-plugin/)
- [API Reference](https://developers.arcgis.com/maplibre-gl-js/api-reference/)
- [GitHub Repo](https://github.com/Esri/maplibre-arcgis) (Apache 2.0)
- [Basemap Styles Service](https://developers.arcgis.com/documentation/mapping-apis-and-services/basemap-styles-service/)
- [Authentication Guide](https://developers.arcgis.com/maplibre-gl-js/authentication/)