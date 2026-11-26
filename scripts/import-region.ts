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

  const records: RegionInput[] = geojson.features
    .filter((f: { properties: { level: string; code: string; name: string; parentCode?: string; centroid?: unknown }; geometry: unknown }) => !options?.level || f.properties.level === options.level)
    .map((f: { properties: { level: string; code: string; name: string; parentCode?: string; centroid?: unknown }; geometry: unknown }) => ({
      code: f.properties.code,
      name: f.properties.name,
      level: f.properties.level,
      parentCode: f.properties.parentCode,
      geometry: f.geometry,
      centroid: f.properties.centroid,
    }));

  const prisma = createPrismaClient();
  const importer = new RegionImporter(prisma, options);
  const result = await importer.import(records);
  await prisma.$disconnect();
  importer.printSummary();
  return result;
}