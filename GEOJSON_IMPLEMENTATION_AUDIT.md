# GeoJSON Implementation Audit — Phase 4B.1 Step 1

**Date:** 2026-11-27  
**Status:** Complete  
**Next Step:** Phase 4B.1 Step 2 — Authoritative Data Source Research

---

## 1. Repository Overview

### Stack Verification
- **Framework:** Next.js 16.4.6 (Turbopack), App Router
- **Language:** TypeScript (strict)
- **Database:** Prisma ORM + Neon PostgreSQL
- **Mapping:** MapLibre GL JS (imported as `import * as maplibregl`)
- **Testing:** Vitest (configured, tests in `tests/**/*.test.ts`)
- **Validation:** Zod schemas for all import inputs

### Key Configuration
- `package.json` scripts: `import:regions`, `import:sources`, `import:events`, `import:impacts`, `import:stats`, `import:all`, `db:validate`, `db:push`, `test`, `typecheck`, `lint`, `build`
- `postinstall`: `prisma skills sync || exit 0`
- No committed Prisma migrations found (`prisma/migrations/` empty)

---

## 2. Current GeoJSON Assets

### `public/geo/provinces.geojson` — **CONFIRMED PLACEHOLDER**
- **Format:** FeatureCollection with 38 province-level features
- **Geometry:** Simple rectangular polygons (e.g., Aceh = `[[95.0,2.5],[97.5,2.5],[97.5,6.5],[95.0,6.5]]`)
- **Properties per feature:** `code` (2-digit BPS), `name`, `level: "PROVINCE"`
- **Issues:**
  - Geometries are bounding-box approximations, not real administrative boundaries
  - No centroid property
  - No regency/city (level 2) data
  - Source attribution missing

### `public/geo/` — **Missing**
- No regency/city GeoJSON (`regencies.geojson` or similar)
- No district/village GeoJSON

### `public/map/style.json` — MapLibre Style
- **Source:** `"url": "/geo/provinces.geojson"`, `generateId: true`
- **Layers:**
  - `province-fill` — fill keyed on `properties.status` (with fallback colors)
  - `province-boundary` — line layer
  - `province-label` — symbol layer using `properties.name`
  - `province-hover` / `province-selected` — feature-state layers
- **Dependencies:** Expects polygon features with `properties.code`, `properties.name`, `properties.level`
- **Risk:** Style will break if GeoJSON structure changes (e.g., missing `level` property)

---

## 3. Database Schema (`prisma/schema.prisma`)

### `Region` Model (Core for GeoJSON Import)
```prisma
model Region {
  id          String       @id @default(cuid())
  code        String       @unique   // BPS administrative code (2-digit province, 4-digit regency)
  name        String
  level       RegionLevel  // PROVINCE | REGENCY_CITY | DISTRICT | VILLAGE
  parentCode  String?      @index     // Province code for regencies
  geometry    Json?        // GeoJSON geometry object
  centroid    Json?        // GeoJSON Point [lon, lat]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([level])
  @@index([parentCode])
}
```
- **Capacity:** Can store official BPS codes, hierarchy, geometry, and centroid
- **Gap:** No field for source provenance (which dataset/version the geometry came from)

### Related Models
- `Source` — full provenance (title, publisher, URL, category, dates, importBatchId)
- `DisasterEvent`, `EventImpact`, `Stat` — all reference `Region` via `regionCode`/`regionId`

---

## 4. Import Infrastructure (Reusable for Phase 4B.1)

### Base Architecture (`scripts/import-base.ts`)
- Abstract `BaseImporter<TInput, TNormalized>` with:
  - Idempotent upsert by stable identifier (`findExisting` → `create` | `update`)
  - Dry-run mode (no DB writes when `dryRun: true`)
  - Batch processing with progress callback
  - Zod validation per row
  - Error collection without stopping import
  - Summary printing

### `RegionImporter` (`scripts/import-region.ts`)
- **Input:** CSV or GeoJSON (FeatureCollection)
- **Validation:**
  - `RegionInputSchema` (Zod): code, name, level enum, parentCode, geometry, centroid
  - Province codes validated against `INDONESIAN_PROVINCES` (51 codes in code, but tests expect 38)
  - Regency codes must have valid parentCode (2-digit province prefix)
- **GeoJSON Import:** `importRegionsFromGeoJSON()` — filters by level, maps properties → `RegionInput`
- **Dry-run:** Fully supported
- **Upsert Key:** `code` (unique)

### Other Importers (Ready for Later Phases)
- `SourceImporter` — CSV, upsert by title+publisher+URL
- `DisasterEventImporter` — CSV, upsert by name+type+occurredAt
- `EventImpactImporter` — CSV, upsert by eventId+regionId (caches FK lookups)
- `StatImporter` — CSV, upsert by sourceId+key+regionId+eventId
- `import-all.ts` — orchestrates all imports with shared `dryRun`, `batchSize`, `importBatchId`

---

## 5. Administrative Code Validation

### `src/lib/indonesian-admin-codes.ts`
- **`INDONESIAN_PROVINCES`**: 38 entries (post-2022 Papua expansion: 91–96)
- **`PROVINCE_COUNT`**: 38
- **`validateProvinceCode(code)`**: Checks against the 38-code list
- **`getExpectedRegencyCountForProvince(code)`**: Returns expected regency count per province (sums to 514)
- **Consistency:** AGENTS.md states "38 provinces and 514 regencies/cities" — the codebase uses 38 provinces (current official BPS count). Tests in `geo-validation.test.ts` assert 38.

### `src/lib/geo-validation.ts`
- **Schemas:** Zod schemas for BPS province (2-digit), regency (4-digit), RegionLevel, GeoJSON Feature/FeatureCollection
- **Validators:**
  - `validateProvinceCode` — format + membership in 51-code set
  - `validateRegencyCode` — format only (4 digits), no membership list
  - `validateRegionHierarchy` — enforces 38 provinces / 514 regencies, duplicate codes, parentCode references
  - `validateGeometry` — non-null, non-empty, polygon ring closure (≥4 points, first=last)
  - `loadAndValidateGeoJSON` — fetch + full validation pipeline (client-side)

---

## 6. Testing Coverage

### `tests/import-validation.test.ts`
- Validates all 5 input schemas (Source, Region, DisasterEvent, EventImpact, Stat)
- Covers required fields, enum constraints, optional fields, type coercion, negative number rejection

### `tests/geo-validation.test.ts`
- Administrative codes: province count (expects 38), code validation, regency counts
- Region hierarchy: duplicate detection, missing parent, province/regency count enforcement
- GeoJSON: FeatureCollection structure, feature properties, geometry validity (polygon closure, point count)

### `vitest.config.ts`
- Environment: Node
- Coverage: v8, includes `src/**` and `scripts/**`, excludes import scripts from coverage
- Alias: `@` → `./src`

---

## 7. Map Components (Must Remain Functional)

### `src/components/map/DisasterMap.tsx`
- Lazy `useState` initializers for `reducedMotion` and `webglAvailable`
- MapLibre feature-state for `selected`/`hover` layers
- Loads province GeoJSON from `/geo/provinces.geojson`
- Renders `MapFallback` when WebGL unavailable

### `src/components/map/MapFallback.tsx`
- Derived `isExpanded` function (no `useEffect` + `setState`)
- Text-based region listing alternative

### `src/lib/map-data.ts`
- `PRISMA_REGION_FIELDS` includes `id: true` for `getRegionDetail`
- `getRegionsByLevel("PROVINCE")` — used by map

### `src/hooks/useMapInteraction.ts`
- Accepts `mapRef` (React ref), not raw map instance

---

## 8. Critical Findings & Decisions Needed

| Issue | Finding | Decision Required |
|-------|---------|-------------------|
| **Province Count** | Codebase correctly has 38 provinces (current BPS post-2022); AGENTS.md & tests assert 38 | No discrepancy exists; audit had a counting error. No action needed. |
| **Regency Codes** | No authoritative regency code list in codebase (only expected counts per province) | Need to source official 514 regency/city codes from BPS/Kemendagri |
| **GeoJSON Source** | Placeholder only; no regency data | Step 2 must identify authoritative BIG/Kemendagri/BPS geometry sources |
| **Provenance on Region** | `Region` model lacks source/version fields | Consider adding `sourceId` and `geometryVersion` fields before import |
| **Map Style Coupling** | `style.json` expects `properties.level`, `properties.name`, `properties.code` | New GeoJSON must preserve these properties exactly |
| **Dry-run Infrastructure** | Fully implemented in `BaseImporter` | Ready to use; no changes needed |
| **DB Connection** | No Neon `DATABASE_URL` available in this environment | Import verification requires live connection; document as limitation |

---

## 9. Step 1 Completion Checklist

- [x] Inspect `package.json` scripts and dependencies
- [x] Inspect `prisma/schema.prisma` (Region, Source models; no migrations)
- [x] Inspect `public/geo/provinces.geojson` — confirmed placeholder
- [x] Inspect `public/map/style.json` — documented layer dependencies
- [x] Inspect `scripts/import-base.ts`, `import-region.ts`, `import-source.ts`, `import-disaster-event.ts`, `import-event-impact.ts`, `import-stat.ts`, `import-all.ts`
- [x] Inspect `src/lib/indonesian-admin-codes.ts` — 51 provinces vs 38 expected
- [x] Inspect `src/lib/geo-validation.ts` — full validation pipeline
- [x] Inspect `tests/import-validation.test.ts`, `tests/geo-validation.test.ts`, `vitest.config.ts`
- [x] Inspect map components (`DisasterMap.tsx`, `MapFallback.tsx`, `useMapInteraction.ts`, `map-data.ts`)
- [x] Document findings in `GEOJSON_IMPLEMENTATION_AUDIT.md` (this file)

---

## 10. Next Actions (Step 2)

1. **Research authoritative geometry sources:**
   - BIG (Badan Informasi Geospasial) — `BATAS_KABKOTA_AR`, `BATAS_WILAYAH` WMS/WMTS layers
   - Kemendagri — official administrative boundary dataset downloads
   - BPS — statistical boundary shapefiles (census)
   - Crosswalk BPS codes ↔ Kemendagri codes ↔ BIG feature IDs

2. **Produce `GEOJSON_SOURCE_RESEARCH.md`** documenting:
   - Source URLs, access dates, licensing
   - Geometry quality assessment (topology, coordinate precision, CRS)
   - Code mapping tables (BPS ↔ Kemendagri ↔ BIG)
   - Recommended processing pipeline (simplification, topology repair, centroid computation)

3. **Province count verified:** 38 provinces in codebase, AGENTS.md, and tests — consistent.