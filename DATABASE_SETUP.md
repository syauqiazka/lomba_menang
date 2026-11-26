# Database Setup Guide

## Overview

This project uses **Neon PostgreSQL** as the database backend with **Prisma ORM** for type-safe database access. The schema models disaster events, affected regions, assistance tracking, and source attribution.

## Prerequisites

- Node.js 20+
- Neon PostgreSQL account (or local PostgreSQL 15+)
- npm/pnpm/yarn

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure DATABASE_URL

Edit `.env` with your Neon connection string:

```env
# Primary connection (pooled, for serverless/runtime)
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/bismillah_menang?sslmode=require&channel_binding=require"

# Direct connection (for migrations, bypasses pooler)
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/bismillah_menang?sslmode=require"
```

**Getting Neon Credentials:**
1. Create a Neon project at https://console.neon.tech
2. Copy the connection string from the dashboard
3. For `DATABASE_URL`: use the pooled connection (includes `-pooler` in host)
4. For `DIRECT_URL`: use the direct connection (no `-pooler` suffix)

### 3. Local Development Alternative

For local PostgreSQL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/bismillah_menang?schema=public"
```

## Database Initialization

### Generate Prisma Client

```bash
npm run db:generate
```

### Run Migrations

```bash
# Production/staging (uses DIRECT_URL)
npm run db:migrate

# Development (creates new migration files)
npm run db:migrate:dev
```

### Seed Initial Data

```bash
npm run db:seed
```

This seeds the **Source registry** with official Indonesian disaster agencies (BNPB, BMKG, BPS, BIG, PMI, BAZNAS) and major media/research sources.

## Verification

### Validate Schema

```bash
npm run db:validate
```

### Open Prisma Studio

```bash
npm run db:studio
```

## Schema Overview

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Source` | Credible origin for claims/statistics | `title`, `publisher`, `url`, `category` (OFFICIAL/MEDIA/RESEARCH/EDITORIAL), `publicationDate`, `accessDate` |
| `Region` | Indonesian administrative regions | `code` (BPS code, unique), `name`, `level` (PROVINCE/REGENCY_CITY/DISTRICT/VILLAGE), `parentCode`, `geometry` (GeoJSON) |
| `DisasterEvent` | Disaster occurrences | `name`, `type` (EARTHQUAKE/FLOOD/etc), `nature` (GEOLOGICAL/ENVIRONMENTAL), `occurredAt`, `endedAt` |
| `EventImpact` | Event-region impact link | `eventId`, `regionId`, `status` (DILAPORKAN_BELUM_MENERIMA_BANTUAN/AKSES_TERISOLIR/BELUM_TERVERIFIKASI), counts (affected, displaced, injured, fatalities, damagedHouses), `sourceId` |
| `Stat` | Displayable statistics with provenance | `sourceId`, `eventId`, `regionId`, `key`, `label`, `value`, `unit`, `asOfDate` |

### Enums

- `SourceCategory`: OFFICIAL, MEDIA, RESEARCH, EDITORIAL
- `DisasterType`: EARTHQUAKE, FLOOD, LANDSLIDE, COASTAL_EROSION, TIDAL_FLOOD, EXTREME_WEATHER, LAND_SUBSIDENCE, VOLCANIC_ERUPTION, TSUNAMI, OTHER
- `EventNature`: GEOLOGICAL, ENVIRONMENTAL
- `PublicStatus`: DILAPORKAN_BELUM_MENERIMA_BANTUAN, AKSES_TERISOLIR, BELUM_TERVERIFIKASI
- `RegionLevel`: PROVINCE, REGENCY_CITY, DISTRICT, VILLAGE

### Key Constraints

- `Region.code` is unique (BPS administrative code)
- `EventImpact` has unique constraint on `(eventId, regionId)`
- Foreign keys with cascade/delete rules configured
- Indexes on all foreign keys and frequently queried fields

## Neon-Specific Configuration

### Connection Pooling

Neon uses PgBouncer for connection pooling. The `DATABASE_URL` should use the pooled endpoint (`-pooler` suffix). The `DIRECT_URL` bypasses the pooler for migrations.

### SSL

Always use `sslmode=require` for Neon connections.

### Channel Binding

Include `channel_binding=require` for additional security.

## Troubleshooting

### Migration Fails

1. Ensure `DIRECT_URL` is set correctly (non-pooled connection)
2. Check database user has CREATE privileges
3. Verify no conflicting schema changes

### Connection Errors

1. Verify `DATABASE_URL` format
2. Check Neon project is not paused (free tier pauses after inactivity)
3. Confirm IP allowlist (Neon allows all by default)

### Prisma Client Issues

```bash
# Regenerate client
rm -rf node_modules/.prisma
npm run db:generate
```

## Production Deployment

1. Set `DATABASE_URL` and `DIRECT_URL` in deployment platform (Vercel, Railway, etc.)
2. Run `npm run db:migrate` as a deployment step
3. Do NOT run migrations on every request
4. Use least-privilege database credentials

## Security Notes

- Never commit `.env` files
- Use environment variables exclusively for credentials
- Rotate credentials periodically
- Monitor database access logs
- Use read-only replicas for analytics queries where possible