# Data Ingestion Guide

## Overview

This document describes the reproducible, validated data import pipeline for the Indonesian Disaster Assistance Transparency Platform. All imports are idempotent, preserve source provenance, and enforce data integrity rules per AGENTS.md.

## Import Pipeline Architecture

### Import Order (Dependency Order)

1. **Sources** — Must exist before any other records can reference them
2. **Regions** — Administrative boundaries (independent)
3. **DisasterEvents** — Disaster occurrences (independent)
4. **EventImpacts** — Links events to regions (requires Events + Regions + Sources)
5. **Stats** — Displayable statistics (requires Sources, optionally Events + Regions)

### Core Principles

- **Idempotent**: Re-running with same data produces same result
- **Validated**: Every row validated before database insertion
- **Traceable**: Every record links to a `Source` with `importBatchId`
- **Non-destructive**: Failed rows reported, not silently discarded
- **Atomic per batch**: Uses transactions where supported

## Source Data Format

### CSV Structure

All imports accept CSV files with headers. Column names match the input interfaces.

### Sources CSV (`sources.csv`)

```csv
title,publisher,url,category,publicationDate,accessDate,description,importBatchId
"BNPB Situasi Darurat","BNPB","https://bnpb.go.id/situasi","OFFICIAL","2026-08-15T10:00:00Z","2026-11-26T00:00:00Z","Official emergency situation report","import-2026-001"
```

**Required:** `title`, `category`
**Optional:** `publisher`, `url`, `publicationDate`, `accessDate`, `description`, `importBatchId`

**Validation:**
- `category` must be: `OFFICIAL`, `MEDIA`, `RESEARCH`, `EDITORIAL`
- `url` must be valid URL if provided
- Dates must be ISO 8601 format

### Regions CSV (`regions.csv`)

```csv
code,name,level,parentCode,geometry,centroid
"11","Aceh","PROVINCE",,,
"1101","Kabupaten Simeulue","REGENCY_CITY","11",,
```

**Required:** `code`, `name`, `level`
**Optional:** `parentCode`, `geometry` (GeoJSON), `centroid` (GeoJSON)

**Validation:**
- `level`: `PROVINCE`, `REGENCY_CITY`, `DISTRICT`, `VILLAGE`
- Province codes: 2 digits (validated against official BPS list of 38)
- Regency codes: 4 digits (first 2 = province code)
- `parentCode` required for non-province levels
- Geometry validated as valid GeoJSON

### Disaster Events CSV (`events.csv`)

```csv
name,type,nature,occurredAt,endedAt,description,location,metadata
"Gempa Flores 2026","EARTHQUAKE","GEOLOGICAL","2026-08-15T12:30:00Z","2026-08-15T13:00:00Z","Major earthquake in Flores","{""type"":""Point"",""coordinates"":[122.5,-8.5]}","{""magnitude"":6.2}"
```

**Required:** `name`, `type`, `nature`, `occurredAt`
**Optional:** `endedAt`, `description`, `location` (GeoJSON), `metadata` (JSON)

**Validation:**
- `type`: One of 10 disaster types
- `nature`: `GEOLOGICAL` or `ENVIRONMENTAL`
- Dates: ISO 8601
- Duplicate detection by `(name, type, occurredAt)`

### Event Impacts CSV (`impacts.csv`)

```csv
eventName,eventType,eventOccurredAt,regionCode,status,affectedCount,displacedCount,injuredCount,fatalitiesCount,damagedHouses,notes,sourceTitle,sourcePublisher
"Gempa Flores 2026","EARTHQUAKE","2026-08-15T12:30:00Z","5306","DILAPORKAN_BELUM_MENERIMA_BANTUAN",5000,2000,150,12,800,"Remote villages isolated","BNPB Situasi Darurat","BNPB"
```

**Required:** `eventName`, `eventType`, `eventOccurredAt`, `regionCode`
**Optional:** `status`, counts, `notes`, `sourceTitle`, `sourcePublisher`

**Validation:**
- `status`: `DILAPORKAN_BELUM_MENERIMA_BANTUAN`, `AKSES_TERISOLIR`, `BELUM_TERVERIFIKASI`
- Counts: Non-negative integers
- References resolved: Event → `DisasterEvent.id`, Region → `Region.id`, Source → `Source.id`
- Unique constraint: `(eventId, regionId)`

### Statistics CSV (`stats.csv`)

```csv
sourceTitle,sourcePublisher,eventName,eventType,eventOccurredAt,regionCode,key,label,value,unit,asOfDate,metadata
"BNPB Situasi Darurat","BNPB","Gempa Flores 2026","EARTHQUAKE","2026-08-15T12:30:00Z","5306","affected_population","Jumlah Penduduk Terdampak","5000","jiwa","2026-08-20T00:00:00Z","{""sourcePage"":5}"
```

**Required:** `sourceTitle`, `key`, `label`, `value`, `asOfDate`
**Optional:** `sourcePublisher`, `eventName`, `eventType`, `eventOccurredAt`, `regionCode`, `unit`, `metadata`

**Validation:**
- `asOfDate`: ISO 8601 (observation date, distinct from publication date)
- References resolved: Source → `Source.id`, Event → `DisasterEvent.id`, Region → `Region.id`
- Duplicate detection by `(sourceId, key, regionId?, eventId?)`

## Running Imports

### Prerequisites

```bash
# Ensure database is running and migrated
npm run db:migrate
npm run db:seed  # seeds Sources
```

### Individual Imports

```bash
# Import sources
npm run import:sources -- --sources=data/sources.csv --import-batch-id=batch-001

# Import regions
npm run import:regions -- --regions=data/regions.csv

# Import events
npm run import:events -- --events=data/events.csv

# Import impacts (requires events, regions, sources)
npm run import:impacts -- --impacts=data/impacts.csv

# Import stats (requires sources, optionally events/regions)
npm run import:stats -- --stats=data/stats.csv
```

### Full Pipeline

```bash
npm run import:all -- \
  --sources=data/sources.csv \
  --regions=data/regions.csv \
  --events=data/events.csv \
  --impacts=data/impacts.csv \
  --stats=data/stats.csv \
  --import-batch-id=import-2026-11-26
```

### Dry Run

```bash
npm run import:all -- --dry-run --sources=data/sources.csv ...
```

Shows what would be created/updated without writing to database.

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Validate only, no database writes |
| `--batch-size=N` | Batch size for processing (default: 100) |
| `--import-batch-id=ID` | Tag all imported sources with this batch ID |

## GeoJSON Import for Regions

Regions can also be imported from GeoJSON files:

```bash
# Import provinces from GeoJSON
npx tsx scripts/import-region.ts --geojson=data/provinces.geojson --level=PROVINCE

# Import regencies from GeoJSON
npx tsx scripts/import-region.ts --geojson=data/regencies/53.geojson --level=REGENCY_CITY
```

**GeoJSON Requirements:**
- FeatureCollection with features containing:
  - `properties.code` (BPS code)
  - `properties.name`
  - `properties.level` (PROVINCE/REGENCY_CITY)
  - `properties.parentCode` (for regencies)
  - `geometry` (Polygon/MultiPolygon)
  - `properties.centroid` (optional, Point)

## Validation & Error Handling

### Row-Level Validation

Every row is validated before insertion:
- Schema validation (Zod)
- Business rule validation (code formats, hierarchy, references)
- Cross-reference resolution (event names → IDs, region codes → IDs)

### Error Reporting

Failed rows are collected with:
- Row number (1-indexed from CSV)
- Original input data
- Error message(s)

Summary printed at end:
```
Import Summary:
  Created: 42
  Updated: 3
  Skipped: 0
  Errors:  2

Errors:
  Row 15: Invalid province code: 99 (not in official BPS list)
  Row 27: Event not found: "Unknown Event" (EARTHQUAKE, 2026-01-01T00:00:00.000Z)
```

### No Silent Failures

- Invalid rows never inserted
- All errors reported explicitly
- Import continues past errors (best effort)

## Data Integrity Rules (AGENTS.md Compliance)

### Never Fabricate Statistics
- All stats require a `Source` with `asOfDate`
- No default/zero values for missing data
- Missing data = no stat record, not zero

### Qualified Statuses Only
EventImpact.status must be one of:
- `DILAPORKAN_BELUM_MENERIMA_BANTUAN` (Reported not receiving assistance)
- `AKSES_TERISOLIR` (Access isolated)
- `BELUM_TERVERIFIKASI` (Not yet verified)

### Source Attribution
- Every Stat links to Source
- Source.category distinguishes authority level
- publicationDate vs accessDate preserved

### Uncertainty Preservation
- Counts are nullable (Int?)
- No stat created without verified source
- Conflicting sources = separate Stat records with different sourceId

### Administrative Codes
- Regions joined by BPS `code` only, never by name
- 38 provinces, 514 regencies/cities validated
- Hierarchy enforced (regency parentCode → province)

## Geographic Data Requirements

### Official Sources Required
- Province/regency boundaries: BPS (Badan Pusat Statistik) or BIG (Badan Informasi Geospasial)
- Must verify 38 provinces, 514 regencies/cities against current official data
- Dataset version and access date recorded in Source

### GeoJSON Preparation
1. Download official boundaries (Shapefile/GeoJSON)
2. Simplify with mapshaper (Visvalingam-Whyatt) to ~50KB/province, ~20KB/regency
3. Preserve topology, ensure valid rings
4. Validate with `npm run test` (geo-validation tests)
5. Place in `public/geo/provinces.geojson` and `public/geo/regencies/<province-code>.geojson`

### No Village-Level Boundaries
Per AGENTS.md: "Do not assume village-level boundaries are authoritative."

## Testing Imports

### Unit Tests

```bash
npm run test
```

Tests cover:
- Administrative code validation (38 provinces, 514 regencies)
- Duplicate detection
- Parent-child region relationships
- Source attribution requirements
- Missing statistics handling
- Invalid date formats
- Import idempotency
- Invalid GeoJSON detection
- Missing/incomplete records

### Integration Tests (Require Database)

```bash
# With DATABASE_URL set
npm run test:integration
```

## Example Import Session

```bash
# 1. Prepare data files in data/
ls data/
# sources.csv  regions.csv  events.csv  impacts.csv  stats.csv

# 2. Run full import (dry run first)
npm run import:all -- --dry-run \
  --sources=data/sources.csv \
  --regions=data/regions.csv \
  --events=data/events.csv \
  --impacts=data/impacts.csv \
  --stats=data/stats.csv \
  --import-batch-id=import-2026-11-26

# 3. Review output, fix any errors in CSV files

# 4. Run for real
npm run import:all -- \
  --sources=data/sources.csv \
  --regions=data/regions.csv \
  --events=data/events.csv \
  --impacts=data/impacts.csv \
  --stats=data/stats.csv \
  --import-batch-id=import-2026-11-26

# 5. Verify in Prisma Studio
npm run db:studio
```

## Troubleshooting

### "Event not found" / "Region not found"
- Check spelling of `eventName`, `eventType`, `eventOccurredAt` matches Events CSV exactly
- Check `regionCode` exists in Regions (case-sensitive)
- Run Events and Regions imports first

### "Source not found"
- Ensure Sources import ran first
- Check `sourceTitle` and `sourcePublisher` match exactly

### Duplicate Key Errors
- Import is idempotent; re-running is safe
- Unique constraints prevent duplicates
- "Updated" count shows existing records refreshed

### Geometry Validation Failures
- Run `npm run test` to see GeoJSON validation errors
- Use mapshaper to fix: `mapshaper -i input.shp -simplify 10% -o output.geojson`

## Updating Data

To update existing records:
1. Modify CSV with corrected data
2. Re-run import (idempotent — updates existing by unique keys)
3. `importBatchId` on new Sources tracks the update batch

To add new data:
1. Append to CSV files
2. Re-run import

To correct a Stat:
1. Update the CSV row (same `sourceId`, `key`, `regionId`, `eventId`)
2. Re-run stats import — updates existing Stat

## Audit Trail

Every import creates/updates:
- `Source.importBatchId` — tracks which import batch created the source
- `createdAt` / `updatedAt` on all models — timestamps for audit
- Failed rows logged to console — manual review required

No destructive operations (no deletes, no overwrites without trace).