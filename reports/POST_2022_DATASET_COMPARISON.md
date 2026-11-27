# Post-2022 Indonesian Administrative GeoJSON Dataset Comparison

**Date**: 2026-11-27  
**Status**: Comparative Analysis  

---

## 1. Dataset Summary

| Dataset | Status | Source Authority | Province Count | Regency Count | License | Geometry Quality |
|---------|--------|------------------|---------------|---------------|---------|------------------|
| mashadinoor/Indonesia-Geojson-2026 | **EXPIRED** | BIG (claimed) | 38 | **506** (507 files, 11 empty) | MIT | Valid GeoJSON |
| cahyadsn/wilayah_boundaries | REJECTED | Kemendagri | 38 | 289 | MIT | SQL/WKT only |
| BIG REST API | PENDING | Official BIG | 38? (539 raw) | 539? | Official | Large, requires pagination |
| **LOCAL TEMP** | N/A | N/A | 0 | 0 | N/A | N/A |

---

## 2. Detailed Analysis

### mashadinoor/Indonesia-Geojson-2026 (Candidate A)

**Status**: **DO NOT USE** - Pre-2022 Papua pemekaran

**Coverage Issues**:
- Total regencies found: 506 valid (507 files, one duplicate)
- **Missing 8 regencies** due to pre-2022 Papua boundaries
- Missing: Provinces 93, 94, 95, 96 (Papua Selatan, Pegunungan, Tengah, Barat Daya)

**Geometry Issues**:
- 11 files have `geometry: null`
- Examples: `Jawa_Timur.json`, `Kota_Magelang.json`, `Kota_Mojokerto.json`, etc.

**Evidence**:
- File count: 518
- Valid geometry: 507
- Empty geometry: 11
- Unique KDPKAB codes: 506
- Expected: 514

**Root Cause**: Source code date (2026) but data is from before Kepmendagri 300/2022

---

### cahyadsn/wilayah_boundaries (Candidate B)

**Status**: **REJECTED**

**Issues**:
- Format: SQL dump (not GeoJSON)
- Coverage: Only 289 regencies (225 missing)
- Source claim: Kepmendagri 300.2.2-2430/2025 (but incomplete)

---

### BIG ArcGIS REST Services (Candidate C)

**URL**: `https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer`

**Layers**:
- Layer 1: Provinsi (Province boundaries)
- Layer 2: Kabupaten/Kota (Regency/City boundaries)

**Status**: **ACCESS LIMITED**

**Evidence**:
- `returnCountOnly=true`: 539 features (includes duplicates/deprecated)
- GeoJSON query: **TIMEOUT** (large geometry files)
- Requires pagination via `resultOffset`/`resultRecordCount`

**Potential**:
- Official source
- Complete coverage (539 > 514)
- Requires pagination implementation

---

## 3. Coverage Verification

### Missing Regencies from mashadinoor Source

**Papua Post-2022 Provinces** (NOT IN SOURCE):

| Code | Name | Regencies (Kab + Kota) | Status |
|------|------|------------------------|--------|
| 93 | Papua Selatan | 4 + 0 = 4 | **MISSING** |
| 94 | Papua Pegunungan | 8 + 0 = 8 | **MISSING** |
| 95 | Papua Tengah | 8 + 0 = 8 | **MISSING** |
| 96 | Papua Barat Daya | 5 + 1 = 6 | **MISSING** |

**Total missing from Papua pemekaran**: 26 regency/city units

**But**: Source has 42 Papua regencies (91+92), post-pemekaran has 51 (91+92+93+94+95+96)

**Actual missing from our count**: 9 regencies (51 - 42 = 9)
**Plus discrepancy**: 1 (514 - 506 = 8)**

---

## 4. Recommendation

### Current Situation

**No complete post-2022 GeoJSON source is readily available.**

### Recommended Action

1. **Use BIG REST API for authoritative data extraction**
   - Implement pagination query for both layers
   - Filter to 514 valid regency codes
   - Convert Esri JSON to GeoJSON

2. **Or accept mashadinoor source with documented limitations**
   - Exclude 11 files with empty geometry
   - Add missing Papua 93-96 data manually from official sources
   - Document as "pre-2022 baseline with Papua updates needed"

### Priority Source

**BIG ArcGIS REST Services** is the only authoritative source, but requires:
- Pagination implementation
- Geometry simplification for web use
- Post-processing to filter deprecated codes

---

## 5. Next Steps

1. Implement BIG REST API query with pagination
2. Or find alternative authoritative source
3. Or update mashadinoor source with missing Papua data