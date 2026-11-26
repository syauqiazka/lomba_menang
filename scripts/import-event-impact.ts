import { PrismaClient, PublicStatus, DisasterType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { BaseImporter, ImportResult, createPrismaClient } from "./import-base";
import { z, ZodError } from "zod";

export interface EventImpactInput {
  eventName: string;
  eventType: string;
  eventOccurredAt: string;
  regionCode: string;
  status?: string;
  affectedCount?: number;
  displacedCount?: number;
  injuredCount?: number;
  fatalitiesCount?: number;
  damagedHouses?: number;
  notes?: string;
  sourceTitle?: string;
  sourcePublisher?: string;
}

export const EventImpactInputSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventType: z.enum([
    "EARTHQUAKE", "FLOOD", "LANDSLIDE", "COASTAL_EROSION", "TIDAL_FLOOD",
    "EXTREME_WEATHER", "LAND_SUBSIDENCE", "VOLCANIC_ERUPTION", "TSUNAMI", "OTHER"
  ]),
  eventOccurredAt: z.string().datetime(),
  regionCode: z.string().min(1, "Region code is required"),
  status: z.enum(["DILAPORKAN_BELUM_MENERIMA_BANTUAN", "AKSES_TERISOLIR", "BELUM_TERVERIFIKASI"]).optional().or(z.literal("")),
  affectedCount: z.coerce.number().int().nonnegative().optional(),
  displacedCount: z.coerce.number().int().nonnegative().optional(),
  injuredCount: z.coerce.number().int().nonnegative().optional(),
  fatalitiesCount: z.coerce.number().int().nonnegative().optional(),
  damagedHouses: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  sourceTitle: z.string().optional(),
  sourcePublisher: z.string().optional(),
});

interface EventImpactNormalized {
  eventName: string;
  eventType: string;
  eventOccurredAt: string;
  regionCode: string;
  status: string | null;
  affectedCount: number | null;
  displacedCount: number | null;
  injuredCount: number | null;
  fatalitiesCount: number | null;
  damagedHouses: number | null;
  notes: string | null;
  sourceTitle: string | null;
  sourcePublisher: string | null;
}

export class EventImpactImporter extends BaseImporter<EventImpactInput, EventImpactNormalized> {
  protected prisma: PrismaClient;
  private eventCache: Map<string, string> = new Map();
  private regionCache: Map<string, string> = new Map();
  private sourceCache: Map<string, string> = new Map();

  constructor(prisma: PrismaClient, options: { batchSize?: number; dryRun?: boolean; onProgress?: (progress: { processed: number; total: number }) => void } = {}) {
    super(prisma, options);
    this.prisma = prisma;
  }

  validate(input: EventImpactInput, _rowNumber: number): { valid: boolean; errors: string[]; normalized?: EventImpactNormalized } {
    const parsed = EventImpactInputSchema.safeParse(input);
    if (!parsed.success) {
      const zodError = parsed.error as ZodError;
      return { valid: false, errors: zodError.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
    }

    const data = parsed.data;
    const normalized: EventImpactNormalized = {
      eventName: data.eventName,
      eventType: data.eventType,
      eventOccurredAt: data.eventOccurredAt,
      regionCode: data.regionCode,
      status: data.status ?? null,
      affectedCount: data.affectedCount ?? null,
      displacedCount: data.displacedCount ?? null,
      injuredCount: data.injuredCount ?? null,
      fatalitiesCount: data.fatalitiesCount ?? null,
      damagedHouses: data.damagedHouses ?? null,
      notes: data.notes ?? null,
      sourceTitle: data.sourceTitle ?? null,
      sourcePublisher: data.sourcePublisher ?? null,
    };

    return { valid: true, errors: [], normalized };
  }

  private async getEventId(eventName: string, eventType: string, occurredAt: Date): Promise<string | null> {
    const key = `${eventName}|${eventType}|${occurredAt.toISOString()}`;
    if (this.eventCache.has(key)) return this.eventCache.get(key)!;

    const event = await this.prisma.disasterEvent.findFirst({
      where: { name: eventName, type: eventType as DisasterType, occurredAt },
      select: { id: true },
    });
    const id = event?.id ?? null;
    if (id) this.eventCache.set(key, id);
    return id;
  }

  private async getRegionId(regionCode: string): Promise<string | null> {
    if (this.regionCache.has(regionCode)) return this.regionCache.get(regionCode)!;

    const region = await this.prisma.region.findUnique({
      where: { code: regionCode },
      select: { id: true },
    });
    const id = region?.id ?? null;
    if (id) this.regionCache.set(regionCode, id);
    return id;
  }

  private async getSourceId(title: string, publisher?: string): Promise<string | null> {
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

  async findExisting(normalized: EventImpactNormalized): Promise<{ id: string } | null> {
    const eventId = await this.getEventId(normalized.eventName, normalized.eventType, new Date(normalized.eventOccurredAt));
    const regionId = await this.getRegionId(normalized.regionCode);

    if (!eventId || !regionId) return null;

    const existing = await this.prisma.eventImpact.findUnique({
      where: { eventId_regionId: { eventId, regionId } },
      select: { id: true },
    });
    return existing;
  }

  async create(data: EventImpactNormalized): Promise<{ id: string }> {
    const eventId = await this.getEventId(data.eventName, data.eventType, new Date(data.eventOccurredAt));
    const regionId = await this.getRegionId(data.regionCode);
    const sourceId = data.sourceTitle ? await this.getSourceId(data.sourceTitle, data.sourcePublisher ?? undefined) : null;

    if (!eventId) throw new Error(`Event not found: ${data.eventName}`);
    if (!regionId) throw new Error(`Region not found: ${data.regionCode}`);

    const createData: Prisma.EventImpactCreateInput = {
      event: { connect: { id: eventId } },
      region: { connect: { id: regionId } },
      status: data.status as PublicStatus | null,
      affectedCount: data.affectedCount,
      displacedCount: data.displacedCount,
      injuredCount: data.injuredCount,
      fatalitiesCount: data.fatalitiesCount,
      damagedHouses: data.damagedHouses,
      notes: data.notes,
    };

    if (sourceId) {
      createData.source = { connect: { id: sourceId } };
    }

    return this.prisma.eventImpact.create({ data: createData, select: { id: true } });
  }

  async update(id: string, data: EventImpactNormalized): Promise<{ id: string }> {
    const _eventId = await this.getEventId(data.eventName, data.eventType, new Date(data.eventOccurredAt));
    const _regionId = await this.getRegionId(data.regionCode);
    const sourceId = data.sourceTitle ? await this.getSourceId(data.sourceTitle, data.sourcePublisher ?? undefined) : null;

    const updateData: Prisma.EventImpactUpdateInput = {
      status: data.status as PublicStatus | null,
      affectedCount: data.affectedCount,
      displacedCount: data.displacedCount,
      injuredCount: data.injuredCount,
      fatalitiesCount: data.fatalitiesCount,
      damagedHouses: data.damagedHouses,
      notes: data.notes,
    };

    if (sourceId) {
      updateData.source = { connect: { id: sourceId } };
    }

    return this.prisma.eventImpact.update({ where: { id }, data: updateData, select: { id: true } });
  }

  getIdentifier(input: EventImpactInput): string {
    return `${input.eventName} - ${input.regionCode}`;
  }
}

export async function importEventImpactsFromCSV(
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
  }) as EventImpactInput[];

  const prisma = createPrismaClient();
  const importer = new EventImpactImporter(prisma, options);
  const result = await importer.import(records);
  await prisma.$disconnect();
  importer.printSummary();
  return result;