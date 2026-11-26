import { PrismaClient } from "@prisma/client";

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  data: unknown;
  error: string;
}

export interface ImportOptions {
  batchSize?: number;
  dryRun?: boolean;
  onProgress?: (progress: { processed: number; total: number }) => void;
}

export abstract class BaseImporter<TInput, TNormalized> {
  protected prisma: PrismaClient;
  protected options: Required<ImportOptions>;
  protected result: ImportResult;

  constructor(prisma: PrismaClient, options: ImportOptions = {}) {
    this.prisma = prisma;
    this.options = {
      batchSize: options.batchSize ?? 100,
      dryRun: options.dryRun ?? false,
      onProgress: options.onProgress ?? (() => {}),
    };
    this.result = { created: 0, updated: 0, skipped: 0, errors: [] };
  }

  abstract validate(input: TInput, rowNumber: number): { valid: boolean; errors: string[]; normalized?: TNormalized };
  abstract findExisting(normalized: TNormalized): Promise<{ id: string } | null>;
  abstract create(data: TNormalized): Promise<{ id: string }>;
  abstract update(id: string, data: TNormalized): Promise<{ id: string }>;
  abstract getIdentifier(input: TInput): string;

  async import(inputs: TInput[]): Promise<ImportResult> {
    this.result = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < inputs.length; i += this.options.batchSize) {
      const batch = inputs.slice(i, i + this.options.batchSize);
      await this.processBatch(batch, i);
      this.options.onProgress({ processed: Math.min(i + this.options.batchSize, inputs.length), total: inputs.length });
    }

    return this.result;
  }

  private async processBatch(batch: TInput[], startRow: number): Promise<void> {
    for (let j = 0; j < batch.length; j++) {
      const rowNumber = startRow + j + 1;
      const input = batch[j];

      const validation = this.validate(input, rowNumber);
      if (!validation.valid) {
        this.result.errors.push({
          row: rowNumber,
          data: input,
          error: validation.errors.join("; "),
        });
        continue;
      }

      const normalized = validation.normalized!;
      const existing = await this.findExisting(normalized);

      if (existing) {
        if (!this.options.dryRun) {
          await this.update(existing.id, normalized);
        }
        this.result.updated++;
      } else {
        if (!this.options.dryRun) {
          await this.create(normalized);
        }
        this.result.created++;
      }
    }
  }

  getResult(): ImportResult {
    return this.result;
  }

  printSummary(): void {
    console.log(`\nImport Summary:`);
    console.log(`  Created: ${this.result.created}`);
    console.log(`  Updated: ${this.result.updated}`);
    console.log(`  Skipped: ${this.result.skipped}`);
    console.log(`  Errors:  ${this.result.errors.length}`);
    if (this.result.errors.length > 0) {
      console.log(`\nErrors:`);
      for (const err of this.result.errors) {
        console.log(`  Row ${err.row}: ${err.error}`);
      }
    }
  }
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}