"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";

const SUM_RANGE = { min: 21, max: 255 };
const SUM_CHART = { xMin: 21, xMax: 255, width: 600, height: 220, padding: { top: 20, right: 20, bottom: 36, left: 44 } };
const TREND_HEIGHT = 330;
const TREND_PAD = { top: 4, right: 20, bottom: 36, left: 44 };
const TREND_RIGHT_W = 36; // 오른쪽 고정 레이블 영역 너비

type SumBarItem = { sum: number; count: number; x: number; w: number; h: number };

export type SumHistogramChartProps = {
  histogram: Record<number, number>;
  avg: number;
  sumMin?: number | null;
  sumMax?: number | null;
  setSumMin?: (v: number | null) => void;
  setSumMax?: (v: number | null) => void;
  showFilter?: boolean;
  rounds?: { round: number; sum: number }[];
};

export function SumHistogramChart({ histogram, avg, sumMin, sumMax, setSumMin, setSumMax, showFilter, rounds }: SumHistogramChartProps) {
  const [chartTab, setChartTab] = useState<"dist" | "trend">("dist");
  const [spacing, setSpacing] = useState(2);
  const [viewScroll, setViewScroll] = useState(0);
  const [containerW, setContainerW] = useState(600);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const { xMin, xMax, width: distWidth, height, padding } = SUM_CHART;
  const chartWidth = distWidth - padding.left - padding.right;
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

  // 분포 그래프: viewBox 기반 고정 표시
  const xScale = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * chartWidth;
  const yScale = (v: number) => padding.top + chartHeight - (v / maxCount) * chartHeight;

  const bars = useMemo(() => {
    const bw = (chartWidth / (xMax - xMin + 1)) * 0.88;
    const out: SumBarItem[] = [];
    for (let sum = xMin; sum <= xMax; sum++) {
      const count = histogram[sum] ?? 0;
      const x = padding.left + ((sum - xMin) / (xMax - xMin)) * chartWidth - bw / 2;
      const w = Math.max(0.5, bw);
      const h = count > 0 ? Math.max(2, (count / maxCount) * chartHeight) : 0;
      out.push({ sum, count, x, w, h });
    }
    return out;
  }, [histogram, maxCount, chartHeight, chartWidth]);

  const avgX = xScale(avg);
  const avgM1X = xScale(Math.max(xMin, avg - std));
  const avgP1X = xScale(Math.min(xMax, avg + std));
  const distMinX = sumMin != null ? xScale(sumMin) : null;
  const distMaxX = sumMax != null ? xScale(sumMax) : null;

  // 정적: x축 위치, SVG 너비 (spacing/rounds 변경 시만 재계산)
  const trendStatic = useMemo(() => {
    if (!rounds || rounds.length === 0) return null;
    const sorted = [...rounds].sort((a, b) => a.round - b.round);
    const tH = TREND_HEIGHT - TREND_PAD.top - TREND_PAD.bottom;
    const rMin = sorted[0].round;
    const rMax = sorted[sorted.length - 1].round;
    const sp = Math.max(1, spacing);
    const chartW = Math.max(1, rMax - rMin) * sp + 36; // Y축 제외 차트 전용 너비
    const svgW = TREND_PAD.left + chartW;              // 스크롤바용 전체 너비
    const xS = (r: number) => (r - rMin) * sp;         // Y축 없는 차트 상대 x
    const labelStep = Math.max(1, Math.ceil(100 / sp));
    const xLabels: { round: number; x: number }[] = [];
    for (let i = 0; i < sorted.length; i += labelStep)
      xLabels.push({ round: sorted[i].round, x: xS(sorted[i].round) });
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      if (xLabels.length === 0 || xLabels[xLabels.length - 1].round !== last.round)
        xLabels.push({ round: last.round, x: xS(last.round) });
    }
    const pointsX = sorted.map(d => ({ round: d.round, sum: d.sum, x: xS(d.round) }));
    return { sorted, pointsX, svgW, chartW, tH, rMin, rMax, xLabels };
  }, [rounds, spacing, height]);

  // 동적: Y축 스케일 (스크롤 위치에 따라 보이는 값의 최대최소 기준)
  const trendDynamic = useMemo(() => {
    if (!trendStatic) return null;
    const { sorted, pointsX, svgW, tH, rMin } = trendStatic;
    const sp = Math.max(1, spacing);
    const visRoundStart = rMin + Math.floor(viewScroll / sp) - 1;
    const visRoundEnd = rMin + Math.ceil((viewScroll + containerW) / sp) + 1;
    const visible = sorted.filter(d => d.round >= visRoundStart && d.round <= visRoundEnd);
    const baseSums = visible.length > 0 ? visible.map(d => d.sum) : sorted.map(d => d.sum);
    const rawMin = Math.min(...baseSums);
    const rawMax = Math.max(...baseSums);
    const tMin = rawMin === rawMax ? Math.max(21, rawMin - 5) : rawMin;
    const tMax = rawMin === rawMax ? Math.min(255, rawMax + 5) : rawMax;
    const yS = (s: number) => TREND_PAD.top + tH - ((s - tMin) / Math.max(1, tMax - tMin)) * tH;
    const yTickValues = Array.from({ length: 5 }, (_, i) => Math.round(tMin + (tMax - tMin) * i / 4));
    const yTicks = yTickValues.map(v => ({ value: v, y: yS(v) }));
    const points = pointsX.map(d => ({ ...d, y: yS(d.sum) }));
    const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
    const avgY = yS(avg);
    const avgM1Y = yS(Math.max(tMin, avg - std));
    const avgP1Y = yS(Math.min(tMax, avg + std));
    const filterMinY = sumMin != null ? yS(Math.max(tMin, sumMin)) : null;
    const filterMaxY = sumMax != null ? yS(Math.min(tMax, sumMax)) : null;
    return { points, polyline, avgY, avgM1Y, avgP1Y, filterMinY, filterMaxY, yTicks, svgW, tH };
  }, [trendStatic, viewScroll, containerW, avg, std, sumMin, sumMax, spacing]);

  // 추이 그래프 스크롤바 동기화 + viewScroll/containerW 추적
  useEffect(() => {
    if (chartTab !== "trend") return;
    const bar = scrollbarRef.current;
    const chart = scrollRef.current;
    if (!bar || !chart) return;
    setContainerW(bar.clientWidth);
    const sync = () => {
      chart.scrollLeft = bar.scrollLeft;
      setViewScroll(bar.scrollLeft);
    };
    bar.addEventListener("scroll", sync);
    const ro = new ResizeObserver(() => setContainerW(bar.clientWidth));
    ro.observe(bar);
    return () => { bar.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [chartTab, trendStatic]);

  // 탭 전환 또는 spacing/rounds 변경 시 맨 오른쪽으로 자동 스크롤
  useEffect(() => {
    if (chartTab !== "trend") return;
    const raf = requestAnimationFrame(() => {
      if (scrollbarRef.current)
        scrollbarRef.current.scrollLeft = scrollbarRef.current.scrollWidth;
    });
    return () => cancelAnimationFrame(raf);
  }, [chartTab, trendStatic]);

  return (
    <div className="space-y-2">
      {/* 탭 */}
      <div className="flex border-b border-slate-600/50">
        {(["dist", "trend"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setChartTab(tab)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors -mb-px ${
              chartTab === tab
                ? "border border-b-0 border-slate-600/50 rounded-t bg-slate-800/50 text-amber-400"
                : "border border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "dist" ? "분포 그래프" : "추이 그래프"}
          </button>
        ))}
      </div>

      {chartTab === "dist" && (
        <div className="w-full">
          <svg viewBox={`0 0 ${SUM_CHART.width} ${height}`} width="100%" height="100%" className="text-slate-400" style={{ display: "block" }}>
            <defs>
              <linearGradient id="sumBarFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="rgb(148, 163, 184)" stopOpacity="0.5" />
                <stop offset="1" stopColor="rgb(100, 116, 139)" />
              </linearGradient>
            </defs>
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <line x1={padding.left} y1={padding.top + chartHeight} x2={SUM_CHART.width - padding.right} y2={padding.top + chartHeight} stroke="currentColor" strokeWidth="1" opacity="0.6" />
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line x1={padding.left} y1={yScale(t * maxCount)} x2={SUM_CHART.width - padding.right} y2={yScale(t * maxCount)} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.35" />
                <text x={padding.left - 6} y={yScale(t * maxCount) + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.8">{Math.round(t * maxCount)}</text>
              </g>
            ))}
            {[21, 84, 147, 210, 255].map((s) => (
              <text key={s} x={xScale(s)} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.8">{s}</text>
            ))}
            {showFilter && distMinX != null && distMaxX != null && distMinX < distMaxX && (
              <rect x={distMinX} y={padding.top} width={distMaxX - distMinX} height={chartHeight} fill="rgb(59, 130, 246)" fillOpacity="0.12" />
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
            {showFilter && distMinX != null && (
              <>
                <line x1={distMinX} y1={padding.top} x2={distMinX} y2={padding.top + chartHeight} stroke="rgb(59, 130, 246)" strokeWidth="2" opacity="0.95" />
                <text x={distMinX} y={padding.top - 6} textAnchor="middle" fontSize="10" fill="rgb(59, 130, 246)" fontWeight="600">최소</text>
              </>
            )}
            {showFilter && distMaxX != null && (
              <>
                <line x1={distMaxX} y1={padding.top} x2={distMaxX} y2={padding.top + chartHeight} stroke="rgb(239, 68, 68)" strokeWidth="2" opacity="0.95" />
                <text x={distMaxX} y={padding.top - 6} textAnchor="middle" fontSize="10" fill="rgb(239, 68, 68)" fontWeight="600">최대</text>
              </>
            )}
          </svg>
        </div>
      )}

      {chartTab === "trend" && (
        <div>
          {!trendStatic || !trendDynamic ? (
            <p className="text-slate-500 text-sm text-center py-8">데이터 로드 중...</p>
          ) : (
            <div>
            {/* 차트 영역: 고정 Y축 + 스크롤 차트 + 고정 우측 레이블 */}
            <div className="flex w-full overflow-hidden">
              {/* 고정 Y축 */}
              <svg width={TREND_PAD.left} height={TREND_PAD.top + trendStatic.tH + TREND_PAD.bottom} className="shrink-0 text-slate-400" style={{ display: "block" }}>
                <line x1={TREND_PAD.left - 1} y1={TREND_PAD.top} x2={TREND_PAD.left - 1} y2={TREND_PAD.top + trendStatic.tH} stroke="currentColor" strokeWidth="1" opacity="0.6" />
                {trendDynamic.yTicks.map(({ value, y }) => (
                  <text key={value} x={TREND_PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.7">{value}</text>
                ))}
              </svg>
              {/* 스크롤 차트 (Y축·우측 레이블 제외) */}
              <div ref={scrollRef} className="flex-1 overflow-x-hidden min-w-0">
                <svg width={trendStatic.chartW} height={TREND_PAD.top + trendStatic.tH + TREND_PAD.bottom} className="text-slate-400" style={{ display: "block" }}>
                  <line x1={0} y1={TREND_PAD.top + trendStatic.tH} x2={trendStatic.chartW} y2={TREND_PAD.top + trendStatic.tH} stroke="currentColor" strokeWidth="1" opacity="0.6" />
                  {trendDynamic.yTicks.map(({ value, y }) => (
                    <line key={value} x1={0} y1={y} x2={trendStatic.chartW} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.25" />
                  ))}
                  {trendStatic.xLabels.map(({ round, x }) => (
                    <text key={round} x={x} y={TREND_PAD.top + trendStatic.tH + TREND_PAD.bottom - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">{round}</text>
                  ))}
                  <polyline points={trendDynamic.polyline} fill="none" stroke="rgb(100, 116, 139)" strokeWidth="1" opacity="0.6" />
                  {spacing >= 2 && trendDynamic.points.map(p => (
                    <circle key={p.round} cx={p.x} cy={p.y} r="1.5" fill="rgb(148, 163, 184)" opacity="0.7" />
                  ))}
                  <line x1={0} y1={trendDynamic.avgY} x2={trendStatic.chartW} y2={trendDynamic.avgY} stroke="rgb(34, 197, 94)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.9" />
                  <line x1={0} y1={trendDynamic.avgM1Y} x2={trendStatic.chartW} y2={trendDynamic.avgM1Y} stroke="rgb(251, 191, 36)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.85" />
                  <line x1={0} y1={trendDynamic.avgP1Y} x2={trendStatic.chartW} y2={trendDynamic.avgP1Y} stroke="rgb(251, 191, 36)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.85" />
                  {showFilter && trendDynamic.filterMinY != null && (
                    <line x1={0} y1={trendDynamic.filterMinY} x2={trendStatic.chartW} y2={trendDynamic.filterMinY} stroke="rgb(59, 130, 246)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.9" />
                  )}
                  {showFilter && trendDynamic.filterMaxY != null && (
                    <line x1={0} y1={trendDynamic.filterMaxY} x2={trendStatic.chartW} y2={trendDynamic.filterMaxY} stroke="rgb(239, 68, 68)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.9" />
                  )}
                </svg>
              </div>
              {/* 고정 우측 레이블 (평균·±1σ) */}
              <svg width={TREND_RIGHT_W} height={TREND_PAD.top + trendStatic.tH + TREND_PAD.bottom} className="shrink-0 text-slate-400" style={{ display: "block" }}>
                <text x={4} y={trendDynamic.avgY + 4} fontSize="10" fill="rgb(34, 197, 94)" opacity="0.9">평균</text>
                <text x={4} y={trendDynamic.avgM1Y + 4} fontSize="9" fill="rgb(251, 191, 36)" opacity="0.9">-1σ</text>
                <text x={4} y={trendDynamic.avgP1Y + 4} fontSize="9" fill="rgb(251, 191, 36)" opacity="0.9">+1σ</text>
              </svg>
            </div>
            {/* 하단 행: 스크롤바(flex-1) + 슬라이더(shrink-0) 나란히 */}
            <div className="flex items-center gap-2">
              <div style={{ width: TREND_PAD.left, flexShrink: 0 }} />
              <div ref={scrollbarRef} className="flex-1 overflow-x-scroll min-w-0" style={{ height: 12 }}>
                <div style={{ width: trendStatic.chartW, height: 1 }} />
              </div>
              <div style={{ width: TREND_RIGHT_W, flexShrink: 0 }} />
              <div className="shrink-0 flex items-center gap-1">
                <input
                  type="range" min={1} max={20} step={0.5} value={spacing}
                  onChange={e => setSpacing(parseFloat(e.target.value))}
                  className="w-32 h-1 rounded appearance-none bg-slate-700 accent-amber-400"
                />
                <span className="text-slate-500 text-[10px] w-8">{spacing}px</span>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

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
