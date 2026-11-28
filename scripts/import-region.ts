import { PrismaClient, RegionLevel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { BaseImporter, ImportResult, createPrismaClient } from "./import-base";
import { z, ZodError } from "zod";
import { validateProvinceCode } from "../src/lib/indonesian-admin-codes";

export interface RegionInput {
  code: string;
  name: string;
  level: string;
  parentCode?: string;
  geometry?: unknown;
  centroid?: unknown;
}

export const RegionInputSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  level: z.enum(["PROVINCE", "REGENCY_CITY", "DISTRICT", "VILLAGE"]),
  parentCode: z.string().optional(),
  geometry: z.unknown().optional(),
  centroid: z.unknown().optional(),
});

interface RegionNormalized {
  code: string;
  name: string;
  level: RegionLevel;
  parentCode: string | null;
  geometry: unknown | null;
  centroid: unknown | null;
}

interface GeoJSONFeatureInput {
  properties?: {
    level?: string;
    code?: string;
    name?: string;
    parentCode?: string;
    provinceCode?: string;
    centroid?: unknown;
  };
  geometry?: unknown;
}

export function normalizeRegionLevel(rawLevel: string): string {
  const upper = rawLevel.trim().toUpperCase();
  if (upper === "PROVINCE") return "PROVINCE";
  if (upper === "REGENCY" || upper === "REGENCY_CITY") return "REGENCY_CITY";
  if (upper === "DISTRICT") return "DISTRICT";
  if (upper === "VILLAGE") return "VILLAGE";
  return upper;
}

function collectLngLatBounds(
  coords: unknown,
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number; count: number }
): void {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === "number" && typeof coords[1] === "number") {
    const lng = coords[0];
    const lat = coords[1];
    if (lng < bounds.minLng) bounds.minLng = lng;
    if (lng > bounds.maxLng) bounds.maxLng = lng;
    if (lat < bounds.minLat) bounds.minLat = lat;
    if (lat > bounds.maxLat) bounds.maxLat = lat;
    bounds.count++;
    return;
  }
  for (const child of coords) {
    collectLngLatBounds(child, bounds);
  }
}

export function computeGeometryCentroid(
  geometry: unknown
): { type: "Point"; coordinates: [number, number] } | null {
  if (!geometry || typeof geometry !== "object") return null;
  const geom = geometry as { type?: string; coordinates?: unknown };
  if (!geom.coordinates) return null;

  const bounds = {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity,
    count: 0,
  };
  collectLngLatBounds(geom.coordinates, bounds);
  if (bounds.count === 0) return null;

  return {
    type: "Point",
    coordinates: [
      Number(((bounds.minLng + bounds.maxLng) / 2).toFixed(6)),
      Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6)),
    ],
  };
}

export class RegionImporter extends BaseImporter<RegionInput, RegionNormalized> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient, options: { batchSize?: number; dryRun?: boolean; onProgress?: (progress: { processed: number; total: number }) => void } = {}) {
    super(prisma, options);
    this.prisma = prisma;
  }

  validate(input: RegionInput, _rowNumber: number): { valid: boolean; errors: string[]; normalized?: RegionNormalized } {
    const parsed = RegionInputSchema.safeParse(input);
    if (!parsed.success) {
      const zodError = parsed.error as ZodError;
      return { valid: false, errors: zodError.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
    }

    const data = parsed.data;
    const errors: string[] = [];

    if (data.level === "PROVINCE") {
      if (!validateProvinceCode(data.code)) {
        errors.push(`Invalid province code: ${data.code} (not in official BPS list)`);
      }
    } else if (data.level === "REGENCY_CITY") {
      const parentCode = data.parentCode ?? data.code.substring(0, 2);
      if (!validateProvinceCode(parentCode)) {
        errors.push(`Regency ${data.code} references invalid province code: ${parentCode}`);
      }
      if (!data.parentCode) {
        errors.push(`Regency ${data.code} missing parentCode`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const normalized: RegionNormalized = {
      code: data.code,
      name: data.name,
      level: data.level as RegionLevel,
      parentCode: data.parentCode ?? null,
      geometry: data.geometry ?? null,
      centroid: data.centroid ?? null,
    };

    return { valid: true, errors: [], normalized };
  }

  async findExisting(normalized: RegionNormalized): Promise<{ id: string } | null> {
    const existing = await this.prisma.region.findUnique({
      where: { code: normalized.code },
      select: { id: true },
    });
    return existing;
  }

  async create(data: RegionNormalized): Promise<{ id: string }> {
    const createData: Prisma.RegionUncheckedCreateInput = {
      code: data.code,
      name: data.name,
      level: data.level,
      parentCode: data.parentCode ?? undefined,
      geometry: data.geometry ?? undefined,
      centroid: data.centroid ?? undefined,
    };
    return this.prisma.region.create({ data: createData, select: { id: true } });
  }

  async update(id: string, data: RegionNormalized): Promise<{ id: string }> {
    const updateData: Prisma.RegionUncheckedUpdateInput = {
      code: data.code,
      name: data.name,
      level: data.level,
      parentCode: data.parentCode ?? undefined,
      geometry: data.geometry ?? undefined,
      centroid: data.centroid ?? undefined,
    };
    return this.prisma.region.update({ where: { id }, data: updateData, select: { id: true } });
  }

  getIdentifier(input: RegionInput): string {
    return `${input.code} (${input.name})`;
  }
}

export async function importRegionsFromCSV(
  filePath: string,
  options?: { batchSize?: number; dryRun?: boolean }
): Promise<ImportResult> {
  const fs = await import("fs/promises");
  const { parse } = await import("csv-parse/sync");

  const content = await fs.readFile(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RegionInput[];

  const prisma = createPrismaClient();
  const importer = new RegionImporter(prisma, options);
  const result = await importer.import(records);
  await prisma.$disconnect();
  importer.printSummary();

  const provinceCount = records.filter((r) => r.level === "PROVINCE").length;
  const regencyCount = records.filter((r) => r.level === "REGENCY_CITY").length;
  console.log(`\nProvince count: ${provinceCount} (expected 38)`);
  console.log(`Regency/City count: ${regencyCount} (expected 514)`);

  return result;
}

function geojsonFeaturesToRecords(
  features: GeoJSONFeatureInput[],
  filterLevel?: "PROVINCE" | "REGENCY_CITY"
): RegionInput[] {
  const records: RegionInput[] = [];
  for (const f of features) {
    if (!f.geometry) continue;
    const props = f.properties ?? {};
    const normalizedLevel = normalizeRegionLevel(String(props.level ?? ""));
    if (filterLevel && normalizedLevel !== filterLevel) continue;

    const normCode = String(props.code ?? "").replace(/\./g, "").trim();
    const rawParent = props.parentCode ?? props.provinceCode;
    const parentCode =
      rawParent !== undefined && rawParent !== null && String(rawParent).trim() !== ""
        ? String(rawParent).trim()
        : normalizedLevel === "REGENCY_CITY" && normCode.length >= 2
          ? normCode.substring(0, 2)
          : undefined;

    records.push({
      code: normCode,
      name: String(props.name ?? "").trim(),
      level: normalizedLevel,
      parentCode,
      geometry: f.geometry,
      centroid: props.centroid ?? computeGeometryCentroid(f.geometry) ?? undefined,
    });
  }
  return records;
}

async function importRegionRecordsFast(
  prisma: PrismaClient,
  records: RegionInput[],
  options?: { batchSize?: number; dryRun?: boolean }
): Promise<ImportResult> {
  const importer = new RegionImporter(prisma, options);
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  const validRecords: RegionNormalized[] = [];

  for (let i = 0; i < records.length; i++) {
    const validation = importer.validate(records[i], i + 1);
    if (!validation.valid || !validation.normalized) {
      result.errors.push({
        row: i + 1,
        data: records[i],
        error: validation.errors.join("; "),
      });
      continue;
    }
    validRecords.push(validation.normalized);
  }

  const existingRows = await prisma.region.findMany({
    where: { code: { in: validRecords.map((r) => r.code) } },
    select: { code: true },
  });
  const existingSet = new Set(existingRows.map((r) => r.code));

  const batchSize = options?.batchSize ?? 25;
  for (let i = 0; i < validRecords.length; i += batchSize) {
    const batch = validRecords.slice(i, i + batchSize);
    if (!options?.dryRun) {
      await prisma.$transaction(
        batch.map((data) =>
          prisma.region.upsert({
            where: { code: data.code },
            create: {
              code: data.code,
              name: data.name,
              level: data.level,
              parentCode: data.parentCode ?? undefined,
              geometry: data.geometry ?? undefined,
              centroid: data.centroid ?? undefined,
            },
            update: {
              name: data.name,
              level: data.level,
              parentCode: data.parentCode ?? undefined,
              geometry: data.geometry ?? undefined,
              centroid: data.centroid ?? undefined,
            },
            select: { id: true },
          })
        )
      );
    }

    for (const item of batch) {
      if (existingSet.has(item.code)) {
        result.updated++;
      } else {
        result.created++;
      }
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`  Created: ${result.created}`);
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  Errors:  ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const err of result.errors) {
      console.log(`  Row ${err.row}: ${err.error}`);
    }
  }
  return result;
}

export async function importRegionsFromGeoJSON(
  filePath: string,
  options?: { batchSize?: number; dryRun?: boolean; level?: "PROVINCE" | "REGENCY_CITY" }
): Promise<ImportResult> {
  const fs = await import("fs/promises");

  const content = await fs.readFile(filePath, "utf-8");
  const geojson = JSON.parse(content);

  if (geojson.type !== "FeatureCollection") {
    throw new Error("Invalid GeoJSON: not a FeatureCollection");
  }

  const records = geojsonFeaturesToRecords(geojson.features as GeoJSONFeatureInput[], options?.level);
  const prisma = createPrismaClient();
  try {
    return await importRegionRecordsFast(prisma, records, options);
  } finally {
    await prisma.$disconnect();
  }
}

export async function importRegionsFromGeoJSONDir(
  dirPath: string,
  options?: { batchSize?: number; dryRun?: boolean; level?: "PROVINCE" | "REGENCY_CITY" }
): Promise<ImportResult> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const entries = (await fs.readdir(dirPath)).filter((f) => f.endsWith(".geojson")).sort();
  const allRecords: RegionInput[] = [];

  for (const file of entries) {
    const content = await fs.readFile(path.join(dirPath, file), "utf-8");
    const geojson = JSON.parse(content);
    if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
      throw new Error(`Invalid GeoJSON FeatureCollection in ${file}`);
    }
    allRecords.push(...geojsonFeaturesToRecords(geojson.features as GeoJSONFeatureInput[], options?.level));
  }

  const prisma = createPrismaClient();
  try {
    return await importRegionRecordsFast(prisma, allRecords, options);
  } finally {
    await prisma.$disconnect();
  }
}

function getArgValue(args: string[], prefix: string): string | undefined {
  const match = args.find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const geojsonFile = getArgValue(args, "--geojson=");
  const geojsonDir = getArgValue(args, "--geojson-dir=");
  const csvFile = getArgValue(args, "--regions=");
  const levelArg = getArgValue(args, "--level=") as "PROVINCE" | "REGENCY_CITY" | undefined;
  const batchStr = getArgValue(args, "--batch-size=");
  const batchSize = batchStr ? Number.parseInt(batchStr, 10) : 25;
  const dryRun = args.includes("--dry-run");

  let result: ImportResult;
  if (geojsonFile) {
    result = await importRegionsFromGeoJSON(geojsonFile, { batchSize, dryRun, level: levelArg });
  } else if (geojsonDir) {
    result = await importRegionsFromGeoJSONDir(geojsonDir, { batchSize, dryRun, level: levelArg });
  } else if (csvFile) {
    result = await importRegionsFromCSV(csvFile, { batchSize, dryRun });
  } else {
    console.error("Usage: tsx scripts/import-region.ts (--geojson=<file> | --geojson-dir=<dir> | --regions=<csv>) [--level=PROVINCE|REGENCY_CITY] [--batch-size=25] [--dry-run]");
    process.exit(1);
    return;
  }

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runCli().catch((err) => {
    console.error("Region import failed:", err);
    process.exit(1);
  });
}
