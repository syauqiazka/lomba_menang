import { prisma, runDbQuery } from "@/lib/prisma";
import { getMapSummaryCounts } from "@/lib/map-data";
import { withSwrCache } from "@/lib/server-cache";
import {
  getFallbackNationalStatsBundle,
  getFallbackSourcesRegistry,
} from "@/lib/local-db-fallback";
import type { SourceCategory } from "@/types/map";

const SITE_CACHE_TTL = {
  freshMs: 5 * 60_000,
  staleMs: 30 * 60_000,
};

export interface NationalStatItem {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  asOfDate: Date;
  source: {
    id: string;
    title: string;
    publisher: string | null;
    category: SourceCategory;
    publicationDate: Date | null;
    accessDate: Date;
    url: string | null;
  };
}

export interface NationalStatsBundle {
  dbStats: NationalStatItem[];
  provinceCount: number;
  regencyCount: number;
  sourceCount: number;
}

export interface SourceRegistryRow {
  id: string;
  title: string;
  publisher: string | null;
  url: string | null;
  category: SourceCategory;
  publicationDate: Date | null;
  accessDate: Date;
  description: string | null;
  importBatchId: string | null;
}

export async function getNationalStatsBundle(): Promise<NationalStatsBundle> {
  return withSwrCache("site:national-stats", SITE_CACHE_TTL, () =>
    runDbQuery(
      async () => {
        const [dbStats, summary] = await Promise.all([
          prisma.stat.findMany({
            where: { regionId: null },
            take: 3,
            orderBy: { asOfDate: "desc" },
            include: {
              source: {
                select: {
                  id: true,
                  title: true,
                  publisher: true,
                  category: true,
                  publicationDate: true,
                  accessDate: true,
                  url: true,
                },
              },
            },
          }),
          getMapSummaryCounts(),
        ]);

        return {
          dbStats: dbStats.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.value,
            unit: s.unit,
            asOfDate: s.asOfDate,
            source: {
              id: s.source.id,
              title: s.source.title,
              publisher: s.source.publisher,
              category: s.source.category as SourceCategory,
              publicationDate: s.source.publicationDate,
              accessDate: s.source.accessDate,
              url: s.source.url,
            },
          })),
          provinceCount: summary.provinceCount,
          regencyCount: summary.regencyCount,
          sourceCount: summary.sourceCount,
        };
      },
      () => getFallbackNationalStatsBundle(),
      { label: "site:national-stats" }
    )
  );
}

export async function getSourcesRegistry(): Promise<SourceRegistryRow[]> {
  return withSwrCache("site:sources-registry", SITE_CACHE_TTL, () =>
    runDbQuery(
      async () => {
        const rows = await prisma.source.findMany({
          orderBy: [{ category: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            publisher: true,
            url: true,
            category: true,
            publicationDate: true,
            accessDate: true,
            description: true,
            importBatchId: true,
          },
        });
        return rows.map((row) => ({
          ...row,
          category: row.category as SourceCategory,
        }));
      },
      () => getFallbackSourcesRegistry(),
      { label: "site:sources-registry" }
    )
  );
}
