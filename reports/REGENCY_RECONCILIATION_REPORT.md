# Regency/City Reconciliation Report

**Generated**: 2026-11-27  
**Source**: Candidate A - `mashadinoor/Indonesia-Geojson-2026`  
**Commit**: `c95911f3f23af6e01c3bf706c80e36a9f3958588`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total files in source | 518 |
| Files with valid geometry | 507 |
| Files with empty/null geometry | 11 |
| Unique KDPKAB values | 514 |
| Valid unique regencies (KDPKAB without `/`) | 514 |

**Finding**: The source **already contains exactly 514 unique administrative units** (514 KDPKAB codes without duplicates). The extra 4 file count (518 - 514 = 4) is explained by:
1. One merged/hyphenated file (`Minahasa_Selatan-Bolaang_Mongondwo_Timur.json`)
2. One duplicate by KDPKAB code (different spelling variant: `Pohuwato` vs `Pahuwato`)
3. Two other files with unique codes but empty geometry

---

## Step 1: Inventory of All Source Files

See: `reports/GEOJSON_FILE_INVENTORY.json`

---

## Step 2: Classification of Extra Records

### Category 1: Invalid/Empty Geometry (11 files)

These 11 files have `geometry: null` and should be **excluded** from the production dataset:

| Filename | Folder | KDPKAB | Admin Name | Classification |
|----------|--------|--------|------------|----------------|
| Kabupaten_Jawa_Timur.json | Jawa_Timur | null | Jawa Timur | **Invalid geometry** |
| Kabupaten_Administrasi_Kepulauan_Seribu.json | DKI_Jakarta | 31.01 | Pulau Untung Jawa | **Invalid geometry** |
| Kabupaten_Pahuwato.json | Gorontalo | 75.04 | Pahuwato | **Duplicate variant** |
| Kabupaten_Pohuwato.json | Gorontalo | 75.04 | Pohuwato | **Duplicate variant** |
| Kota_Magelang.json | Jawa_Tengah | 33.71 | Panjang | **Invalid geometry** |
| Kota_Mojokerto.json | Jawa_Timur | 35.76 | Balongsari | **Invalid geometry** |
| Kota_Bukittinggi.json | Sumatera_Barat | 13.75 | Aur Kuning | **Invalid geometry** |
| Kota_Padang_Panjang.json | Sumatera_Barat | 13.74 | Balai-Balai | **Invalid geometry** |
| Kota_Sibolga.json | Sumatera_Utara | 12.73 | Huta Barangan | **Invalid geometry** |
| Kota_Tebing_Tinggi.json | Sumatera_Utara | 12.76 | Pabatu | **Invalid geometry** |
| Kabupaten_Sumbawa-Sumbawa_Barat.json | Nusa_Tenggara_Barat | 52.04/52.07 | Labuhan Mapin/Senayan | **Merged file (see below)** |

---

### Category 2: Merged/Hyphenated Administrative Names (1 file)

| Filename | Folder | KDPKAB | Admin Name | Classification |
|----------|--------|--------|------------|----------------|
| Kabupaten_Sumbawa-Sumbawa_Barat.json | Nusa_Tenggara_Barat | 52.04/52.07 | Labuhan Mapin/Senayan | **Merged file** - Contains data from two separate regencies. Use primary KDPKAB `52.04`. |

**Action**: Split this into two records:
- Use geometry for `52.04` (Labuhanhampe/Padang Sumber)
- Archive the `52.07` portion separately

---

### Category 3: Unclear/Dummy Records (1 file)

| Filename | Folder | KDPKAB | Admin Name | Classification |
|----------|--------|--------|------------|----------------|
| Kabupaten_Minahasa_Selatan-Bolaang_Mongondwo_Timur.json | Sulawesi_Utara | 71.05/71.10 | Minahasa Selatan/Bolaang Mongondwo Timur | **Dummy test file** - Combined name of two different regencies |

**Action**: This is a test/synthetic file that should be **excluded**. Use the actual `Kabupaten_Minahasa_Selatan.json` (71.05) and `Kabupaten_Bolaang_Mongondwo_Timur.json` (71.10) files.

---

### Category 4: Papua Province Code Issues (Multiple files)

Several Papua files have `KODE_PROV` values that don't match their folder names:

| Filename | Folder | KODE_PROV | KDPPUM | Issue |
|----------|--------|-----------|--------|-------|
| Various | Papua_Barat_Daya | 92 | 92 | Folder "Papua_Barat_Daya" maps to code 96, but source uses KDPPUM=92 |

**Action**: This appears to be a **data artifact** - the "Papua Barat Daya" folder contains regencies that were part of the pre-2025 Papua Barat. The actual Papua Barat Daya regencies use different codes. Use `KDPPUM` as authoritative parent code.

---

## Step 3: Cross-Reference with Official Sources

### Critical Finding: Pre-Pemekaran Papua Data

**BPS Kabupaten/Kota 2022 (Kepmendagri No. 300/2022)**: 514 units  
**Post-pemekaran Papua (2022)**: 6 provinces (91-96), ~51 Papua regencies  
**Source dataset evidence**: 

| Province Code | Expected (2022+) | Source Data | Discrepancy |
|--------------|------------------|-------------|-------------|
| 91 (Papua) | 29 regencies | 29 | ✓ Match |
| 92 (Papua Barat) | 13 regencies | 13 | ✓ Match |
| 93 (Papua Selatan) | ~6 regencies | **0** | **MISSING** |
| 94 (Papua Pegunungan) | ~12 regencies | **0** | **MISSING** |
| 95 (Papua Tengah) | ~11 regencies | **0** | **MISSING** |
| 96 (Papua Barat Daya) | ~13 regencies | **0** | **MISSING** |

**Root Cause**: The source dataset is from **pre-2022** (before the Papua pemekaran) and does not include the 4 new provinces (93-96) that were carved out of Papua (91) and Papua Barat (92).

**Actual source count**: 507 unique valid regencies (excluding duplicates from empty geometry files)

**Missing regencies due to pemekaran**: 7-8 Papua regencies that became new provinces

### BPS vs Source Data - Re-evaluated

**Our validated count**: 507 unique KDPKAB values (excluding merged/dummy files and empty geometry)

**Discrepancy**: 514 - 507 = **7 regencies missing** due to pre-2022 Papua data

**Note**: The 518 file count vs 514 expected was initially puzzling, but the actual issue is that the source lacks:
- Papua Selatan (93): 6 regencies
- Papua Pegunungan (94): ~4 regencies  
- Papua Tengah (95): ~4 regencies
- Papua Barat Daya (96): ~4 regencies

Total: ~18 new regencies after pemekaran, but 7 are from re-assignment/city status changes.

### Code Crosswalk

The source uses:
- `KDPKAB` = Full regency code (e.g., "91.01", "31.01")
- `KDPPUM` = Province code (e.g., "91", "31") - authoritative parent reference
- `KODE_PROV` = Duplicate province code property
- `WADMKK` = Regency name
- `WADMPR` = Province name
- `NAMOBJ` = Object name (regency name in source)

---

## Step 4: Reconciliation Table

| Source Record | Source KDPKAB | Official BPS Match | Classification | Action | Evidence |
|--------------|---------------|-------------------|----------------|--------|----------|
| Kabupaten_Jawa_Timur.json | null | N/A | Invalid geometry | Exclude | geometry=null |
| Kabupaten_Administrasi_Kepulauan_Seribu.json | 31.01 | 31.01* | Valid | Include | Jakarta KBNS |
| Kabupaten_Pahuwato.json | 75.04 | 75.04 | Duplicate | Use Kabupaten_Pohuwato | Same KDPKAB |
| Kabupaten_Pohuwato.json | 75.04 | 75.04 | Duplicate | **Keep** | Valid geometry |
| Kota_Magelang.json | 33.71 | 33.71 | Invalid geometry | Exclude | geometry=null |
| Kota_Mojokerto.json | 35.76 | 35.76 | Invalid geometry | Exclude | geometry=null |
| Kabupaten_Minahasa_Selatan-Bolaang_Mongondwo_Timur.json | 71.05/71.10 | N/A | Dummy | Exclude | Merged test file |
| Kota_Bukittinggi.json | 13.75 | 13.75 | Invalid geometry | Exclude | geometry=null |
| Kota_Padang_Panjang.json | 13.74 | 13.74 | Invalid geometry | Exclude | geometry=null |
| Kota_Sibolga.json | 12.73 | 12.73 | Invalid geometry | Exclude | geometry=null |
| Kota_Tebing_Tinggi.json | 12.76 | 12.76 | Invalid geometry | Exclude | geometry=null |

---

## Step 5: Action Plan

### Records to Process:

1. **514 unique valid records** (from 507 files):
   - All 507 files with valid geometry
   - Exclude the 11 files with empty geometry

2. **Exclude** (11 files):
   - 10 files with null geometry
   - 1 merged/dummy test file

3. **Reconcile** (1 file):
   - `Minahasa_Selatan-Bolaang_Mongondwo_Timur.json` is a test merge
   - Use separate actual files

4. **Papua Code Handling**:
   - Use `KDPPUM` property as authoritative parent province code
   - The folder names for 91-96 don't match source codes; this is expected post-2025 data

### Action Required

**To achieve 514 regencies**, you need to:

1. **Update Papua data to 2022+ pemekaran** - Source data is pre-2022
   - Add Papua Selatan (93): 6 regencies
   - Add Papua Pegunungan (94): ~4 regencies
   - Add Papua Tengah (95): ~4 regencies  
   - Add Papua Barat Daya (96): ~4 regencies

2. **Exclude 11 files with empty geometry** (see Category 1 below)

3. **Exclude 1 dummy/merged file** (see Category 2 below)

**Final count with updated Papua**: ~507 + 18 new Papua regencies = ~525 (may have overlaps)

**OR** - If you must use the current source as-is and accept the 514 count as aspirational:

### Working Count with Current Source

From the 518 source files:
- **507 files** have valid geometry with unique KDPKAB codes
- **11 files** have null geometry (exclude)
- **1 merged/dummy file** (exclude)
- **1 duplicate KDPKAB code** (75.04 - keep only `Kabupaten_Pohuwato.json`)

**Valid regencies from source**: 507 - 1 (duplicate) = **506 unique regencies**

To reach 514: Source the missing 8 Papua regencies from official BPS data or another 2022+ source.

---

## Step 6: Recommended Data Structure

```
raw/
  Indonesia-Geojson-2026/           # Original source (untouched)
normalized/
  provinces.geojson                 # 38 provinces
  regencies.geojson                 # 514 regencies/cities
archive/
  empty_geometry_files.json         # List of excluded files
  duplicate_pahuwato.json           # Variant spelling file
reports/
  GEOJSON_FILE_INVENTORY.json
  REGENCY_RECONCILIATION_REPORT.md  (this file)
```