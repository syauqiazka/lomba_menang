import { PrismaClient, SourceCategory } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();

interface SeedSource {
  title: string;
  publisher?: string;
  url?: string;
  category: SourceCategory;
  publicationDate?: string;
  accessDate?: string;
  description?: string;
  importBatchId?: string;
}

async function seedSources(): Promise<void> {
  console.log("Seeding sources...");

  const seedPath = path.join(__dirname, "seed", "sources.json");
  const content = await fs.readFile(seedPath, "utf-8");
  const sources: SeedSource[] = JSON.parse(content);

  let created = 0;
  let skipped = 0;

  for (const source of sources) {
    const existing = await prisma.source.findFirst({
      where: {
        title: source.title,
        publisher: source.publisher ?? undefined,
      },
    });

    if (existing) {
      console.log(`  ⊘ Skipped (exists): ${source.title}`);
      skipped++;
      continue;
    }

    await prisma.source.create({
      data: {
        title: source.title,
        publisher: source.publisher ?? null,
        url: source.url ?? null,
        category: source.category,
        publicationDate: source.publicationDate ? new Date(source.publicationDate) : null,
        accessDate: source.accessDate ? new Date(source.accessDate) : new Date(),
        description: source.description ?? null,
        importBatchId: source.importBatchId ?? null,
      },
    });

    console.log(`  ✓ Created: ${source.title}`);
    created++;
  }

  console.log(`\nSources: ${created} created, ${skipped} skipped`);
}

async function seedRegions(): Promise<void> {
  console.log("\nSeeding regions (placeholder - requires official BPS data)...");
  console.log("  ℹ Region seeding requires official BPS/BIG GeoJSON data");
  console.log("  ℹ Use 'npm run import:regions -- --regions=<file.csv>' after obtaining official data");
}

async function main(): Promise<void> {
  console.log("=== Database Seeding ===\n");

  try {
    await seedSources();
    await seedRegions();

    console.log("\n=== Seeding Complete ===");
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}