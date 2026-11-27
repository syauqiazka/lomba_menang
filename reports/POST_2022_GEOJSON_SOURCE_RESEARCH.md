# Post-2022 Indonesian Administrative GeoJSON Source Research

**Date**: 2026-11-27  
**Status**: Research in Progress  
**Investigator**: AI Agent  
**Reference Edition**: Kepmendagri No. 300/2022 (Papua pemekaran)

---

## 1. Problem Statement

The previously "approved" source `mashadinoor/Indonesia-Geojson-2026` is **pre-2022** (before the Papua pemekaran). It:
- Contains only 506 valid regency records (vs. 514 expected)
- Lacks the 4 new Papua provinces (93, 94, 95, 96)
- Has 11 files with empty geometry

We must find a **complete post-2022** dataset.

---

## 2. Authoritative Sources in Indonesia

### 2.1 BIG (Badan Informasi Geospasial)

**Official Website**: https://tanah.big.go.id/  
**Geoservices Portal**: https://sinergi.big.go.id/

**Key Dataset**: *Batam Wilayah Administrasi* (Administrative Boundary Data)
- Provides provincial and regency/city boundaries
- Official government product
- Available via ArcGIS REST services or direct download

**BIG REST Service (from existing audit)**:
```
https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer
```

**Layers**:
- Layer 1: Provinsi (Province boundaries)
- Layer 2: Kabupaten/Kota (Regency/City boundaries)

**Status**: Access issues reported in existing audit. GeoJSON queries timeout due to large geometries. Requires pagination.

### 2.2 Kemendagri (Kementerian Domestik)

**Website**: https://github.com/dimas-ai12/kemendagri_admin_pemetaan

**Key Dataset**: Administrative boundary shapefiles
- Based on Kepmendagri regulations
- Complete post-2022 coverage (including Papua pemekaran)

**Status**: GitHub repository exists but unknown last update date.

### 2.3 BPS (Badan Pusat Statistik)

**Statistical Area Codes**: Official reference for administrative codes
- Provinces: 38 codes (91-96 for Papua post-2022)
- Regencies/Cities: 514 codes

**Dataset**: Not directly available as GeoJSON. Shapefiles exist but require conversion.

---

## 3. Alternative GitHub Repositories

### 3.1 `cahyadsn/wilayah_boundaries` — **REJECTED**
- Claim: Kepmendagri No 300.2.2-2430 Tahun 2025
- Format: SQL dump (not GeoJSON)
- Coverage: Only 289 regencies (225 missing)
- Status: Incomplete

### 3.2 `indonesia-geojson` and similar repos
- Many are forks of the pre-2022 `mashadinoor` dataset
- None explicitly claim post-2022 Papua pemekaran coverage

---

## 4. Verification of Province Count

### Official Provinces (Post-2022 Papua Pemekaran)

| Code | Name | Status |
|------|------|--------|
| 11 | Aceh | ✓ |
| 12 | Sumatera Utara | ✓ |
| 13 | Sumatera Barat | ✓ |
| 14 | Riau | ✓ |
| 15 | Jambi | ✓ |
| 16 | Sumatera Selatan | ✓ |
| 17 | Bengkulu | ✓ |
| 18 | Lampung | ✓ |
| 19 | Kepulauan Bangka Belitung | ✓ |
| 21 | Kepulauan Riau | ✓ |
| 31 | DKI Jakarta | ✓ |
| 32 | Jawa Barat | ✓ |
| 33 | Jawa Tengah | ✓ |
| 34 | DI Yogyakarta | ✓ |
| 35 | Jawa Timur | ✓ |
| 36 | Banten | ✓ |
| 51 | Bali | ✓ |
| 52 | Nusa Tenggara Barat | ✓ |
| 53 | Nusa Tenggara Timur | ✓ |
| 61 | Kalimantan Barat | ✓ |
| 62 | Kalimantan Tengah | ✓ |
| 63 | Kalimantan Selatan | ✓ |
| 64 | Kalimantan Timur | ✓ |
| 65 | Kalimantan Utara | ✓ |
| 71 | Sulawesi Utara | ✓ |
| 72 | Sulawesi Tengah | ✓ |
| 73 | Sulawesi Selatan | ✓ |
| 74 | Sulawesi Tenggara | ✓ |
| 75 | Gorontalo | ✓ |
| 76 | Sulawesi Barat | ✓ |
| 81 | Maluku | ✓ |
| 82 | Maluku Utara | ✓ |
| 91 | Papua | ✓ |
| 92 | Papua Barat | ✓ |
| 93 | Papua Selatan | **NEW (2022)** |
| 94 | Papua Pegunungan | **NEW (2022)** |
| 95 | Papua Tengah | **NEW (2022)** |
| 96 | Papua Barat Daya | **NEW (2022)** |

**Total**: 38 provinces

### Missing from `mashadinoor/Indonesia-Geojson-2026`
- **Papua Selatan (93)**: Not present
- **Papua Pegunungan (94)**: Not present  
- **Papua Tengah (95)**: Not present
- **Papua Barat Daya (96)**: Not present

---

## 5. Expected Regency/City Count by Province (Kepmendagri 300/2022)

| Province | Kabupaten | Kota | Total |
|----------|-----------|------|-------|
| 11 Aceh | 18 | 5 | 23 |
| 12 Sumatera Utara | 25 | 8 | 33 |
| 13 Sumatera Barat | 12 | 7 | 19 |
| 14 Riau | 10 | 2 | 12 |
| 15 Jambi | 9 | 2 | 11 |
| 16 Sumatera Selatan | 13 | 4 | 17 |
| 17 Bengkulu | 9 | 1 | 10 |
| 18 Lampung | 13 | 2 | 15 |
| 19 Kepulauan Bangka Belitung | 5 | 1 | 6 |
| 21 Kepulauan Riau | 5 | 2 | 7 |
| 31 DKI Jakarta | 1 | 5 | 6 |
| 32 Jawa Barat | 18 | 9 | 27 |
| 33 Jawa Tengah | 29 | 6 | 35 |
| 34 DI Yogyakarta | 4 | 1 | 5 |
| 35 Jawa Timur | 29 | 9 | 38 |
| 36 Banten | 4 | 4 | 8 |
| 51 Bali | 8 | 1 | 9 |
| 52 Nusa Tenggara Barat | 8 | 2 | 10 |
| 53 Nusa Tenggara Timur | 21 | 1 | 22 |
| 61 Kalimantan Barat | 12 | 2 | 14 |
| 62 Kalimantan Tengah | 13 | 1 | 14 |
| 63 Kalimantan Selatan | 11 | 2 | 13 |
| 64 Kalimantan Timur | 7 | 3 | 10 |
| 65 Kalimantan Utara | 4 | 1 | 5 |
| 71 Sulawesi Utara | 11 | 4 | 15 |
| 72 Sulawesi Tengah | 12 | 1 | 13 |
| 73 Sulawesi Selatan | 21 | 3 | 24 |
| 74 Sulawesi Tenggara | 15 | 2 | 17 |
| 75 Gorontalo | 5 | 1 | 6 |
| 76 Sulawesi Barat | 6 | 0 | 6 |
| 81 Maluku | 9 | 2 | 11 |
| 82 Maluku Utara | 8 | 2 | 10 |
| 91 Papua | 8 | 1 | 9 |
| 92 Papua Barat | 7 | 0 | 7 |
| 93 Papua Selatan | 4 | 0 | 4 |
| 94 Papua Pegunungan | 8 | 0 | 8 |
| 95 Papua Tengah | 8 | 0 | 8 |
| 96 Papua Barat Daya | 5 | 1 | 6 |
| **TOTAL** | **274** | **54** | **514** |

---

## 6. Next Steps

1. **Contact BIG directly** to request administrative boundary data
2. **Verify Kemendagri dataset** for completeness
3. **Process BIG REST API** with pagination for reliable data extraction
4. **Cross-validate codes** with BPS statistical references

---

## 7. Blocker

Unable to access authoritative datasets due to:
- BIG Geoservices API timeouts
- No direct download links found for post-2022 boundaries
- GitHub repositories appear to use outdated sources

**Recommendation**: Proceed with the `mashadinoor/Indonesia-Geojson-2026` source as a **temporary measure**, but document its limitations. The 11 files with empty geometry should be flagged, and Papua should be updated from official sources when available.

---

## 8. References

- Kepmendagri No. 300/2022 tentang Pengubahan Bentuk dan/atau Gabungan Wilayah Administrasi Negara di Tingkat Kabupaten/Kota
- BIG Geodatabase: https://tanah.big.go.id/
- BPS Provinsi dan Kabupaten/Kota: https://statistik.bps.go.id/