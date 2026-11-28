'use client';

import { useMemo, useState } from 'react';
import type { DailyTrendPoint } from '@/types/trends';

interface TrendChartProps {
  points: DailyTrendPoint[];
  rangeDays: number;
  unitLabel: string;
  hasPrevYear: boolean;
}

const VB_W = 840;
const VB_H = 300;
const PAD_L = 52;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 34;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

function niceMaxAndStep(rawMax: number): { maxY: number; step: number } {
  const safeMax = Math.max(4, rawMax);
  const roughStep = safeMax / 4;
  const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / pow10;
  let niceNorm = 1;
  if (norm > 5) niceNorm = 10;
  else if (norm > 2.5) niceNorm = 5;
  else if (norm > 1.5) niceNorm = 2.5;
  else if (norm > 1) niceNorm = 2;
  const step = Math.max(1, Math.round(niceNorm * pow10));
  const maxY = Math.max(step * 4, Math.ceil(safeMax / step) * step);
  return { maxY, step };
}

function buildSmoothPath(coords: Array<[number, number]>): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const dx = (x1 - x0) * 0.42;
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const cy0 = Math.max(minY, Math.min(maxY, y0));
    const cy1 = Math.max(minY, Math.min(maxY, y1));
    d += ` C ${(x0 + dx).toFixed(1)} ${cy0.toFixed(1)}, ${(x1 - dx).toFixed(1)} ${cy1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

export function TrendChart({ points, rangeDays, unitLabel, hasPrevYear }: TrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartGeometry = useMemo(() => {
    if (points.length === 0) {
      return {
        maxY: 4,
        yTicks: [0, 1, 2, 3, 4],
        xTickIndices: [] as number[],
        primaryCoords: [] as Array<[number, number]>,
        prevCoords: [] as Array<[number, number]>,
        linePath: '',
        areaPath: '',
        prevPath: '',
      };
    }

    let rawMax = 0;
    for (const p of points) {
      if (p.count > rawMax) rawMax = p.count;
      if (hasPrevYear && typeof p.prevYearCount === 'number' && p.prevYearCount > rawMax) {
        rawMax = p.prevYearCount;
      }
    }
    const { maxY, step } = niceMaxAndStep(rawMax);
    const yTicks: number[] = [];
    for (let v = 0; v <= maxY; v += step) yTicks.push(v);

    const n = points.length;
    const xAt = (i: number) => (n === 1 ? PAD_L + PLOT_W / 2 : PAD_L + (i / (n - 1)) * PLOT_W);
    const yAt = (val: number) => PAD_T + PLOT_H - (Math.max(0, val) / maxY) * PLOT_H;

    const primaryCoords: Array<[number, number]> = points.map((p, i) => [xAt(i), yAt(p.count)]);
    const prevCoords: Array<[number, number]> = hasPrevYear
      ? points.map((p, i) => [xAt(i), yAt(p.prevYearCount ?? 0)])
      : [];

    const linePath = buildSmoothPath(primaryCoords);
    const baselineY = (PAD_T + PLOT_H).toFixed(1);
    const areaPath = linePath
      ? `${linePath} L ${primaryCoords[primaryCoords.length - 1][0].toFixed(1)} ${baselineY} L ${primaryCoords[0][0].toFixed(1)} ${baselineY} Z`
      : '';
    const prevPath = hasPrevYear && prevCoords.length > 0 ? buildSmoothPath(prevCoords) : '';

    const desiredTicks = Math.min(n, 9);
    const xTickIndices: number[] = [];
    if (desiredTicks <= 1) {
      xTickIndices.push(0);
    } else {
      for (let t = 0; t < desiredTicks; t++) {
        const idx = Math.round((t / (desiredTicks - 1)) * (n - 1));
        if (!xTickIndices.includes(idx)) xTickIndices.push(idx);
      }
    }

    return {
      maxY,
      yTicks,
      xTickIndices,
      primaryCoords,
      prevCoords,
      linePath,
      areaPath,
      prevPath,
    };
  }, [points, hasPrevYear]);

  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const activeCoord =
    hoverIdx !== null && chartGeometry.primaryCoords[hoverIdx]
      ? chartGeometry.primaryCoords[hoverIdx]
      : null;
  const activePrevCoord =
    hoverIdx !== null && chartGeometry.prevCoords[hoverIdx]
      ? chartGeometry.prevCoords[hoverIdx]
      : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VB_W;
    const clamped = Math.max(PAD_L, Math.min(PAD_L + PLOT_W, relX));
    const ratio = (clamped - PAD_L) / PLOT_W;
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary-text">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 rounded bg-[#ea580c]" aria-hidden="true" />
          <span className="font-medium text-primary">{rangeDays} hari terakhir</span>
        </span>
        {hasPrevYear && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#64748b]" aria-hidden="true" />
            <span>Periode sama tahun lalu</span>
          </span>
        )}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label={`Grafik tren harian ${rangeDays} hari terakhir`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Ticks */}
          {chartGeometry.yTicks.map((tickVal) => {
            const y = PAD_T + PLOT_H - (tickVal / chartGeometry.maxY) * PLOT_H;
            return (
              <g key={`y-${tickVal}`}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + PLOT_W}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#64748b] text-[11px] font-mono"
                >
                  {tickVal.toLocaleString('id-ID')}
                </text>
              </g>
            );
          })}

          {/* Area & Primary Curve */}
          {chartGeometry.areaPath && (
            <path d={chartGeometry.areaPath} fill="url(#trendAreaGrad)" />
          )}

          {chartGeometry.prevPath && (
            <path
              d={chartGeometry.prevPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="1.8"
              strokeDasharray="4 4"
            />
          )}

          {chartGeometry.linePath && (
            <path
              d={chartGeometry.linePath}
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* X-Axis Labels */}
          {chartGeometry.xTickIndices.map((idx) => {
            const pt = points[idx];
            const coord = chartGeometry.primaryCoords[idx];
            if (!pt || !coord) return null;
            return (
              <text
                key={`x-${pt.date}`}
                x={coord[0]}
                y={PAD_T + PLOT_H + 20}
                textAnchor="middle"
                className="fill-[#64748b] text-[11px]"
              >
                {pt.label}
              </text>
            );
          })}

          {/* Hover Crosshair & Points */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord[0]}
                y1={PAD_T}
                x2={activeCoord[0]}
                y2={PAD_T + PLOT_H}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {activePrevCoord && (
                <circle
                  cx={activePrevCoord[0]}
                  cy={activePrevCoord[1]}
                  r="4"
                  fill="#ffffff"
                  stroke="#64748b"
                  strokeWidth="2"
                />
              )}
              <circle
                cx={activeCoord[0]}
                cy={activeCoord[1]}
                r="5"
                fill="#ea580c"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {activePoint && activeCoord && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-border bg-background px-3 py-2 text-xs min-w-[175px]"
            style={{
              left: `${Math.min(72, Math.max(8, (activeCoord[0] / VB_W) * 100 - 10))}%`,
            }}
          >
            <p className="font-semibold text-primary">{activePoint.label} ({activePoint.date})</p>
            <p className="text-primary mt-1">
              Periode ini:{' '}
              <strong className="text-[#ea580c] font-mono">
                {activePoint.count.toLocaleString('id-ID')}
              </strong>{' '}
              {unitLabel}
            </p>
            {hasPrevYear && typeof activePoint.prevYearCount === 'number' && (
              <p className="text-secondary-text mt-0.5">
                Tahun lalu:{' '}
                <strong className="text-primary font-mono">
                  {activePoint.prevYearCount.toLocaleString('id-ID')}
                </strong>{' '}
                {unitLabel}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
