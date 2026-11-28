import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFallbackAllMapRegencies,
  getFallbackMapRegions,
  getFallbackMapSummaryCounts,
  getFallbackNationalStatsBundle,
  getFallbackRegionDetail,
  getFallbackSourcesRegistry,
} from '../src/lib/local-db-fallback';
import { isDbCircuitOpen, resetDbCircuit, runDbQuery } from '../src/lib/prisma';

describe('Local Snapshot Fallback Store', () => {
  it('loads 38 provinces with valid centroids and active Aceh/NTT statuses', async () => {
    const provinces = await getFallbackMapRegions();
    expect(provinces).toHaveLength(38);

    for (const prov of provinces) {
      expect(prov.level).toBe('province');
      expect(prov.centroid).toBeDefined();
      expect(prov.centroid).toHaveLength(2);
    }

    const aceh = provinces.find((p) => p.code === '11');
    const ntt = provinces.find((p) => p.code === '53');
    expect(aceh?.status).toBeDefined();
    expect(ntt?.status).toBeDefined();
  });

  it('loads 514 regencies with all three active PublicStatus categories populated', async () => {
    const regencies = await getFallbackAllMapRegencies();
    expect(regencies).toHaveLength(514);

    const summary = await getFallbackMapSummaryCounts();
    expect(summary.provinceCount).toBe(38);
    expect(summary.regencyCount).toBe(514);
    expect(summary.statusCounts.aksesTerisolir).toBeGreaterThan(0);
    expect(summary.statusCounts.belumMenerimaBantuan).toBeGreaterThan(0);
    expect(summary.statusCounts.belumTerverifikasi).toBeGreaterThan(0);
  });

  it('builds province rollup detail for Aceh (11) and NTT (53) plus regency detail (1101)', async () => {
    const [acehDetail, nttDetail, regDetail] = await Promise.all([
      getFallbackRegionDetail('11'),
      getFallbackRegionDetail('53'),
      getFallbackRegionDetail('1101'),
    ]);

    expect(acehDetail?.level).toBe('province');
    expect(acehDetail?.eventImpacts?.length).toBeGreaterThan(0);

    expect(nttDetail?.level).toBe('province');
    expect(nttDetail?.eventImpacts?.length).toBeGreaterThan(0);

    expect(regDetail?.level).toBe('regency');
    expect(regDetail?.parentCode).toBe('11');
    expect(regDetail?.eventImpacts?.length).toBeGreaterThan(0);
  });

  it('provides national featured stats bundle (341 PU, 95750 houses, 27833 displaced) and valid Date objects', async () => {
    const bundle = await getFallbackNationalStatsBundle();
    expect(bundle.provinceCount).toBe(38);
    expect(bundle.regencyCount).toBe(514);
    expect(bundle.dbStats).toHaveLength(3);

    const byKey = new Map(bundle.dbStats.map((s) => [s.key, s.value]));
    expect(byKey.get('pu_bnpb_severed_access_points')).toBe('341');
    expect(byKey.get('ntt_2026_total_damaged_houses')).toBe('95750');
    expect(byKey.get('ntt_2026_total_displaced')).toBe('27833');

    for (const stat of bundle.dbStats) {
      expect(stat.asOfDate).toBeInstanceOf(Date);
      expect(stat.source.accessDate).toBeInstanceOf(Date);
    }

    const sources = await getFallbackSourcesRegistry();
    expect(sources.length).toBeGreaterThanOrEqual(4);
    for (const src of sources) {
      expect(src.accessDate).toBeInstanceOf(Date);
    }
  });
});

describe('runDbQuery Circuit Breaker & Timeout', () => {
  beforeEach(() => {
    resetDbCircuit();
  });

  afterEach(() => {
    resetDbCircuit();
    vi.restoreAllMocks();
  });

  it('falls back immediately on P1001 rejection, opens circuit, and skips next DB call', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const p1001Err = Object.assign(new Error("Can't reach database server"), { code: 'P1001' });
    const failingQuery = vi.fn().mockRejectedValue(p1001Err);
    const fallbackFn = vi.fn().mockResolvedValue(['fallback-data']);

    const firstResult = await runDbQuery(failingQuery, fallbackFn, { label: 'test:p1001' });
    expect(firstResult).toEqual(['fallback-data']);
    expect(failingQuery).toHaveBeenCalledTimes(1);
    expect(fallbackFn).toHaveBeenCalledTimes(1);
    expect(isDbCircuitOpen()).toBe(true);

    const secondQuery = vi.fn().mockResolvedValue(['live-data']);
    const secondResult = await runDbQuery(secondQuery, fallbackFn, { label: 'test:circuit-open' });
    expect(secondResult).toEqual(['fallback-data']);
    expect(secondQuery).not.toHaveBeenCalled();
    expect(fallbackFn).toHaveBeenCalledTimes(2);
  });

  it('falls back cleanly on timeout without leaving unhandled rejections', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    let rejectSlow!: (err: Error) => void;
    const slowQuery = vi.fn(
      () =>
        new Promise<string>((_, reject) => {
          rejectSlow = reject;
        })
    );
    const fallbackFn = vi.fn().mockResolvedValue('timeout-fallback');

    const res = await runDbQuery(slowQuery, fallbackFn, { timeoutMs: 25, label: 'test:timeout' });
    expect(res).toBe('timeout-fallback');
    expect(isDbCircuitOpen()).toBe(true);

    // Trigger late rejection after timeout won the race to ensure zero UnhandledPromiseRejection.
    rejectSlow(new Error('late P1001'));
    await new Promise((r) => setTimeout(r, 10));
  });
});
