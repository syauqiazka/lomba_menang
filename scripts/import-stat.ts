import { PrismaClient, DisasterType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { BaseImporter, ImportResult, createPrismaClient } from "./import-base";
import { z, ZodError } from "zod";

export interface StatInput {
  sourceTitle: string;
  sourcePublisher?: string;
  eventName?: string;
  eventType?: string;
  eventOccurredAt?: string;
  regionCode?: string;
  key: string;
  label: string;
  value: string;
  unit?: string;
  asOfDate: string;
  metadata?: unknown;
}

export const StatInputSchema = z.object({
  sourceTitle: z.string().min(1, "Source title is required"),
  sourcePublisher: z.string().optional(),
  eventName: z.string().optional(),
  eventType: z.enum([
    "EARTHQUAKE", "FLOOD", "LANDSLIDE", "COASTAL_EROSION", "TIDAL_FLOOD",
    "EXTREME_WEATHER", "LAND_SUBSIDENCE", "VOLCANIC_ERUPTION", "TSUNAMI", "OTHER"
  ]).optional(),
  eventOccurredAt: z.string().datetime().optional().or(z.literal("")),
  regionCode: z.string().optional(),
  key: z.string().min(1, "Key is required"),
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
  unit: z.string().optional(),
  asOfDate: z.string().datetime(),
  metadata: z.unknown().optional(),
});

interface StatNormalized {
  sourceTitle: string;
  sourcePublisher: string | null;
  eventName: string | null;
  eventType: string | null;
  eventOccurredAt: string | null;
  regionCode: string | null;
  key: string;
  label: string;
  value: string;
  unit: string | null;
  asOfDate: string;
  metadata: unknown | null;
}

export class StatImporter extends BaseImporter<StatInput, StatNormalized> {
  protected prisma: PrismaClient;
  private sourceCache: Map<string, string> = new Map();
  private eventCache: Map<string, string> = new Map();
  private regionCache: Map<string, string> = new Map();

  constructor(prisma: PrismaClient, options: { batchSize?: number; dryRun?: boolean; onProgress?: (progress: { processed: number; total: number }) => void } = {}) {
    super(prisma, options);
    this.prisma = prisma;
  }

  validate(input: StatInput, _rowNumber: number): { valid: boolean; errors: string[]; normalized?: StatNormalized } {
    const parsed = StatInputSchema.safeParse(input);
    if (!parsed.success) {
      const zodError = parsed.error as ZodError;
      return { valid: false, errors: zodError.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
    }

    const data = parsed.data;
    const normalized: StatNormalized = {
      sourceTitle: data.sourceTitle,
      sourcePublisher: data.sourcePublisher ?? null,
      eventName: data.eventName ?? null,
      eventType: data.eventType ?? null,
      eventOccurredAt: data.eventOccurredAt ?? null,
      regionCode: data.regionCode ?? null,
      key: data.key,
      label: data.label,
      value: data.value,
      unit: data.unit ?? null,
      asOfDate: data.asOfDate,
      metadata: data.metadata ?? null,
    };

    return { valid: true, errors: [], normalized };
  }

  private async getSourceId(title: string, publisher?: string | null): Promise<string | null> {
    const key = `${title}|${publisher ?? ""}`;
    if (this.sourceCache.has(key)) return this.sourceCache.get(key)!;

    const source = await this.prisma.source.findFirst({
      where: { title, publisher: publisher ?? undefined },
      select: { id: true },
    });
    const id = source?.id ?? null;
    if (id) this.sourceCache.set(key, id);
    return id;
  }

  private async getEventId(name: string, type: string, occurredAt: Date): Promise<string | null> {
    const key = `${name}|${type}|${occurredAt.toISOString()}`;
    if (this.eventCache.has(key)) return this.eventCache.get(key)!;

    const event = await this.prisma.disasterEvent.findFirst({
      where: { name, type: type as DisasterType, occurredAt },
      select: { id: true },
    });
    const id = event?.id ?? null;
    if (id) this.eventCache.set(key, id);
    return id;
  }

  private async getRegionId(code: string): Promise<string | null> {
    if (this.regionCache.has(code)) return this.regionCache.get(code)!;

    const region = await this.prisma.region.findUnique({
      where: { code },
      select: { id: true },
    });
    const id = region?.id ?? null;
    if (id) this.regionCache.set(code, id);
    return id;
  }

  async findExisting(normalized: StatNormalized): Promise<{ id: string } | null> {
    const sourceId = await this.getSourceId(normalized.sourceTitle, normalized.sourcePublisher);
    if (!sourceId) return null;

    const eventId = normalized.eventName && normalized.eventType && normalized.eventOccurredAt
      ? await this.getEventId(normalized.eventName, normalized.eventType, new Date(normalized.eventOccurredAt))
      : null;
    const regionId = normalized.regionCode ? await this.getRegionId(normalized.regionCode) : null;

    const existing = await this.prisma.stat.findFirst({
      where: {
        sourceId,
        key: normalized.key,
        regionId: regionId ?? undefined,
        eventId: eventId ?? undefined,
      },
      select: { id: true },
    });
    return existing;
  }

  async create(data: StatNormalized): Promise<{ id: string }> {
    const sourceId = await this.getSourceId(data.sourceTitle, data.sourcePublisher);
    const eventId = data.eventName && data.eventType && data.eventOccurredAt
      ? await this.getEventId(data.eventName, data.eventType, new Date(data.eventOccurredAt))
      : null;
    const regionId = data.regionCode ? await this.getRegionId(data.regionCode) : null;

    if (!sourceId) throw new Error(`Source not found: ${data.sourceTitle}`);

    const createData: Prisma.StatCreateInput = {
      source: { connect: { id: sourceId } },
      event: eventId ? { connect: { id: eventId } } : undefined,
      region: regionId ? { connect: { id: regionId } } : undefined,
      key: data.key,
      label: data.label,
      value: data.value,
      unit: data.unit,
      asOfDate: new Date(data.asOfDate),
      metadata: data.metadata ?? undefined,
    };

    return this.prisma.stat.create({ data: createData, select: { id: true } });
  }

  async update(id: string, data: StatNormalized): Promise<{ id: string }> {
    const updateData: Prisma.StatUpdateInput = {
      key: data.key,
      label: data.label,
      value: data.value,
      unit: data.unit,
      asOfDate: new Date(data.asOfDate),
      metadata: data.metadata ?? undefined,
    };

    return this.prisma.stat.update({ where: { id }, data: updateData, select: { id: true } });
  }

  getIdentifier(input: StatInput): string {
    return `${input.key} (${input.sourceTitle})`;
  }
}

export async function importStatsFromCSV(
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
  }) as StatInput[];

  const prisma = createPrismaClient();
  const importer = new StatImporter(prisma, options);
  const result = await importer.import(records);
  await prisma.$disconnect();
  importer.printSummary();
  return result;
}