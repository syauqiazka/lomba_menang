import { importSourcesFromCSV } from "./import-source";
import { importRegionsFromCSV } from "./import-region";
import { importDisasterEventsFromCSV } from "./import-disaster-event";
import { importEventImpactsFromCSV } from "./import-event-impact";
import { importStatsFromCSV } from "./import-stat";
import { ImportResult } from "./import-base";

export interface ImportAllOptions {
  sourcesFile?: string;
  regionsFile?: string;
  eventsFile?: string;
  impactsFile?: string;
  statsFile?: string;
  dryRun?: boolean;
  batchSize?: number;
  importBatchId?: string;
}

export async function importAll(options: ImportAllOptions = {}): Promise<{
  sources: ImportResult;
  regions: ImportResult;
  events: ImportResult;
  impacts: ImportResult;
  stats: ImportResult;
}> {
  const results = {
    sources: { created: 0, updated: 0, skipped: 0, errors: [] } as ImportResult,
    regions: { created: 0, updated: 0, skipped: 0, errors: [] } as ImportResult,
    events: { created: 0, updated: 0, skipped: 0, errors: [] } as ImportResult,
    impacts: { created: 0, updated: 0, skipped: 0, errors: [] } as ImportResult,
    stats: { created: 0, updated: 0, skipped: 0, errors: [] } as ImportResult,
  };

  console.log("=== Starting Full Data Import ===\n");

  if (options.sourcesFile) {
    console.log("\n--- Importing Sources ---");
    results.sources = await importSourcesFromCSV(options.sourcesFile, {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
      importBatchId: options.importBatchId,
    });
  }

  if (options.regionsFile) {
    console.log("\n--- Importing Regions ---");
    results.regions = await importRegionsFromCSV(options.regionsFile, {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
    });
  }

  if (options.eventsFile) {
    console.log("\n--- Importing Disaster Events ---");
    results.events = await importDisasterEventsFromCSV(options.eventsFile, {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
    });
  }

  if (options.impactsFile) {
    console.log("\n--- Importing Event Impacts ---");
    results.impacts = await importEventImpactsFromCSV(options.impactsFile, {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
    });
  }

  if (options.statsFile) {
    console.log("\n--- Importing Statistics ---");
    results.stats = await importStatsFromCSV(options.statsFile, {
      dryRun: options.dryRun,
      batchSize: options.batchSize,
    });
  }

  console.log("\n=== Import Complete ===");
  console.log(`Sources:      ${results.sources.created} created, ${results.sources.updated} updated, ${results.sources.errors.length} errors`);
  console.log(`Regions:      ${results.regions.created} created, ${results.regions.updated} updated, ${results.regions.errors.length} errors`);
  console.log(`Events:       ${results.events.created} created, ${results.events.updated} updated, ${results.events.errors.length} errors`);
  console.log(`Impacts:      ${results.impacts.created} created, ${results.impacts.updated} updated, ${results.impacts.errors.length} errors`);
  console.log(`Statistics:   ${results.stats.created} created, ${results.stats.updated} updated, ${results.stats.errors.length} errors`);

  const totalErrors =
    results.sources.errors.length +
    results.regions.errors.length +
    results.events.errors.length +
    results.impacts.errors.length +
    results.stats.errors.length;

  if (totalErrors > 0) {
    console.log(`\n⚠ Total errors: ${totalErrors}`);
    process.exitCode = 1;
  } else {
    console.log("\n✓ All imports completed successfully");
  }

  return results;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts: ImportAllOptions = {
    dryRun: args.includes("--dry-run"),
    batchSize: parseInt(args.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? "100", 10),
    importBatchId: args.find((a) => a.startsWith("--batch-id="))?.split("=")[1],
  };

  for (const arg of args) {
    if (arg.startsWith("--sources=")) opts.sourcesFile = arg.split("=")[1];
    if (arg.startsWith("--regions=")) opts.regionsFile = arg.split("=")[1];
    if (arg.startsWith("--events=")) opts.eventsFile = arg.split("=")[1];
    if (arg.startsWith("--impacts=")) opts.impactsFile = arg.split("=")[1];
    if (arg.startsWith("--stats=")) opts.statsFile = arg.split("=")[1];
  }

  importAll(opts).catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
}