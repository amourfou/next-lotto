"use client";

import React, { useMemo } from "react";

const SUM_RANGE = { min: 21, max: 255 };
const SUM_CHART = { xMin: 21, xMax: 255, width: 600, height: 220, padding: { top: 20, right: 20, bottom: 36, left: 44 } };

type SumBarItem = { sum: number; count: number; x: number; w: number; h: number };

export type SumHistogramChartProps = {
  histogram: Record<number, number>;
  avg: number;
  sumMin?: number | null;
  sumMax?: number | null;
  setSumMin?: (v: number | null) => void;
  setSumMax?: (v: number | null) => void;
  showFilter?: boolean;
};

export function SumHistogramChart({ histogram, avg, sumMin, sumMax, setSumMin, setSumMax, showFilter }: SumHistogramChartProps) {
  const { xMin, xMax, width, height, padding } = SUM_CHART;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { maxCount, std } = useMemo(() => {
    let totalCount = 0;
    let maxCount = 0;
    for (const [, c] of Object.entries(histogram)) {
      totalCount += c;
      if (c > maxCount) maxCount = c;
    }
    let variance = 0;
    for (const [sumStr, c] of Object.entries(histogram)) {
      const sumVal = parseInt(sumStr, 10);
      variance += (sumVal - avg) ** 2 * c;
    }
    variance = totalCount > 0 ? variance / totalCount : 0;
    const std = Math.sqrt(variance);
    return { maxCount: maxCount || 1, std };
  }, [histogram, avg]);

  const xScale = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - (v / maxCount) * chartHeight;

  const barWidth = (chartWidth / (xMax - xMin + 1)) * 0.88;
  const bars = useMemo(() => {
    const out: SumBarItem[] = [];
    for (let sum = xMin; sum <= xMax; sum++) {
      const count = histogram[sum] ?? 0;
      const x = xScale(sum) - barWidth / 2;
      const w = Math.max(0.5, barWidth);
      const h = count > 0 ? Math.max(2, (count / maxCount) * chartHeight) : 0;
      out.push({ sum, count, x, w, h });
    }
    return out;
  }, [histogram, maxCount, chartHeight, xScale, barWidth]);

  const avgX = xScale(avg);
  const avgM1X = xScale(Math.max(xMin, avg - std));
  const avgP1X = xScale(Math.min(xMax, avg + std));
  const minX = sumMin != null ? xScale(sumMin) : null;
  const maxX = sumMax != null ? xScale(sumMax) : null;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="text-slate-400" style={{ minWidth: width }}>
          <defs>
            <linearGradient id="sumBarFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="rgb(148, 163, 184)" stopOpacity="0.5" />
              <stop offset="1" stopColor="rgb(100, 116, 139)" />
            </linearGradient>
            {showFilter && (
              <linearGradient id="sumFilterZone" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgb(59, 130, 246)" stopOpacity="0.08" />
                <stop offset="1" stopColor="rgb(59, 130, 246)" stopOpacity="0.08" />
              </linearGradient>
            )}
          </defs>
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="currentColor" strokeWidth="1" opacity="0.6" />
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={padding.left} y1={yScale(t * maxCount)} x2={padding.left + chartWidth} y2={yScale(t * maxCount)} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.35" />
              <text x={padding.left - 6} y={yScale(t * maxCount) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.8">{Math.round(t * maxCount)}</text>
            </g>
          ))}
          {[21, 84, 147, 210, 255].map((s) => (
            <text key={s} x={xScale(s)} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.8">{s}</text>
          ))}
          {showFilter && minX != null && maxX != null && minX < maxX && (
            <rect x={minX} y={padding.top} width={maxX - minX} height={chartHeight} fill="rgb(59, 130, 246)" fillOpacity="0.12" />
          )}
          {bars.map((b) => (
            <rect key={b.sum} x={b.x} y={yScale(b.count)} width={b.w} height={b.h} fill="url(#sumBarFill)" stroke="rgb(100, 116, 139)" strokeWidth="0.5" />
          ))}
          <line x1={avgX} y1={padding.top} x2={avgX} y2={padding.top + chartHeight} stroke="rgb(34, 197, 94)" strokeWidth="2" opacity="0.9" />
          <text x={avgX} y={padding.top - 6} textAnchor="middle" fontSize="10" fill="rgb(34, 197, 94)" fontWeight="600">평균</text>
          <line x1={avgM1X} y1={padding.top} x2={avgM1X} y2={padding.top + chartHeight} stroke="rgb(251, 191, 36)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.85" />
          <text x={avgM1X} y={height - 18} textAnchor="middle" fontSize="9" fill="rgb(251, 191, 36)" opacity="0.9">평균−1σ</text>
          <line x1={avgP1X} y1={padding.top} x2={avgP1X} y2={padding.top + chartHeight} stroke="rgb(251, 191, 36)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.85" />
          <text x={avgP1X} y={height - 18} textAnchor="middle" fontSize="9" fill="rgb(251, 191, 36)" opacity="0.9">평균+1σ</text>
          {showFilter && minX != null && (
            <>
              <line x1={minX} y1={padding.top} x2={minX} y2={padding.top + chartHeight} stroke="rgb(59, 130, 246)" strokeWidth="2" opacity="0.95" />
              <text x={minX} y={padding.top - 6} textAnchor="middle" fontSize="10" fill="rgb(59, 130, 246)" fontWeight="600">최소</text>
            </>
          )}
          {showFilter && maxX != null && (
            <>
              <line x1={maxX} y1={padding.top} x2={maxX} y2={padding.top + chartHeight} stroke="rgb(239, 68, 68)" strokeWidth="2" opacity="0.95" />
              <text x={maxX} y={padding.top - 6} textAnchor="middle" fontSize="10" fill="rgb(239, 68, 68)" fontWeight="600">최대</text>
            </>
          )}
        </svg>
      </div>
      {showFilter && setSumMin != null && setSumMax != null && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1">합계 최소 (21~255)</label>
            <input
              type="range"
              min={SUM_RANGE.min}
              max={SUM_RANGE.max}
              value={sumMin ?? SUM_RANGE.min}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setSumMin(Number.isNaN(v) ? null : v);
              }}
              className="w-full h-2 rounded-lg appearance-none bg-slate-600 accent-blue-500"
            />
            <input
              type="number"
              min={SUM_RANGE.min}
              max={SUM_RANGE.max}
              value={sumMin ?? ""}
              onChange={(e) => {
                if (e.target.value === "") { setSumMin(null); return; }
                const v = parseInt(e.target.value, 10);
                setSumMin(Number.isNaN(v) ? null : Math.max(SUM_RANGE.min, Math.min(SUM_RANGE.max, v)));
              }}
              className="mt-1 w-full rounded-lg bg-slate-700 text-white px-2 py-1 text-sm [appearance:textfield]"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1">합계 최대 (21~255)</label>
            <input
              type="range"
              min={SUM_RANGE.min}
              max={SUM_RANGE.max}
              value={sumMax ?? SUM_RANGE.max}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setSumMax(Number.isNaN(v) ? null : v);
              }}
              className="w-full h-2 rounded-lg appearance-none bg-slate-600 accent-red-500"
            />
            <input
              type="number"
              min={SUM_RANGE.min}
              max={SUM_RANGE.max}
              value={sumMax ?? ""}
              onChange={(e) => {
                if (e.target.value === "") { setSumMax(null); return; }
                const v = parseInt(e.target.value, 10);
                setSumMax(Number.isNaN(v) ? null : Math.max(SUM_RANGE.min, Math.min(SUM_RANGE.max, v)));
              }}
              className="mt-1 w-full rounded-lg bg-slate-700 text-white px-2 py-1 text-sm [appearance:textfield]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
