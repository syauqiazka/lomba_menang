import { prisma, runDbQuery } from '@/lib/prisma';
import { withSwrCache } from '@/lib/server-cache';
import {
  getFallbackAllMapRegencies,
  getFallbackAllProvinceCodes,
  getFallbackMapRegions,
  getFallbackRegenciesForProvince,
  getFallbackRegionDetail,
  getFallbackSourcesRegistry,
} from '@/lib/local-db-fallback';
import type { RegionMapDTO, RegionDetailDTO, PublicStatus, SourceCategory } from '@/types/map';

const MAP_SWR_OPTIONS = {
  freshMs: 5 * 60_000,
  staleMs: 30 * 60_000,
};

const PRISMA_REGION_FIELDS = {
  select: {
    id: true,
    code: true,
    name: true,
    level: true,
    parentCode: true,
    centroid: true,
  },
};

const STATUS_PRIORITY: Record<PublicStatus, number> = {
  AKSES_TERISOLIR: 3,
  DILAPORKAN_BELUM_MENERIMA_BANTUAN: 2,
  BELUM_TERVERIFIKASI: 1,
};

function pickHigherStatus(a?: PublicStatus, b?: PublicStatus): PublicStatus | undefined {
  if (!a) return b;
  if (!b) return a;
  return STATUS_PRIORITY[a] >= STATUS_PRIORITY[b] ? a : b;
}

function toPublicStatus(status: string | null): PublicStatus | undefined {
  if (!status) return undefined;
  const validStatuses: PublicStatus[] = ['DILAPORKAN_BELUM_MENERIMA_BANTUAN', 'AKSES_TERISOLIR', 'BELUM_TERVERIFIKASI'];
  return validStatuses.includes(status as PublicStatus) ? (status as PublicStatus) : undefined;
}

function toSourceCategory(category: string): SourceCategory {
  const validCategories: SourceCategory[] = ['OFFICIAL', 'MEDIA', 'RESEARCH', 'EDITORIAL'];
  return validCategories.includes(category as SourceCategory) ? (category as SourceCategory) : 'EDITORIAL';
}

function formatCentroid(centroid: unknown): [number, number] | undefined {
  if (!centroid || typeof centroid !== 'object') return undefined;
  const c = centroid as { coordinates?: number[]; lat?: number; lng?: number; longitude?: number; latitude?: number };
  if (Array.isArray(c.coordinates) && c.coordinates.length >= 2) {
    return [c.coordinates[0], c.coordinates[1]];
  }
  if (typeof c.lng === 'number' && typeof c.lat === 'number') {
    return [c.lng, c.lat];
  }
  if (typeof c.longitude === 'number' && typeof c.latitude === 'number') {
    return [c.longitude, c.latitude];
  }
  return undefined;
}

export async function getMapRegions(filters?: { status?: PublicStatus; provinceCode?: string }): Promise<RegionMapDTO[]> {
  if (!filters?.status && !filters?.provinceCode) {
    return withSwrCache('mapRegions:all', MAP_SWR_OPTIONS, () => loadMapRegions(filters));
  }
  return loadMapRegions(filters);
}

async function loadMapRegions(filters?: { status?: PublicStatus; provinceCode?: string }): Promise<RegionMapDTO[]> {
  return runDbQuery<RegionMapDTO[]>(
    async () => {
      const where: Record<string, unknown> = {
        level: 'PROVINCE',
      };

      if (filters?.provinceCode) {
        where.code = filters.provinceCode;
      }

      const provinces = await prisma.region.findMany({
        where,
        orderBy: { name: 'asc' },
        ...PRISMA_REGION_FIELDS,
      });

      const regionCodes = provinces.map((p) => p.code);
      const eventImpacts = await prisma.eventImpact.findMany({
        where: {
          OR: [
            { region: { code: { in: regionCodes } } },
            { region: { parentCode: { in: regionCodes } } },
          ],
          ...(filters?.status ? { status: filters.status } : {}),
        },
        include: {
          region: { select: { code: true, parentCode: true } },
          source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
          event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
        },
      });

      const stats = await prisma.stat.findMany({
        where: {
          region: { code: { in: regionCodes } },
        },
        include: {
          region: { select: { code: true } },
          source: { select: { title: true, category: true, url: true } },
        },
      });

      const provinceStatusMap = new Map<string, PublicStatus>();
      for (const impact of eventImpacts) {
        const provCode =
          impact.region.parentCode && regionCodes.includes(impact.region.parentCode)
            ? impact.region.parentCode
            : impact.region.code;
        const next = pickHigherStatus(provinceStatusMap.get(provCode), toPublicStatus(impact.status ?? null));
        if (next) provinceStatusMap.set(provCode, next);
      }

      const statsByRegion = new Map<string, typeof stats>();
      for (const stat of stats) {
        const code = stat.region?.code;
        if (!code) continue;
        if (!statsByRegion.has(code)) statsByRegion.set(code, []);
        statsByRegion.get(code)!.push(stat);
      }

      return provinces.map((province) => {
        const regionStats = statsByRegion.get(province.code) ?? [];

        return {
          code: province.code,
          name: province.name,
          level: 'province' as const,
          status: provinceStatusMap.get(province.code),
          stats: regionStats.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.value,
            unit: s.unit ?? undefined,
            asOfDate: s.asOfDate.toISOString(),
            source: {
              title: s.source.title,
              category: toSourceCategory(s.source.category),
              url: s.source.url ?? undefined,
            },
          })),
          centroid: formatCentroid(province.centroid),
        };
      });
    },
    () => getFallbackMapRegions(filters),
    { label: 'map:provinces' }
  );
}

export async function getRegenciesForProvince(provinceCode: string): Promise<RegionMapDTO[]> {
  return withSwrCache(`mapRegencies:prov:${provinceCode}`, MAP_SWR_OPTIONS, () =>
    runDbQuery<RegionMapDTO[]>(
      async () => {
        const regencies = await prisma.region.findMany({
          where: { parentCode: provinceCode, level: 'REGENCY_CITY' },
          orderBy: { name: 'asc' },
          ...PRISMA_REGION_FIELDS,
        });

        const regionCodes = regencies.map((r) => r.code);
        const [eventImpacts, stats] = await Promise.all([
          prisma.eventImpact.findMany({
            where: { region: { code: { in: regionCodes } } },
            include: {
              region: { select: { code: true } },
              source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
              event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
            },
          }),
          prisma.stat.findMany({
            where: { region: { code: { in: regionCodes } } },
            include: {
              region: { select: { code: true } },
              source: { select: { title: true, category: true, url: true } },
            },
          }),
        ]);

        const statusByRegion = new Map<string, PublicStatus>();
        for (const impact of eventImpacts) {
          const code = impact.region.code;
          const next = pickHigherStatus(statusByRegion.get(code), toPublicStatus(impact.status ?? null));
          if (next) statusByRegion.set(code, next);
        }

        const statsByRegion = new Map<string, typeof stats>();
        for (const stat of stats) {
          const code = stat.region?.code;
          if (!code) continue;
          if (!statsByRegion.has(code)) statsByRegion.set(code, []);
          statsByRegion.get(code)!.push(stat);
        }

        return regencies.map((regency) => {
          const regionStats = statsByRegion.get(regency.code) ?? [];

          return {
            code: regency.code,
            name: regency.name,
            level: 'regency' as const,
            parentCode: regency.parentCode ?? undefined,
            status: statusByRegion.get(regency.code),
            stats: regionStats.map((s) => ({
              key: s.key,
              label: s.label,
              value: s.value,
              unit: s.unit ?? undefined,
              asOfDate: s.asOfDate.toISOString(),
              source: {
                title: s.source.title,
                category: toSourceCategory(s.source.category),
                url: s.source.url ?? undefined,
              },
            })),
            centroid: formatCentroid(regency.centroid),
          };
        });
      },
      () => getFallbackRegenciesForProvince(provinceCode),
      { label: `map:prov-regencies:${provinceCode}` }
    )
  );
}

export async function getRegionDetail(code: string): Promise<RegionDetailDTO | null> {
  return withSwrCache(`mapRegionDetail:${code}`, MAP_SWR_OPTIONS, () =>
    runDbQuery<RegionDetailDTO | null>(
      async () => {
        const region = await prisma.region.findUnique({
          where: { code },
          ...PRISMA_REGION_FIELDS,
        });

        if (!region) return null;

        const [directImpacts, stats] = await Promise.all([
          prisma.eventImpact.findMany({
            where: { regionId: region.id },
            include: {
              region: { select: { name: true } },
              source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
              event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
            },
            orderBy: { event: { occurredAt: 'desc' } },
          }),
          prisma.stat.findMany({
            where: { regionId: region.id },
            include: { source: { select: { title: true, category: true, url: true } } },
          }),
        ]);

        const childImpacts =
          region.level === 'PROVINCE' && directImpacts.length === 0
            ? await prisma.eventImpact.findMany({
                where: { region: { parentCode: region.code } },
                include: {
                  region: { select: { name: true } },
                  source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
                  event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
                },
                orderBy: { event: { occurredAt: 'desc' } },
                take: 25,
              })
            : [];

        const eventImpacts = directImpacts.length > 0 ? directImpacts : childImpacts;
        const isProvinceRollup = directImpacts.length === 0 && childImpacts.length > 0;

        let highestStatus: PublicStatus | undefined;
        for (const imp of eventImpacts) {
          highestStatus = pickHigherStatus(highestStatus, toPublicStatus(imp.status ?? null));
        }

        return {
          code: region.code,
          name: region.name,
          level: region.level === 'PROVINCE' ? 'province' : 'regency',
          parentCode: region.parentCode ?? undefined,
          status: highestStatus,
          stats: stats.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.value,
            unit: s.unit ?? undefined,
            asOfDate: s.asOfDate.toISOString(),
            source: {
              title: s.source.title,
              category: toSourceCategory(s.source.category),
              url: s.source.url ?? undefined,
            },
          })),
          centroid: formatCentroid(region.centroid),
          eventImpacts: eventImpacts.map((i) => ({
            eventId: isProvinceRollup ? `${i.event.id}-${i.id}` : i.event.id,
            eventName: isProvinceRollup ? `${i.region.name} — ${i.event.name}` : i.event.name,
            eventType: i.event.type,
            eventNature: i.event.nature,
            occurredAt: i.event.occurredAt.toISOString(),
            status: toPublicStatus(i.status ?? null),
            affectedCount: i.affectedCount ?? undefined,
            displacedCount: i.displacedCount ?? undefined,
            injuredCount: i.injuredCount ?? undefined,
            fatalitiesCount: i.fatalitiesCount ?? undefined,
            damagedHouses: i.damagedHouses ?? undefined,
            notes: i.notes ?? undefined,
            source: i.source
              ? {
                  title: i.source.title,
                  category: toSourceCategory(i.source.category),
                  url: i.source.url ?? undefined,
                  publicationDate: i.source.publicationDate?.toISOString(),
                  accessDate: i.source.accessDate.toISOString(),
                }
              : undefined,
          })),
        };
      },
      () => getFallbackRegionDetail(code),
      { label: `map:region-detail:${code}` }
    )
  );
}

export async function getAllProvinceCodes(): Promise<string[]> {
  return runDbQuery(
    async () => {
      const provinces = await prisma.region.findMany({
        where: { level: 'PROVINCE' },
        select: { code: true },
        orderBy: { name: 'asc' },
      });
      return provinces.map((p) => p.code);
    },
    () => getFallbackAllProvinceCodes(),
    { label: 'map:province-codes' }
  );
}

export async function getAllMapRegencies(): Promise<RegionMapDTO[]> {
  return withSwrCache('mapRegencies:all', MAP_SWR_OPTIONS, () =>
    runDbQuery<RegionMapDTO[]>(
      async () => {
        const [regencies, eventImpacts] = await Promise.all([
          prisma.region.findMany({
            where: { level: 'REGENCY_CITY' },
            orderBy: { name: 'asc' },
            ...PRISMA_REGION_FIELDS,
          }),
          prisma.eventImpact.findMany({
            where: {
              region: { level: 'REGENCY_CITY' },
              status: { not: null },
            },
            include: {
              region: { select: { code: true } },
              event: { select: { occurredAt: true } },
            },
            orderBy: { event: { occurredAt: 'desc' } },
          }),
        ]);

        const statusByCode = new Map<string, PublicStatus>();
        for (const impact of eventImpacts) {
          const next = pickHigherStatus(statusByCode.get(impact.region.code), toPublicStatus(impact.status ?? null));
          if (next) statusByCode.set(impact.region.code, next);
        }

        return regencies.map((regency) => ({
          code: regency.code,
          name: regency.name,
          level: 'regency' as const,
          parentCode: regency.parentCode ?? undefined,
          status: statusByCode.get(regency.code),
          centroid: formatCentroid(regency.centroid),
        }));
      },
      () => getFallbackAllMapRegencies(),
      { label: 'map:all-regencies' }
    )
  );
}

export interface MapSummaryCounts {
  provinceCount: number;
  regencyCount: number;
  activeStatusCount: number;
  sourceCount: number;
  statusCounts: {
    tidakAdaLaporan: number;
    belumMenerimaBantuan: number;
    aksesTerisolir: number;
    belumTerverifikasi: number;
  };
}

export async function getMapSummaryCounts(): Promise<MapSummaryCounts> {
  return withSwrCache('mapSummaryCounts', MAP_SWR_OPTIONS, async () => {
    const [provinces, regencies, sourceCount] = await Promise.all([
      getMapRegions(),
      getAllMapRegencies(),
      runDbQuery(
        () => prisma.source.count(),
        async () => (await getFallbackSourcesRegistry()).length,
        { label: 'map:source-count' }
      ),
    ]);

    let aksesTerisolir = 0;
    let belumMenerimaBantuan = 0;
    let belumTerverifikasi = 0;
    for (const reg of regencies) {
      if (reg.status === 'AKSES_TERISOLIR') aksesTerisolir++;
      else if (reg.status === 'DILAPORKAN_BELUM_MENERIMA_BANTUAN') belumMenerimaBantuan++;
      else if (reg.status === 'BELUM_TERVERIFIKASI') belumTerverifikasi++;
    }

    const provinceCount = provinces.length;
    const regencyCount = regencies.length;
    const activeStatusCount = aksesTerisolir + belumMenerimaBantuan + belumTerverifikasi;
    const tidakAdaLaporan = Math.max(0, regencyCount - activeStatusCount);

    return {
      provinceCount,
      regencyCount,
      activeStatusCount,
      sourceCount,
      statusCounts: {
        tidakAdaLaporan,
        belumMenerimaBantuan,
        aksesTerisolir,
        belumTerverifikasi,
      },
    };
  });
}