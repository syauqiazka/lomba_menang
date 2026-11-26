-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('OFFICIAL', 'MEDIA', 'RESEARCH', 'EDITORIAL');

-- CreateEnum
CREATE TYPE "DisasterType" AS ENUM ('EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'COASTAL_EROSION', 'TIDAL_FLOOD', 'EXTREME_WEATHER', 'LAND_SUBSIDENCE', 'VOLCANIC_ERUPTION', 'TSUNAMI', 'OTHER');

-- CreateEnum
CREATE TYPE "EventNature" AS ENUM ('GEOLOGICAL', 'ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "PublicStatus" AS ENUM ('DILAPORKAN_BELUM_MENERIMA_BANTUAN', 'AKSES_TERISOLIR', 'BELUM_TERVERIFIKASI');

-- CreateEnum
CREATE TYPE "RegionLevel" AS ENUM ('PROVINCE', 'REGENCY_CITY', 'DISTRICT', 'VILLAGE');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "url" TEXT,
    "category" "SourceCategory" NOT NULL,
    "publicationDate" TIMESTAMP(3),
    "accessDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "RegionLevel" NOT NULL,
    "parentCode" TEXT,
    "geometry" JSONB,
    "centroid" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisasterEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DisasterType" NOT NULL,
    "nature" "EventNature" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "description" TEXT,
    "location" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisasterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventImpact" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "status" "PublicStatus",
    "affectedCount" INTEGER,
    "displacedCount" INTEGER,
    "injuredCount" INTEGER,
    "fatalitiesCount" INTEGER,
    "damagedHouses" INTEGER,
    "notes" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "eventId" TEXT,
    "regionId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_category_idx" ON "Source"("category");

-- CreateIndex
CREATE INDEX "Source_importBatchId_idx" ON "Source"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE INDEX "Region_code_idx" ON "Region"("code");

-- CreateIndex
CREATE INDEX "Region_parentCode_idx" ON "Region"("parentCode");

-- CreateIndex
CREATE INDEX "Region_level_idx" ON "Region"("level");

-- CreateIndex
CREATE INDEX "DisasterEvent_type_idx" ON "DisasterEvent"("type");

-- CreateIndex
CREATE INDEX "DisasterEvent_nature_idx" ON "DisasterEvent"("nature");

-- CreateIndex
CREATE INDEX "DisasterEvent_occurredAt_idx" ON "DisasterEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "EventImpact_eventId_idx" ON "EventImpact"("eventId");

-- CreateIndex
CREATE INDEX "EventImpact_regionId_idx" ON "EventImpact"("regionId");

-- CreateIndex
CREATE INDEX "EventImpact_status_idx" ON "EventImpact"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventImpact_eventId_regionId_key" ON "EventImpact"("eventId", "regionId");

-- CreateIndex
CREATE INDEX "Stat_sourceId_idx" ON "Stat"("sourceId");

-- CreateIndex
CREATE INDEX "Stat_eventId_idx" ON "Stat"("eventId");

-- CreateIndex
CREATE INDEX "Stat_regionId_idx" ON "Stat"("regionId");

-- CreateIndex
CREATE INDEX "Stat_key_idx" ON "Stat"("key");

-- CreateIndex
CREATE INDEX "Stat_asOfDate_idx" ON "Stat"("asOfDate");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "Region"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventImpact" ADD CONSTRAINT "EventImpact_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DisasterEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventImpact" ADD CONSTRAINT "EventImpact_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventImpact" ADD CONSTRAINT "EventImpact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DisasterEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;