import { PrismaClient, DisasterType, EventNature } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { BaseImporter, ImportResult, createPrismaClient } from "./import-base";
import { z, ZodError } from "zod";

export interface DisasterEventInput {
  name: string;
  type: string;
  nature: string;
  occurredAt: string;
  endedAt?: string;
  description?: string;
  location?: unknown;
  metadata?: unknown;
}

export const DisasterEventInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum([
    "EARTHQUAKE", "FLOOD", "LANDSLIDE", "COASTAL_EROSION", "TIDAL_FLOOD",
    "EXTREME_WEATHER", "LAND_SUBSIDENCE", "VOLCANIC_ERUPTION", "TSUNAMI", "OTHER"
  ]),
  nature: z.enum(["GEOLOGICAL", "ENVIRONMENTAL"]),
  occurredAt: z.string().datetime(),
  endedAt: z.string().datetime().optional().or(z.literal("")),
  description: z.string().optional(),
  location: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

interface DisasterEventNormalized {
  name: string;
  type: DisasterType;
  nature: EventNature;
  occurredAt: Date;
  endedAt: Date | null;
  description: string | null;
  location: unknown | null;
  metadata: unknown | null;
}

export class DisasterEventImporter extends BaseImporter<DisasterEventInput, DisasterEventNormalized> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient, options: { batchSize?: number; dryRun?: boolean; onProgress?: (progress: { processed: number; total: number }) => void } = {}) {
    super(prisma, options);
    this.prisma = prisma;
  }

  validate(input: DisasterEventInput, _rowNumber: number): { valid: boolean; errors: string[]; normalized?: DisasterEventNormalized } {
    const parsed = DisasterEventInputSchema.safeParse(input);
    if (!parsed.success) {
      const zodError = parsed.error as ZodError;
      return { valid: false, errors: zodError.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
    }

    const data = parsed.data;
    const normalized: DisasterEventNormalized = {
      name: data.name,
      type: data.type as DisasterType,
      nature: data.nature as EventNature,
      occurredAt: new Date(data.occurredAt),
      endedAt: data.endedAt ? new Date(data.endedAt) : null,
      description: data.description ?? null,
      location: data.location ?? null,
      metadata: data.metadata ?? null,
    };

    return { valid: true, errors: [], normalized };
  }

  async findExisting(normalized: DisasterEventNormalized): Promise<{ id: string } | null> {
    const existing = await this.prisma.disasterEvent.findFirst({
      where: {
        name: normalized.name,
        type: normalized.type,
        occurredAt: normalized.occurredAt,
      },
      select: { id: true },
    });
    return existing;
  }

  async create(data: DisasterEventNormalized): Promise<{ id: string }> {
    const createData: Prisma.DisasterEventCreateInput = {
      name: data.name,
      type: data.type,
      nature: data.nature,
      occurredAt: data.occurredAt,
      endedAt: data.endedAt,
      description: data.description,
      location: data.location ?? undefined,
      metadata: data.metadata ?? undefined,
    };
    return this.prisma.disasterEvent.create({ data: createData, select: { id: true } });
  }

  async update(id: string, data: DisasterEventNormalized): Promise<{ id: string }> {
    const updateData: Prisma.DisasterEventUpdateInput = {
      name: data.name,
      type: data.type,
      nature: data.nature,
      occurredAt: data.occurredAt,
      endedAt: data.endedAt,
      description: data.description,
      location: data.location ?? undefined,
      metadata: data.metadata ?? undefined,
    };
    return this.prisma.disasterEvent.update({ where: { id }, data: updateData, select: { id: true } });
  }

  getIdentifier(input: DisasterEventInput): string {
    return `${input.name} (${input.type}, ${input.occurredAt})`;
  }
}

export async function importDisasterEventsFromCSV(
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
  }) as DisasterEventInput[];

  const prisma = createPrismaClient();
  const importer = new DisasterEventImporter(prisma, options);
  const result = await importer.import(records);
  await prisma.$disconnect();
  importer.printSummary();
  return result;
}