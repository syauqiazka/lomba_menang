'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  ProvinceTrendRow,
  TrendCategory,
  TrendRange,
  TrendsResponse,
} from '@/types/trends';
import { TrendChart } from './TrendChart';

interface TrendsDashboardProps {
  initialData: TrendsResponse;
}

const CATEGORY_TABS: Array<{ key: TrendCategory; label: string; color: string }> = [
  { key: 'ALL', label: 'Semua Bencana', color: '#0f172a' },
  { key: 'FLOOD', label: 'Banjir', color: '#2563eb' },
  { key: 'LANDSLIDE', label: 'Longsor & Akses', color: '#d97706' },
  { key: 'EARTHQUAKE', label: 'Gempabumi', color: '#dc2626' },
  { key: 'EXTREME_WEATHER', label: 'Cuaca Ekstrem', color: '#7c3aed' },
  { key: 'VOLCANO', label: 'Gunung Api', color: '#be123c' },
  { key: 'OTHER', label: 'Karhutla (Titik Panas)', color: '#ea580c' },
];

const RANGE_OPTIONS: TrendRange[] = [7, 30, 90, 365];

type SortKey = 'name' | 'count7d' | 'pctVsPrevWeek' | 'count30d' | 'pctVsPrevYear' | 'report';

function escapeCsv(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function triggerCsvDownload(filename: string, csvBody: string) {
  const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatComparisonText(
  pct: number | null,
  ratio: number | null,
  curr: number,
  prev: number
): string {
  if (ratio !== null) return `${ratio.toLocaleString('id-ID')}× lipat`;
  if (pct === null) return curr > 0 && prev === 0 ? `+${curr} baru` : '—';
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

export function TrendsDashboard({ initialData }: TrendsDashboardProps) {
  const [data, setData] = useState<TrendsResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count7d');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const clientCacheRef = useRef<Map<string, TrendsResponse>>(
    new Map([[`${initialData.category}|${initialData.rangeDays}`, initialData]])
  );

  const fetchTrends = async (category: TrendCategory, rangeDays: TrendRange) => {
    const cacheKey = `${category}|${rangeDays}`;
    const cached = clientCacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`/api/trends?category=${category}&range=${rangeDays}`);
      if (!resp.ok) return;
      const nextData = (await resp.json()) as TrendsResponse;
      clientCacheRef.current.set(cacheKey, nextData);
      setData(nextData);
    } catch (error) {
      console.error('Gagal memuat data tren:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const maxProv7d = useMemo(() => {
    let m = 1;
    for (const p of data.provinces) {
      if (p.count7d > m) m = p.count7d;
    }
    return m;
  }, [data.provinces]);

  const maxTopDiff = useMemo(() => {
    let m = 1;
    for (const p of data.topIncreases) {
      const v = data.hasPrevYearComparison ? p.diff7d : p.count7d;
      if (v > m) m = v;
    }
    return m;
  }, [data.topIncreases, data.hasPrevYearComparison]);

  const sortedProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? data.provinces.filter(
          (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        )
      : [...data.provinces];

    const reportRank: Record<ProvinceTrendRow['reportStatus'], number> = {
      WORSENING_STREAK: 5,
      WORSENING: 4,
      STABLE: 3,
      IMPROVING: 2,
      IMPROVING_STREAK: 1,
      NO_DATA: 0,
    };

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name, 'id');
      } else if (sortKey === 'count7d') {
        cmp = a.count7d - b.count7d;
      } else if (sortKey === 'pctVsPrevWeek') {
        cmp = (a.pctVsPrevWeek ?? -999999) - (b.pctVsPrevWeek ?? -999999);
      } else if (sortKey === 'count30d') {
        cmp = a.count30d - b.count30d;
      } else if (sortKey === 'pctVsPrevYear') {
        cmp = (a.pctVsPrevYear ?? -999999) - (b.pctVsPrevYear ?? -999999);
      } else {
        cmp = reportRank[a.reportStatus] - reportRank[b.reportStatus];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [data.provinces, searchQuery, sortKey, sortDir]);

  const handleDownloadDailyCsv = () => {
    const header = ['Tanggal_WIB', 'Label', data.unitLabel, 'Periode_Sama_Tahun_Lalu'];
    const rows = data.dailySeries.map((pt) =>
      [pt.date, pt.label, pt.count, pt.prevYearCount ?? ''].map(escapeCsv).join(',')
    );
    triggerCsvDownload(
      `tren-harian-${data.category.toLowerCase()}-${data.rangeDays}hari.csv`,
      [header.join(','), ...rows].join('\r\n')
    );
  };

  const handleDownloadProvincesCsv = () => {
    const header = [
      'Kode_BPS',
      'Provinsi',
      '7_Hari',
      '7_Hari_Sebelumnya',
      'Selisih_Mingguan',
      'Persen_vs_Minggu_Lalu',
      '30_Hari',
      '7_Hari_Tahun_Lalu',
      'Rasio_atau_Persen_Tahun_Lalu',
      'Rapor_4_Minggu',
    ];
    const rows = data.provinces.map((p) =>
      [
        p.code,
        p.name,
        p.count7d,
        p.prev7d,
        p.diff7d,
        p.pctVsPrevWeek ?? '',
        p.count30d,
        p.prevYear7d,
        formatComparisonText(p.pctVsPrevYear, p.ratioVsPrevYear, p.count7d, p.prevYear7d),
        p.reportLabel,
      ]
        .map(escapeCsv)
        .join(',')
    );
    triggerCsvDownload(
      `tren-38-provinsi-${data.category.toLowerCase()}.csv`,
      [header.join(','), ...rows].join('\r\n')
    );
  };

  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' ▼' : ' ▲';
  };

  return (
    <div className="space-y-6">
      {/* Header + Category Filter Pills */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 id="trends-heading" className="font-display font-bold text-3xl md:text-4xl text-primary">
              Tren Bencana Nasional
            </h1>
            <p className="text-secondary-text text-base mt-2 max-w-3xl">
              Grafik kejadian bencana harian lintas wilayah, perbandingan terhadap minggu dan tahun sebelumnya, serta rapor tren 38 provinsi Indonesia.
            </p>
          </div>
          <Link
            href="/peta"
            className="text-sm font-medium text-primary underline hover:text-black whitespace-nowrap flex-shrink-0"
          >
            Buka Peta Interaktif →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Pilih kategori bencana">
          {CATEGORY_TABS.map((tab) => {
            const active = data.category === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={loading}
                onClick={() => void fetchTrends(tab.key, data.rangeDays)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-60 ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-primary hover:bg-secondary-background'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/80"
                  style={{ backgroundColor: tab.color }}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Top 3 KPI Summary Cards */}
      <section aria-label="Ringkasan 7 hari terakhir" className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-xs font-medium text-secondary-text">7 hari terakhir</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-primary">
              {data.summary.last7dCount.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-secondary-text">{data.unitLabel}</span>
          </p>
          <p className="mt-2 text-xs text-secondary-text">{data.periodLabels.current7d}</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-xs font-medium text-secondary-text">Dibanding minggu lalu</p>
          {data.hasPrevYearComparison ? (
            <>
              <p
                className={`mt-2 font-display font-bold text-3xl ${
                  (data.summary.pctVsPrevWeek ?? 0) > 0
                    ? 'text-[#ea580c]'
                    : (data.summary.pctVsPrevWeek ?? 0) < 0
                      ? 'text-[#15803d]'
                      : 'text-primary'
                }`}
              >
                {(data.summary.pctVsPrevWeek ?? 0) > 0 ? '▲ ' : (data.summary.pctVsPrevWeek ?? 0) < 0 ? '▼ ' : ''}
                {formatComparisonText(
                  data.summary.pctVsPrevWeek,
                  null,
                  data.summary.last7dCount,
                  data.summary.prev7dCount
                )}
              </p>
              <p className="mt-2 text-xs text-secondary-text">
                {data.summary.prev7dCount.toLocaleString('id-ID')} →{' '}
                {data.summary.last7dCount.toLocaleString('id-ID')} · {data.periodLabels.prev7d}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display font-bold text-xl text-primary">Rentang 7 hari satelit</p>
              <p className="mt-2 text-xs text-secondary-text">
                Feed FIRMS publik berjangka 7 hari; pilih 30/90/365 hari untuk tren historis.
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background p-5">
          <p className="text-xs font-medium text-secondary-text">Dibanding tahun lalu</p>
          {data.hasPrevYearComparison ? (
            <>
              <p
                className={`mt-2 font-display font-bold text-3xl ${
                  data.summary.last7dCount > data.summary.prevYear7dCount
                    ? 'text-[#ea580c]'
                    : data.summary.last7dCount < data.summary.prevYear7dCount
                      ? 'text-[#15803d]'
                      : 'text-primary'
                }`}
              >
                {data.summary.last7dCount > data.summary.prevYear7dCount
                  ? '▲ '
                  : data.summary.last7dCount < data.summary.prevYear7dCount
                    ? '▼ '
                    : ''}
                {formatComparisonText(
                  data.summary.pctVsPrevYear,
                  data.summary.ratioVsPrevYear,
                  data.summary.last7dCount,
                  data.summary.prevYear7dCount
                )}
              </p>
              <p className="mt-2 text-xs text-secondary-text">
                {data.summary.prevYear7dCount.toLocaleString('id-ID')} →{' '}
                {data.summary.last7dCount.toLocaleString('id-ID')} · {data.periodLabels.prevYear7d}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display font-bold text-xl text-primary">Pilih 30 / 90 / 365 hari</p>
              <p className="mt-2 text-xs text-secondary-text">
                Perbandingan tahun lalu tersedia pada rentang 30, 90, dan 365 hari.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Main Daily Chart Card */}
      <section className="rounded-xl border border-border bg-background p-5 space-y-5" aria-labelledby="daily-chart-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="daily-chart-heading" className="font-display font-semibold text-lg text-primary">
              {data.categoryLabel} per hari
            </h2>
            <p className="text-xs text-secondary-text mt-0.5">
              Data sampai {data.dataUntilLabel}
              {loading ? ' · Memuat pembaruan…' : ''}
            </p>
            {data.summary.totalRangeCount === 0 && (
              <p className="text-xs text-[#b45309] mt-1">
                Tidak ada kejadian terverifikasi pada rentang {data.dailySeries[0]?.date} s/d {data.dataUntilDate}. Bandingkan dengan garis putus-putus tahun lalu atau pilih rentang 365 hari.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-secondary-background/60 p-0.5" role="group" aria-label="Pilih rentang hari">
              {RANGE_OPTIONS.map((r) => {
                const active = data.rangeDays === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={loading}
                    onClick={() => void fetchTrends(data.category, r)}
                    aria-pressed={active}
                    className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#ea580c] text-white'
                        : 'text-secondary-text hover:text-primary'
                    }`}
                  >
                    {r} hari
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleDownloadDailyCsv}
              className="min-h-[36px] px-3 py-1 rounded-lg border border-border bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors"
            >
              Unduh CSV
            </button>
          </div>
        </div>

        <TrendChart
          points={data.dailySeries}
          rangeDays={data.rangeDays}
          unitLabel={data.unitLabel}
          hasPrevYear={data.hasPrevYearComparison}
        />

        <div className="grid gap-3 md:grid-cols-3 pt-1">
          <div className="rounded-lg border border-border bg-secondary-background/40 p-3.5">
            <p className="text-xs text-secondary-text">Total {data.rangeDays} hari</p>
            <p className="font-display font-bold text-2xl text-primary mt-1">
              {data.summary.totalRangeCount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary-background/40 p-3.5">
            <p className="text-xs text-secondary-text">Rata-rata per hari</p>
            <p className="font-display font-bold text-2xl text-primary mt-1">
              {data.summary.avgPerDay.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary-background/40 p-3.5">
            <p className="text-xs text-secondary-text">Puncak harian</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display font-bold text-2xl text-primary">
                {(data.summary.peakDay?.count ?? 0).toLocaleString('id-ID')}
              </span>
              {data.summary.peakDay && (
                <span className="text-xs font-medium text-[#ea580c]">
                  {data.summary.peakDay.label}
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Top 5 Provinces with Highest Weekly Increase */}
      <section className="rounded-xl border border-border bg-background p-5 space-y-4" aria-labelledby="top-increase-heading">
        <div>
          <h2 id="top-increase-heading" className="font-display font-semibold text-lg text-primary">
            {data.hasPrevYearComparison
              ? 'Provinsi dengan kenaikan terbesar'
              : 'Provinsi dengan deteksi terbanyak (7 hari)'}
          </h2>
          <p className="text-xs text-secondary-text mt-0.5">
            {data.hasPrevYearComparison
              ? '7 hari terakhir dibanding 7 hari sebelumnya, diurutkan berdasarkan selisih kejadian.'
              : 'Akumulasi deteksi satelit NASA FIRMS 7 hari terakhir per provinsi.'}
          </p>
        </div>

        {data.topIncreases.length === 0 ? (
          <p className="text-sm text-secondary-text py-4">
            Tidak ada provinsi yang mengalami kenaikan pada 7 hari terakhir untuk kategori ini.
          </p>
        ) : (
          <div className="space-y-4">
            {data.topIncreases.map((prov, idx) => {
              const barValue = data.hasPrevYearComparison ? prov.diff7d : prov.count7d;
              const widthPct = Math.max(4, Math.round((barValue / maxTopDiff) * 100));
              const pctText =
                prov.pctVsPrevWeek === null
                  ? 'Baru'
                  : prov.pctVsPrevWeek > 0
                    ? `+${prov.pctVsPrevWeek}%`
                    : `${prov.pctVsPrevWeek}%`;

              return (
                <div key={prov.code} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-orange-50 border border-orange-200 text-[#ea580c] text-xs font-bold inline-flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <Link
                        href={`/peta?prov=${encodeURIComponent(prov.code)}`}
                        className="font-medium text-sm text-primary hover:text-[#ea580c] hover:underline truncate"
                      >
                        {prov.name}
                      </Link>
                    </div>
                    <span className="font-display font-bold text-sm text-[#ea580c] whitespace-nowrap">
                      +{barValue.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-secondary-background overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#ea580c]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-secondary-text">
                    <span>
                      {data.hasPrevYearComparison
                        ? `${prov.prev7d.toLocaleString('id-ID')} → ${prov.count7d.toLocaleString('id-ID')} ${data.unitLabel}`
                        : `${prov.count7d.toLocaleString('id-ID')} ${data.unitLabel}`}
                    </span>
                    {data.hasPrevYearComparison && <span>{pctText}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* All 38 Provinces Sortable Table + 4-Week Report */}
      <section className="rounded-xl border border-border bg-background p-5 space-y-4" aria-labelledby="all-provinces-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="all-provinces-heading" className="font-display font-semibold text-lg text-primary">
              Semua provinsi
            </h2>
            <p className="text-xs text-secondary-text mt-0.5">
              {sortedProvinces.length} dari {data.provinces.length} provinsi · klik judul kolom untuk mengurutkan
            </p>
            {data.hasPrevYearComparison && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-[#c2410c] border border-orange-200">
                  ▲ {data.streakCounts.worseStreak2Plus} provinsi memburuk 2+ minggu beruntun
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-[#047857] border border-emerald-200">
                  ▼ {data.streakCounts.betterStreak2Plus} provinsi membaik 2+ minggu beruntun
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari provinsi…"
              aria-label="Cari provinsi pada tabel tren"
              className="min-h-[40px] px-3 py-1.5 border border-border rounded-lg bg-background text-sm text-primary placeholder:text-secondary-text focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleDownloadProvincesCsv}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors whitespace-nowrap"
            >
              Unduh CSV ({data.provinces.length} provinsi)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[540px] overflow-y-auto border border-border rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-secondary-background border-b border-border text-xs text-secondary-text z-10">
              <tr>
                <th className="py-2.5 px-3 font-medium">
                  <button type="button" onClick={() => handleSort('name')} className="hover:text-primary">
                    Provinsi{renderSortArrow('name')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-medium text-right">
                  <button type="button" onClick={() => handleSort('count7d')} className="hover:text-primary">
                    7 hari{renderSortArrow('count7d')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-medium text-right">
                  <button type="button" onClick={() => handleSort('pctVsPrevWeek')} className="hover:text-primary">
                    vs minggu lalu{renderSortArrow('pctVsPrevWeek')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-medium text-right">
                  <button type="button" onClick={() => handleSort('count30d')} className="hover:text-primary">
                    30 hari{renderSortArrow('count30d')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-medium text-right">
                  <button type="button" onClick={() => handleSort('pctVsPrevYear')} className="hover:text-primary">
                    vs tahun lalu{renderSortArrow('pctVsPrevYear')}
                  </button>
                </th>
                <th className="py-2.5 px-3 font-medium">
                  <button type="button" onClick={() => handleSort('report')} className="hover:text-primary">
                    Rapor 4 minggu{renderSortArrow('report')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedProvinces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-secondary-text">
                    <p className="font-medium text-primary mb-2">
                      Tidak ada provinsi yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-primary hover:bg-secondary-background transition-colors"
                    >
                      Reset pencarian
                    </button>
                  </td>
                </tr>
              ) : (
                sortedProvinces.map((prov) => {
                const maxWeek = Math.max(1, ...prov.weekly4);
                const weekBadgeClass =
                  prov.pctVsPrevWeek === null
                    ? 'bg-slate-100 text-slate-700'
                    : prov.pctVsPrevWeek > 0
                      ? 'bg-orange-50 text-[#c2410c]'
                      : prov.pctVsPrevWeek < 0
                        ? 'bg-emerald-50 text-[#047857]'
                        : 'bg-slate-100 text-slate-700';

                const yearIncreased = prov.count7d > prov.prevYear7d;
                const yearDecreased = prov.count7d < prov.prevYear7d;
                const yearBadgeClass = yearIncreased
                  ? 'bg-orange-50 text-[#c2410c]'
                  : yearDecreased
                    ? 'bg-emerald-50 text-[#047857]'
                    : 'bg-slate-100 text-slate-700';

                const reportBadgeClass =
                  prov.reportStatus === 'WORSENING' || prov.reportStatus === 'WORSENING_STREAK'
                    ? 'bg-orange-50 text-[#c2410c] border-orange-200'
                    : prov.reportStatus === 'IMPROVING' || prov.reportStatus === 'IMPROVING_STREAK'
                      ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <tr key={prov.code} className="hover:bg-secondary-background/50">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3 min-w-[190px]">
                        <Link
                          href={`/peta?prov=${encodeURIComponent(prov.code)}`}
                          className="font-medium text-primary hover:text-[#ea580c] hover:underline whitespace-nowrap"
                        >
                          {prov.name} →
                        </Link>
                        <div className="hidden sm:block flex-1 h-1.5 rounded-full bg-secondary-background max-w-[90px] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#ea580c]"
                            style={{
                              width: `${prov.count7d > 0 ? Math.max(6, Math.round((prov.count7d / maxProv7d) * 100)) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary whitespace-nowrap">
                      {prov.count7d.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {data.hasPrevYearComparison ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${weekBadgeClass}`}>
                          {formatComparisonText(prov.pctVsPrevWeek, null, prov.count7d, prov.prev7d)}
                        </span>
                      ) : (
                        <span className="text-xs text-secondary-text">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-primary whitespace-nowrap">
                      {data.hasPrevYearComparison ? prov.count30d.toLocaleString('id-ID') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {data.hasPrevYearComparison ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${yearBadgeClass}`}>
                          {formatComparisonText(
                            prov.pctVsPrevYear,
                            prov.ratioVsPrevYear,
                            prov.count7d,
                            prov.prevYear7d
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-secondary-text">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-end gap-0.5 h-4 w-7 flex-shrink-0" aria-hidden="true">
                          {prov.weekly4.map((wVal, wi) => {
                            const hPct = wVal > 0 ? Math.max(20, Math.round((wVal / maxWeek) * 100)) : 12;
                            const isLatest = wi === 3;
                            const barColor = !isLatest
                              ? 'bg-slate-300'
                              : prov.reportStatus.startsWith('WORSENING')
                                ? 'bg-[#ea580c]'
                                : prov.reportStatus.startsWith('IMPROVING')
                                  ? 'bg-[#059669]'
                                  : 'bg-slate-400';
                            return (
                              <span
                                key={wi}
                                className={`w-1.5 rounded-t-sm ${barColor}`}
                                style={{ height: `${hPct}%` }}
                              />
                            );
                          })}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${reportBadgeClass}`}>
                          {prov.reportLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Verified Sources Note */}
      <footer className="rounded-xl border border-border bg-secondary-background/50 p-4 text-xs text-secondary-text space-y-1">
        <p>
          <strong className="text-primary">Sumber Data Terverifikasi:</strong> {data.sourceSummary}
        </p>
        <p>
          Status feed: USGS ({data.liveStatus.usgs}), NASA EONET ({data.liveStatus.eonet}), GDACS UN/EC ({data.liveStatus.gdacs}), NASA FIRMS 7d ({data.liveStatus.nasaFirms7d}), BNPB ({data.liveStatus.bnpbWeekly}), BMKG ({data.liveStatus.bmkg}), PVMBG MAGMA ({data.liveStatus.magmaVolcano}).
        </p>
      </footer>
    </div>
  );
}
