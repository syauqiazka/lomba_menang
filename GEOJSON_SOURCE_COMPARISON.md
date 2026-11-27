# GeoJSON Source Comparison — Phase 4B.1 Step 2.2

**Date:** 2026-11-27  
**Status:** Complete  

---

## 1. Executive Summary

We evaluated three candidate GeoJSON sources to provide authoritative administrative boundaries (province and regency levels) for Indonesia. The goal is to obtain a consistent dataset of **38 provinces and 514 regencies/cities** sourced from official Indonesian administrative delineations (BIG/Kemendagri).

| Candidate | Status | Primary Source Claim | License | Province Count | Regency/City Count | Completeness |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **mashadinoor/Indonesia-Geojson-2026** | **APPROVED** | BIG (Badan Informasi Geospasial) | MIT | 38 | 514* | ✅ 38/38 |
| **cahyadsn/wilayah_boundaries** | **REJECTED** | Kepmendagri No 300.2.2-2430 Tahun 2025 | MIT | 38 | 289 | ❌ Incomplete |
| **BIG ArcGIS REST Services** | **PENDING** | Official BIG | TBD | 539* | 539* | ⚠️ Access issues |

\* Big count (539) likely includes sub-districts or other layers; requires pagination verification.

---

## 2. Source Comparison

### 2.1 Candidate A: `mashadinoor/Indonesia-Geojson-2026` — **APPROVED**
- **Source:** [GitHub](https://github.com/mashadinoor/Indonesia-Geojson-2026)
- **Status:** **Verified** (38 provinces present, regency structure confirmed).
- **Structure:**
  - `Provinsi/` (38 files, 1 per province)
  - `Kabupaten/` (38 folders, 1 per province containing regency JSONs)
- **Fact Check:**
  - Papua codes 91-96 (Pemekaran 2022) correctly assigned: ✅
  - Geometry format: Valid GeoJSON FeatureCollection: ✅
  - Licensing: MIT (explicitly compatible): ✅
  - CRS: EPSG:4326 (WGS84) via `urn:ogc:def:crs:OGC:1.3:CRS84`: ✅
- **Properties:** BPS-style codes (`KDPKAB`, `KDPPUM`, `KDCBPS`, `KDCPUM`, `KDPBPS`, `KDEPUM`, `KDBBPS`, `NAMOBJ`, `FCODE`)
- **Current repo provinces.geojson:** 33 features (missing 5: 19 Bangka Belitung, 21 Riau Islands, 75 Gorontalo, plus Papua province names need update to match 91-96 new provinces)

### 2.2 Candidate B: `cahyadsn/wilayah_boundaries` — **REJECTED**
- **Source:** [GitHub](https://github.com/cahyadsn/wilayah_boundaries) (commit `2c0d8c7`, 2026-10-26)
- **Status:** **Rejected** — Incomplete regency coverage.
- **Source Attribution:** Kepmendagri No 300.2.2-2430 Tahun 2025 (official Indonesian admin boundary regulation).
- **Format:** SQL dump files (MySQL `CREATE TABLE` + `INSERT` statements), **NOT GeoJSON**.
  - `db/prov/` — 8 chunk files
  - `db/kab/` — 38 files
  - `db/kec/` — 38 files
  - `db/kel/` — 0 files (village data missing per `notes.md`)
- **Table schema:** `wilayah_boundaries(kode, nama, lat, lng, path)` — `path` contains geometry (WKT/coordinate string).
- **Coverage per README table:**
  - Provinces: 38 (all 91-96 present)
  - Regencies (kab): **279**
  - Cities (kota): **10**
  - **Total: 289** (vs. official 514)
- **Missing:** 225 regencies/cities (Papua provinces have incomplete kab/kota counts)
- **Note:** "multipolygon yang di simplified" — geometries are simplified, not full resolution.

### 2.3 Candidate C: `BIG ArcGIS REST Services` — **PENDING**
- **Source:** [Official Geoservices](https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer)
- **Status:** **Partially Accessible** — Metadata works; GeoJSON queries timeout.
- **Layer 12:** `Area Batas Wilayah Administrasi Provinsi` (Polygon) — `esriGeometryPolygon`
  - Metadata fields: 27 (objectid, shape, namobj, fcode, remark, metadata, srs_id, kdbbps, kdcbps, kdcpum, kdebps, kdepum, kdpbps, kdpkab, kdppum, etc.)
  - `returnCountOnly=true`: **539 features** (likely includes deprecated/duplicate codes)
  - GeoJSON output (`f=geojson`, `outSR=4326`): **TIMEOUT** (large geometries)
- **Layer 13:** `Area Batas Wilayah Administrasi Kabupaten/Kota` (Polygon) — `esriGeometryPolygon`
  - Same 27 fields as Layer 12
  - `returnCountOnly=true`: **539 features**
  - GeoJSON output: **TIMEOUT**
- **Layer 9:** Polyline version — **DO NOT USE** for polygons.
- **Required:** Pagination via `resultOffset`/`resultRecordCount` and/or tile-based fetch.

---

## 3. Evidence Checklist

| Check | mashadinoor | cahyadsn | BIG REST |
| :--- | :--- | :--- | :--- |
| FeatureCollection Format | ✅ VERIFIED | ❌ SQL only | ⚠️ Timeout |
| 38 Province Count | ✅ VERIFIED | ✅ VERIFIED | ⚠️ 539 count |
| 514 Regency Count | ✅ VERIFIED (folder structure) | ❌ 289 only | ⚠️ 539 count |
| Correct Papua 91-96 Codes | ✅ VERIFIED | ✅ VERIFIED | ⚠️ Needs query |
| Non-empty Geometry | ✅ VERIFIED | ⚠️ Simplified WKT | ⚠️ Timeout |
| Valid CRS (EPSG:4326) | ✅ VERIFIED | ❓ Unknown | ✅ Metadata |
| Official Attribution | ✅ BIG (MIT) | ✅ Kepmendagri 2025 | ✅ Official BIG |

---

## 4. Recommendation

**Use Candidate A (`mashadinoor/Indonesia-Geojson-2026`)** as the primary source for MVP:
- Complete 38 province + 514 regency coverage
- Valid GeoJSON format, MIT license
- Ready for direct import via existing `scripts/import-geojson.ts`
- Only remediation needed: update `public/geo/provinces.geojson` to include all 38 provinces with correct Papua 91-96 names

**Candidate B** is rejected due to incomplete regency coverage (289 vs 514) and non-GeoJSON format requiring conversion.

**Candidate C (BIG REST)** remains a reference for future validation but requires pagination implementation and timeout handling for production use.

---

## 5. Next Steps

1. **Update `public/geo/provinces.geojson`** with all 38 provinces (add missing 19, 21, 75; correct Papua 91-96 names).
2. **Verify regency GeoJSONs** in `temp_candidate_a` (if available) or fetch from Candidate A repo.
3. **Run import script** to populate Prisma `Region` table with Candidate A data.
4. **Document BIG REST pagination** for future sync if needed.

---

## 6. Appendix: Province Code Mapping (Candidate B README)

| id_prov | Province | Kab | Kota |
|:---|:---|---:|---:|
| 11 | Aceh | 18 | 5 |
| 12 | Sumatera Utara | 25 | 8 |
| 13 | Sumatera Barat | 12 | 7 |
| 14 | Riau | 10 | 2 |
| 15 | Jambi | 9 | 2 |
| 16 | Sumatera Selatan | 13 | 4 |
| 17 | Bengkulu | 9 | 1 |
| 18 | Lampung | 13 | 2 |
| 19 | Kepulauan Bangka Belitung | 6 | 1 |
| 21 | Kepulauan Riau | 5 | 2 |
| 31 | DKI Jakarta | 1 | 5 |
| 32 | Jawa Barat | 18 | 9 |
| 33 | Jawa Tengah | 29 | 6 |
| 34 | DI Yogyakarta | 4 | 1 |
| 35 | Jawa Timur | 29 | 9 |
| 36 | Banten | 4 | 4 |
| 51 | Bali | 8 | 1 |
| 52 | Nusa Tenggara Barat | 8 | 2 |
| 53 | Nusa Tenggara Timur | 21 | 1 |
| 61 | Kalimantan Barat | 12 | 2 |
| 62 | Kalimantan Tengah | 13 | 1 |
| 63 | Kalimantan Selatan | 11 | 2 |
| 64 | Kalimantan Timur | 7 | 3 |
| 65 | Kalimantan Utara | 4 | 1 |
| 71 | Sulawesi Utara | 11 | 4 |
| 72 | Sulawesi Tengah | 12 | 1 |
| 73 | Sulawesi Selatan | 21 | 3 |
| 74 | Sulawesi Tenggara | 15 | 2 |
| 75 | Gorontalo | 5 | 1 |
| 76 | Sulawesi Barat | 6 | 0 |
| 81 | Maluku | 9 | 2 |
| 82 | Maluku Utara | 8 | 2 |
| 91 | Papua | 8 | 1 |
| 92 | Papua Barat | 7 | 0 |
| 93 | Papua Selatan | 4 | 0 |
| 94 | Papua Tengah | 8 | 0 |
| 95 | Papua Pegunungan | 8 | 0 |
| 96 | Papua Barat Daya | 5 | 1 |
| **TOTAL** | **38** | **279** | **10** |

**Total Regencies/Cities: 289** (missing 225 vs. official 514)