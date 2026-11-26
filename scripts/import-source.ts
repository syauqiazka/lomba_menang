import { PrismaClient, SourceCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { BaseImporter, ImportResult, createPrismaClient } from "./import-base";
import { z, ZodError } from "zod";

export interface SourceInput {
  title: string;
  publisher?: string;
  url?: string;
  category: string;
  publicationDate?: string;
  accessDate?: string;
  description?: string;
  importBatchId?: string;
}

export const SourceInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  publisher: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  category: z.enum(["OFFICIAL", "MEDIA", "RESEARCH", "EDITORIAL"]),
  publicationDate: z.string().datetime().optional().or(z.literal("")),
  accessDate: z.string().datetime().optional().or(z.literal("")),
  description: z.string().optional(),
  importBatchId: z.string().optional(),
});

interface SourceNormalized {
  title: string;
  publisher: string | null;
  url: string | null;
  category: SourceCategory;
  publicationDate: Date | null;
  accessDate: Date;
  description: string | null;
  importBatchId: string | null;
}

export class SourceImporter extends BaseImporter<SourceInput, SourceNormalized> {
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient, options: { batchSize?: number; dryRun?: boolean; onProgress?: (progress: { processed: number; total: number }) => void } = {}) {
    super(prisma, options);
    this.prisma = prisma;
  }

  validate(input: SourceInput, _rowNumber: number): { valid: boolean; errors: string[]; normalized?: SourceNormalized } {
    const parsed = SourceInputSchema.safeParse(input);
    if (!parsed.success) {
      const zodError = parsed.error as ZodError;
      return { valid: false, errors: zodError.issues.map((e) => `${e.path.join(".")}: ${e.message}`) };
    }

    const data = parsed.data;
    const normalized: SourceNormalized = {
      title: data.title,
      publisher: data.publisher ?? null,
      url: data.url ?? null,
      category: data.category as SourceCategory,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
      accessDate: data.accessDate ? new Date(data.accessDate) : new Date(),
      description: data.description ?? null,
      importBatchId: data.importBatchId ?? null,
    };

    return { valid: true, errors: [], normalized };
  }

  async findExisting(normalized: SourceNormalized): Promise<{ id: string } | null> {
    const existing = await this.prisma.source.findFirst({
      where: {
        title: normalized.title,
        publisher: normalized.publisher ?? undefined,
        url: normalized.url ?? undefined,
      },
      select: { id: true },
    });
    return existing;
  }

  async create(data: SourceNormalized): Promise<{ id: string }> {
    const createData: Prisma.SourceCreateInput = {
      title: data.title,
      publisher: data.publisher,
      url: data.url,
      category: data.category,
      publicationDate: data.publicationDate,
      accessDate: data.accessDate,
      description: data.description,
      importBatchId: data.importBatchId,
    };
    return this.prisma.source.create({ data: createData, select: { id: true } });
  }

  async update(id: string, data: SourceNormalized): Promise<{ id: string }> {
    const updateData: Prisma.SourceUpdateInput = {
      title: data.title,
      publisher: data.publisher,
      url: data.url,
      category: data.category,
      publicationDate: data.publicationDate,
      accessDate: data.accessDate,
      description: data.description,
      importBatchId: data.importBatchId,
    };
    return this.prisma.source.update({ where: { id }, data: updateData, select: { id: true } });
  }

  getIdentifier(input: SourceInput): string {
    return input.title;
  }
}

export async function importSourcesFromCSV(
  filePath: string,
  options?: { batchSize?: number; dryRun?: boolean; importBatchId?: string }
): Promise<ImportResult> {
  const fs = await import("fs/promises");
  const { parse } = await import("csv-parse/sync");

  const content = await fs.readFile(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SourceInput[];

  const recordsWithBatch = records.map((r) => ({
    ...r,
    importBatchId: r.importBatchId ?? options?.importBatchId ?? `csv-import-${Date.now()}`,
  }));

  const prisma = createPrismaClient();
  const importer = new SourceImporter(prisma, options);
  const result = await importer.import(recordsWithBatch);
  await prisma.$disconnect();
  importer.printSummary();
  return result;
}