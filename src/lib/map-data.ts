import { prisma } from '@/lib/prisma';
import type { RegionMapDTO, RegionDetailDTO, PublicStatus, SourceCategory } from '@/types/map';

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
      region: { code: { in: regionCodes } },
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      region: { select: { code: true } },
      source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
      event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
    },
  });

  const stats = await prisma.stat.findMany({
    where: {
      region: { code: { in: regionCodes } },
    },
    include: {
      source: { select: { title: true, category: true, url: true } },
    },
  });

  const impactByRegion = new Map<string, typeof eventImpacts>();
  for (const impact of eventImpacts) {
    const code = impact.region.code;
    if (!impactByRegion.has(code)) impactByRegion.set(code, []);
    impactByRegion.get(code)!.push(impact);
  }

  const statsByRegion = new Map<string, typeof stats>();
  for (const stat of stats) {
    if (!stat.regionId) continue;
    const region = await prisma.region.findUnique({ where: { id: stat.regionId }, select: { code: true } });
    if (!region) continue;
    if (!statsByRegion.has(region.code)) statsByRegion.set(region.code, []);
    statsByRegion.get(region.code)!.push(stat);
  }

  return provinces.map((province) => {
    const impacts = impactByRegion.get(province.code) ?? [];
    const latestImpact = impacts.sort((a, b) => b.event.occurredAt.getTime() - a.event.occurredAt.getTime())[0];
    const regionStats = statsByRegion.get(province.code) ?? [];

    return {
      code: province.code,
      name: province.name,
      level: 'province' as const,
      status: toPublicStatus(latestImpact?.status ?? null),
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
}

export async function getRegenciesForProvince(provinceCode: string): Promise<RegionMapDTO[]> {
  const regencies = await prisma.region.findMany({
    where: { parentCode: provinceCode, level: 'REGENCY_CITY' },
    orderBy: { name: 'asc' },
    ...PRISMA_REGION_FIELDS,
  });

  const regionCodes = regencies.map((r) => r.code);
  const eventImpacts = await prisma.eventImpact.findMany({
    where: { region: { code: { in: regionCodes } } },
    include: {
      region: { select: { code: true } },
      source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
      event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
    },
  });

  const stats = await prisma.stat.findMany({
    where: { region: { code: { in: regionCodes } } },
    include: { source: { select: { title: true, category: true, url: true } } },
  });

  const impactByRegion = new Map<string, typeof eventImpacts>();
  for (const impact of eventImpacts) {
    const code = impact.region.code;
    if (!impactByRegion.has(code)) impactByRegion.set(code, []);
    impactByRegion.get(code)!.push(impact);
  }

  const statsByRegion = new Map<string, typeof stats>();
  for (const stat of stats) {
    if (!stat.regionId) continue;
    const region = await prisma.region.findUnique({ where: { id: stat.regionId }, select: { code: true } });
    if (!region) continue;
    if (!statsByRegion.has(region.code)) statsByRegion.set(region.code, []);
    statsByRegion.get(region.code)!.push(stat);
  }

  return regencies.map((regency) => {
    const impacts = impactByRegion.get(regency.code) ?? [];
    const latestImpact = impacts.sort((a, b) => b.event.occurredAt.getTime() - a.event.occurredAt.getTime())[0];
    const regionStats = statsByRegion.get(regency.code) ?? [];

    return {
      code: regency.code,
      name: regency.name,
      level: 'regency' as const,
      parentCode: regency.parentCode ?? undefined,
      status: toPublicStatus(latestImpact?.status ?? null),
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
}

export async function getRegionDetail(code: string): Promise<RegionDetailDTO | null> {
  const region = await prisma.region.findUnique({
    where: { code },
    ...PRISMA_REGION_FIELDS,
  });

  if (!region) return null;

  const eventImpacts = await prisma.eventImpact.findMany({
    where: { regionId: region.id },
    include: {
      source: { select: { title: true, category: true, url: true, publicationDate: true, accessDate: true } },
      event: { select: { id: true, name: true, type: true, nature: true, occurredAt: true } },
    },
    orderBy: { event: { occurredAt: 'desc' } },
  });

  const stats = await prisma.stat.findMany({
    where: { regionId: region.id },
    include: { source: { select: { title: true, category: true, url: true } } },
  });

  return {
    code: region.code,
    name: region.name,
    level: region.level === 'PROVINCE' ? 'province' : 'regency',
    parentCode: region.parentCode ?? undefined,
    status: undefined,
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
      eventId: i.event.id,
      eventName: i.event.name,
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
}

export async function getAllProvinceCodes(): Promise<string[]> {
  const provinces = await prisma.region.findMany({
    where: { level: 'PROVINCE' },
    select: { code: true },
    orderBy: { name: 'asc' },
  });
  return provinces.map((p) => p.code);
}