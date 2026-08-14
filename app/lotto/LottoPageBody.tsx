"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import LottoBall from "../components/LottoBall";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "../components/NumberFilter";
import { getNumbersInGroup } from "../components/GroupExclude";
import GroupCountSelector, {
  getDefaultGroupCountRanges,
  getDefaultGroupEnabled,
  normalizeGroupCountRanges,
  sumGroupMins,
  type GroupCountRanges,
  type GroupEnabled,
} from "../components/GroupCountSelector";
import { LottoPagePart1 } from "./LottoPagePart1";
import { LottoPageMainContent } from "./LottoPageMainContent";
import { SumHistogramChart } from "../components/SumHistogramChart";

const MIN = 1;
const MAX = 45;
const PICK_COUNT = 6;
const SUM_RANGE = { min: 21, max: 255 }; // 1+2+3+4+5+6 ~ 40+41+42+43+44+45

/** 당첨 합계 히스토그램에서 확률이 낮은 양끝(기본 하위/상위 10%)을 제외한 기본 합계 범위 */
function getDefaultSumRangeFromHistogram(
  histogram: Record<number, number>,
  tailFraction = 0.1
): { defaultSumMin: number; defaultSumMax: number } {
  const sums = Object.keys(histogram)
    .map(Number)
    .filter((s) => s >= SUM_RANGE.min && s <= SUM_RANGE.max)
    .sort((a, b) => a - b);
  if (sums.length === 0) return { defaultSumMin: SUM_RANGE.min, defaultSumMax: SUM_RANGE.max };
  let total = 0;
  for (const s of sums) total += histogram[s] ?? 0;
  if (total === 0) return { defaultSumMin: SUM_RANGE.min, defaultSumMax: SUM_RANGE.max };
  const lowThreshold = tailFraction * total;
  let cum = 0;
  let defaultSumMin = sums[0];
  for (const s of sums) {
    cum += histogram[s] ?? 0;
    if (cum >= lowThreshold) {
      defaultSumMin = s;
      break;
    }
  }
  cum = 0;
  let defaultSumMax = sums[sums.length - 1];
  for (let i = sums.length - 1; i >= 0; i--) {
    const s = sums[i];
    cum += histogram[s] ?? 0;
    if (cum >= tailFraction * total) {
      defaultSumMax = s;
      break;
    }
  }
  return { defaultSumMin, defaultSumMax };
}

/** 6개 번호 세트를 정렬한 키 (당첨/추출 내역과 중복 검사용) */
function toSetKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join(",");
}

function getConsecutivePairs(nums: number[]): number {
  const arr = [...nums].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) pairs += 1;
  }
  return pairs;
}

/** 연속 구간 최장 길이 (예: 1,2,3 → 3 / 5,6·10,11 → 2) */
function getMaxConsecutiveRun(nums: number[]): number {
  const arr = [...nums].sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  return maxRun;
}

function countGroup9(nums: number[]): number {
  return nums.filter((n) => n >= 1 && n <= 9).length;
}
function countGroup45(nums: number[]): number {
  return nums.filter((n) => n >= 37 && n <= 45).length;
}

function meetsPatternConstraints(
  nums: number[],
  sumMin: number | null,
  sumMax: number | null,
  maxConsecutivePairs: number | null,
  allowedGroup9_45Keys: Set<string> | null,
  allowedOddEvenKeys: Set<string> | null,
  maxConsecutiveRun: number | null = null,
  positionLimits: PositionLimit[] | null = null
): boolean {
  if (nums.length !== PICK_COUNT) return false;
  if (allowedGroup9_45Keys != null && allowedGroup9_45Keys.size > 0) {
    const key = `${countGroup9(nums)},${countGroup45(nums)}`;
    if (!allowedGroup9_45Keys.has(key)) return false;
  }
  if (allowedOddEvenKeys != null && allowedOddEvenKeys.size > 0) {
    const evenCount = nums.filter((n) => n % 2 === 0).length;
    const key = `${evenCount},${PICK_COUNT - evenCount}`;
    if (!allowedOddEvenKeys.has(key)) return false;
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  const effSumMin = sumMin != null ? Math.max(SUM_RANGE.min, Math.min(SUM_RANGE.max, sumMin)) : null;
  const effSumMax = sumMax != null ? Math.max(SUM_RANGE.min, Math.min(SUM_RANGE.max, sumMax)) : null;
  if (effSumMin != null && sum < effSumMin) return false;
  if (effSumMax != null && sum > effSumMax) return false;
  if (maxConsecutivePairs != null && getConsecutivePairs(nums) > maxConsecutivePairs) return false;
  // maxConsecutiveRun: 연속 구간의 최대 허용 길이 (2 → 1,2 가능 / 1,2,3 불가)
  if (maxConsecutiveRun != null && getMaxConsecutiveRun(nums) > maxConsecutiveRun) return false;
  // 정렬 후 자리별 min~max (1번째=최소 번호 … 6번째=최대 번호)
  if (positionLimits != null && positionLimits.length === 6) {
    const sorted = [...nums].sort((a, b) => a - b);
    for (let i = 0; i < 6; i++) {
      const lim = positionLimits[i];
      if (!lim) continue;
      // 이론 전체 범위면 필터 스킵
      if (isFullTheoryRange(i, lim)) continue;
      const n = sorted[i]!;
      if (n < lim.min || n > lim.max) return false;
    }
  }
  return true;
}

type PrevBucketKey = "Prev1" | "Prev2" | "Prev3" | "Prev4" | "Prev5";

type PrevNumberStat = {
  overallAppearRate: number;
  overallHits: number;
  /** 전체 회차 수 (1~최신). 구버전 호환: analyzedRounds */
  totalRounds?: number;
  analyzedRounds?: number;
  byGroup: Record<
    PrevBucketKey,
    { inGroup: number; hits: number; appearRate: number }
  >;
};

type PrevBucketAnalysis = {
  startRound: number;
  endRound: number;
  analyzedRounds: number;
  nextRound: number;
  nextGroups: Record<PrevBucketKey, number[]>;
  nextWindowRounds: Record<"Prev1" | "Prev2" | "Prev3" | "Prev4", number[]>;
  groupHitCounts: Record<PrevBucketKey, number>;
  groupHitRatio: Record<PrevBucketKey, number>;
  /** 당첨 공 1개가 해당 Prev에서 나올 확률(%) */
  nextAppearProbability?: Record<PrevBucketKey, number>;
  /** 그룹 소속 번호 1개의 당첨 확률(%) */
  perNumberHitProbability?: Record<PrevBucketKey, number>;
  /** 그룹에서 1개 이상 나올 회차 비율(%) */
  atLeastOneProbability?: Record<PrevBucketKey, number>;
  avgGroupSize?: Record<PrevBucketKey, number>;
  avgPerRound: Record<PrevBucketKey, number>;
  hitCountDistribution?: Record<PrevBucketKey, Record<number, number>>;
  /** 키: "p1,p2,p3,p4,p5" 개수 구성 (합 6) */
  compositionDistribution: Record<string, number>;
  /** 번호별 전체/그룹 출현 확률 (툴팁) */
  numberStats?: Record<string, PrevNumberStat>;
};

function prevNumberTooltip(
  n: number,
  groupKey: PrevBucketKey,
  numberStats?: Record<string, PrevNumberStat>
): string {
  const st = numberStats?.[String(n)];
  if (!st) return `${n}번`;
  const g = st.byGroup?.[groupKey];
  // overall: 회차 무관 당첨 6개 포함 비율
  // byGroup: 해당 회차 Prev 그룹에 속했을 때 그 회차(다음 회차) 당첨 비율
  const totalR = st.totalRounds ?? st.analyzedRounds ?? 0;
  const overall = `전체 출현(본번호) ${st.overallAppearRate}% (${st.overallHits}/${totalR}회)`;
  const whenInGroup = g
    ? `${groupKey}일 때 다음 회차 출현(본번호) ${g.appearRate}% (${g.hits}/${g.inGroup}회)`
    : `${groupKey}일 때 다음 회차 출현(본번호) —`;
  return `${n}번\n${overall}\n${whenInGroup}`;
}

type PositionFrequencyEntry = {
  num: number;
  count: number;
  pct: number;
};

type PositionFrequencyPos = {
  position: number;
  theoryMin: number;
  theoryMax: number;
  observedMin: number;
  observedMax: number;
  entries: PositionFrequencyEntry[];
};

type PositionFrequencyAnalysis = {
  totalRounds: number;
  positions: PositionFrequencyPos[];
};

type AnalysisResult = {
  totalRounds: number;
  hot: number[];
  cold: number[];
  sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> };
  group9_45Distribution?: Record<string, number>;
  /** 5그룹(1~9·10~18·19~27·28~36·37~45)별 본번호 개수 패턴 → 건수 */
  groupPatternDistribution?: Record<string, number>;
  groupPatternRounds?: Record<string, number[]>;
  latestRound?: number;
  consecutivePattern?: {
    avgConsecutivePairs: number;
    avgMaxRun: number;
    pairDistribution: Record<number, number>;
    maxRunDistribution: Record<number, number>;
  };
  /** 직전 회차 구간(Prev1~5) 분류 및 당첨 출현 집계 */
  prevBucketAnalysis?: PrevBucketAnalysis;
  /** 정렬 6자리별 번호 출현 횟수·비율 */
  positionFrequency?: PositionFrequencyAnalysis;
  updatedAt: string;
};

/** 자리별 허용 최소~최대 (항상 두 값 설정, 이론 범위 기본) */
type PositionLimit = { min: number; max: number };

function theoryPositionRange(index: number): { min: number; max: number } {
  return { min: index + 1, max: 40 + index };
}

function defaultPositionLimits(): PositionLimit[] {
  return Array.from({ length: 6 }, (_, i) => theoryPositionRange(i));
}

/** 이론 전체 범위와 같으면 ‘제한 없음’으로 취급 (저장·표시용) */
function isFullTheoryRange(index: number, lim: PositionLimit): boolean {
  const t = theoryPositionRange(index);
  return lim.min === t.min && lim.max === t.max;
}

const PREV_BUCKET_LABELS: Record<
  PrevBucketKey,
  { title: string; window: string; color: string; ball: string }
> = {
  Prev1: {
    title: "Prev1",
    window: "직전 1~5회",
    color: "text-rose-300",
    ball: "bg-rose-500/30 text-rose-200 border-rose-500/50",
  },
  Prev2: {
    title: "Prev2",
    window: "직전 6~10회",
    color: "text-orange-300",
    ball: "bg-orange-500/30 text-orange-200 border-orange-500/50",
  },
  Prev3: {
    title: "Prev3",
    window: "직전 11~15회",
    color: "text-amber-300",
    ball: "bg-amber-500/30 text-amber-200 border-amber-500/50",
  },
  Prev4: {
    title: "Prev4",
    window: "직전 16~20회",
    color: "text-sky-300",
    ball: "bg-sky-500/30 text-sky-200 border-sky-500/50",
  },
  Prev5: {
    title: "Prev5",
    window: "그 외(미출현)",
    color: "text-emerald-300",
    ball: "bg-emerald-500/30 text-emerald-200 border-emerald-500/50",
  },
};

const PREV_BUCKET_ORDER: PrevBucketKey[] = ["Prev1", "Prev2", "Prev3", "Prev4", "Prev5"];

function getGroupKey(num: number): number {
  if (num <= 9) return 9;
  if (num <= 18) return 18;
  if (num <= 27) return 27;
  if (num <= 36) return 36;
  return 45;
}

const GROUP_BALL_STYLES: Record<
  number,
  { bg: string; text: string; border: string }
> = {
  9: { bg: "bg-amber-500/25", text: "text-amber-300", border: "border-amber-500/50" },
  18: { bg: "bg-emerald-500/25", text: "text-emerald-300", border: "border-emerald-500/50" },
  27: { bg: "bg-sky-500/25", text: "text-sky-300", border: "border-sky-500/50" },
  36: { bg: "bg-violet-500/25", text: "text-violet-300", border: "border-violet-500/50" },
  45: { bg: "bg-rose-500/25", text: "text-rose-300", border: "border-rose-500/50" },
};

type GroupPatternSortKey =
  | "pattern"
  | "count"
  | "pct"
  | "last"
  | "deltaLatest"
  | "deltaPrev"
  | "avgGap";

/** 연속 출현 회차 간격의 평균 (회차 수 2 미만이면 null) */
function avgConsecutiveRoundGap(roundsAsc: number[]): number | null {
  if (roundsAsc.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < roundsAsc.length; i++) sum += roundsAsc[i]! - roundsAsc[i - 1]!;
  return sum / (roundsAsc.length - 1);
}

function cmpOptNum(a: number | null, b: number | null, asc: boolean): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const d = a - b;
  return asc ? d : -d;
}

function GroupPatternBlock({
  analysis,
  groupPatternCutoffRound,
  setGroupPatternCutoffRound,
  groupPatternMinCount,
  setGroupPatternMinCount,
}: {
  analysis: AnalysisResult;
  groupPatternCutoffRound: number | null;
  setGroupPatternCutoffRound: (v: number | null) => void;
  groupPatternMinCount: number;
  setGroupPatternMinCount: (v: number) => void;
}) {
  const dist = analysis.groupPatternDistribution;
  const roundLists = analysis.groupPatternRounds ?? {};
  const latestRound = analysis.latestRound;
  const total = analysis.totalRounds;
  const [cutoffDraft, setCutoffDraft] = useState(() =>
    groupPatternCutoffRound === null ? "" : String(groupPatternCutoffRound)
  );
  const [minCountDraft, setMinCountDraft] = useState(() => String(groupPatternMinCount));
  const [sortKey, setSortKey] = useState<GroupPatternSortKey>("count");
  const [sortAsc, setSortAsc] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollTop = useRef<number | null>(null);

  useEffect(() => {
    setCutoffDraft(groupPatternCutoffRound === null ? "" : String(groupPatternCutoffRound));
  }, [analysis.updatedAt, groupPatternCutoffRound]);

  useEffect(() => {
    setMinCountDraft(String(groupPatternMinCount));
  }, [analysis.updatedAt, groupPatternMinCount]);

  useLayoutEffect(() => {
    if (pendingScrollTop.current != null && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = pendingScrollTop.current;
      pendingScrollTop.current = null;
    }
  }, [groupPatternCutoffRound, groupPatternMinCount, sortKey, sortAsc]);

  const onSortHeader = useCallback((key: GroupPatternSortKey) => {
    pendingScrollTop.current = tableScrollRef.current?.scrollTop ?? null;
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortAsc((a) => !a);
        return prevKey;
      }
      setSortAsc(key === "pattern");
      return key;
    });
  }, []);

  type GpRow = {
    pattern: string;
    count: number;
    pct: number;
    lastR: number | null;
    deltaLatest: number | null;
    deltaPrev: number | null;
    avgGap: number | null;
  };

  const sortedEntriesCount = useMemo(() => {
    if (!dist) return [];
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [dist]);

  const filteredEntries = useMemo(() => {
    let list = sortedEntriesCount.filter(([, count]) => count >= groupPatternMinCount);
    if (groupPatternCutoffRound != null) {
      list = list.filter(([pattern]) => {
        const roundsAsc = roundLists[pattern] ?? [];
        const lastR = roundsAsc.length > 0 ? roundsAsc[roundsAsc.length - 1] : null;
        return lastR != null && lastR >= groupPatternCutoffRound;
      });
    }
    return list;
  }, [sortedEntriesCount, groupPatternCutoffRound, groupPatternMinCount, roundLists]);

  const rows: GpRow[] = useMemo(() => {
    return filteredEntries.map(([pattern, count]) => {
      const roundsAsc = roundLists[pattern] ?? [];
      const lastR = roundsAsc.length > 0 ? roundsAsc[roundsAsc.length - 1] : null;
      const prevR = roundsAsc.length >= 2 ? roundsAsc[roundsAsc.length - 2] : null;
      const deltaLatest =
        latestRound != null && lastR != null ? latestRound - lastR : null;
      const deltaPrev =
        count >= 2 && lastR != null && prevR != null ? lastR - prevR : null;
      const avgGap = avgConsecutiveRoundGap(roundsAsc);
      return {
        pattern,
        count,
        pct: (count / total) * 100,
        lastR,
        deltaLatest,
        deltaPrev,
        avgGap,
      };
    });
  }, [filteredEntries, roundLists, latestRound, total]);

  const entries = useMemo(() => {
    const asc = sortAsc;
    const copy = [...rows];
    copy.sort((ra, rb) => {
      let d = 0;
      switch (sortKey) {
        case "pattern": {
          d = ra.pattern.localeCompare(rb.pattern, undefined, { numeric: true });
          if (!asc) d = -d;
          break;
        }
        case "count":
          d = cmpOptNum(ra.count, rb.count, asc);
          break;
        case "pct":
          d = cmpOptNum(ra.pct, rb.pct, asc);
          break;
        case "last":
          d = cmpOptNum(ra.lastR, rb.lastR, asc);
          break;
        case "deltaLatest":
          d = cmpOptNum(ra.deltaLatest, rb.deltaLatest, asc);
          break;
        case "deltaPrev":
          d = cmpOptNum(ra.deltaPrev, rb.deltaPrev, asc);
          break;
        case "avgGap":
          d = cmpOptNum(ra.avgGap, rb.avgGap, asc);
          break;
        default:
          d = 0;
      }
      if (d !== 0) return d;
      return ra.pattern.localeCompare(rb.pattern, undefined, { numeric: true });
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  if (!dist || analysis.totalRounds <= 0) return null;

  const maxCount = entries.length > 0 ? Math.max(...entries.map((r) => r.count)) : 0;

  const sortIndicator = (key: GroupPatternSortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ▲" : " ▼";
  };

  const thBtn = (key: GroupPatternSortKey, align: "left" | "right", label: string, title?: string) => (
    <th className={`px-0.5 py-1 ${align === "left" ? "text-left" : "text-right"} font-medium border-b border-slate-600`}>
      <button
        type="button"
        title={title ? `${title} (클릭하여 정렬)` : "클릭하여 정렬"}
        onClick={() => onSortHeader(key)}
        className={`inline-flex w-full items-center gap-0.5 ${align === "left" ? "justify-start" : "justify-end"} text-slate-400 hover:text-slate-200 cursor-pointer select-none`}
      >
        <span>
          {label}
          {sortIndicator(key)}
        </span>
      </button>
    </th>
  );

  const applyFilters = () => {
    const saved = tableScrollRef.current?.scrollTop ?? null;
    pendingScrollTop.current = saved;

    const t = cutoffDraft.trim();
    if (t === "") setGroupPatternCutoffRound(null);
    else {
      const n = parseInt(t, 10);
      if (!Number.isNaN(n) && n >= 1) setGroupPatternCutoffRound(n);
    }

    const tm = minCountDraft.trim();
    if (tm === "") setGroupPatternMinCount(5);
    else {
      const m = parseInt(tm, 10);
      if (!Number.isNaN(m) && m >= 1) setGroupPatternMinCount(m);
    }
  };

  return (
    <div className="rounded-lg bg-slate-700/40 p-3 space-y-2">
      <p className="text-slate-400 text-xs font-medium">5그룹 패턴 (본번호 6개만, 보너스 제외)</p>
      <p className="text-slate-500 text-[11px] leading-relaxed">
        자리 순서: 1~9 · 10~18 · 19~27 · 28~36 · 37~45 — 각 자리는 해당 구간에 속한 번호 개수(0~6).
        예: 7,17,24,26,37,44 → <span className="text-slate-300 font-mono">11202</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <label className="flex items-center gap-1.5 text-slate-400 shrink-0">
          기준 회차
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={latestRound ?? undefined}
            placeholder="전체"
            title="입력 후 적용 시 반영. 비우고 적용하면 필터 해제"
            value={cutoffDraft}
            onChange={(e) => setCutoffDraft(e.target.value)}
            className="w-20 rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 text-slate-200 text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-400 shrink-0">
          기준 건수
          <input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="5"
            title="적용 시 전체 출현 건수가 이 값 미만인 패턴은 숨김. 비우고 적용하면 5"
            value={minCountDraft}
            onChange={(e) => setMinCountDraft(e.target.value)}
            className="w-14 rounded border border-slate-600 bg-slate-800/80 px-1.5 py-0.5 text-slate-200 text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        <button
          type="button"
          onClick={applyFilters}
          className="shrink-0 rounded bg-sky-600/90 px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-sky-500"
        >
          적용
        </button>
        <span className="text-slate-500">
          마지막 출현·건수 필터는 적용 후 반영
        </span>
      </div>
      <div ref={tableScrollRef} className="max-h-[min(28rem,70vh)] overflow-y-auto rounded border border-slate-600/60">
        <table className="w-full table-fixed border-collapse text-[10px] leading-tight sm:text-[11px] sm:leading-snug">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-slate-800/95 backdrop-blur-sm">
            <tr>
              {thBtn("pattern", "left", "패턴")}
              {thBtn("count", "right", "건")}
              {thBtn("pct", "right", "%")}
              {thBtn("last", "right", "마지막", "이 패턴이 데이터에서 가장 마지막으로 나온 회차")}
              {thBtn("deltaLatest", "right", "최종Δ", "데이터 최종 회차 − 이 패턴이 가장 최근에 나온 회차")}
              {thBtn("deltaPrev", "right", "직전Δ", "건수 2회 이상일 때만: 최근 출현 회차 − 그 직전 출현 회차")}
              {thBtn(
                "avgGap",
                "right",
                "평균Δ",
                "연속 출현 간 회차 차이의 평균 (전체 출현이 2회 미만이면 없음)"
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => {
              const { pattern, count, pct, lastR, deltaLatest, deltaPrev, avgGap } = row;
              const pctStr = pct.toFixed(2);
              const avgGapStr = avgGap != null ? avgGap.toFixed(1) : "—";
              const intensity = maxCount > 0 ? count / maxCount : 0;
              const bg = `rgba(56, 189, 248, ${0.12 + 0.35 * intensity})`;
              return (
                <tr key={pattern} style={{ backgroundColor: bg }}>
                  <td className="px-0.5 py-0.5 font-mono text-slate-200 tracking-tight">{pattern}</td>
                  <td className="px-0.5 py-0.5 text-right text-sky-300/90 font-medium tabular-nums">{count}</td>
                  <td className="px-0.5 py-0.5 text-right text-slate-400 tabular-nums">{pctStr}%</td>
                  <td className="px-0.5 py-0.5 text-right text-slate-200 tabular-nums whitespace-nowrap">
                    {lastR != null ? lastR : "—"}
                  </td>
                  <td className="px-0.5 py-0.5 text-right text-slate-200 whitespace-nowrap tabular-nums">
                    {deltaLatest != null ? deltaLatest : "—"}
                  </td>
                  <td className="px-0.5 py-0.5 text-right text-slate-200 whitespace-nowrap tabular-nums">
                    {deltaPrev != null ? deltaPrev : "—"}
                  </td>
                  <td className="px-0.5 py-0.5 text-right text-slate-200 whitespace-nowrap tabular-nums">
                    {avgGapStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-[11px]">
        표시 {entries.length}종 / 전체 {sortedEntriesCount.length}종
        {groupPatternCutoffRound != null ? ` · 마지막 출현 ≥ ${groupPatternCutoffRound}` : ""}
        {` · 출현 건수 ≥ ${groupPatternMinCount}`}
        {" · "}
        최종 회차:{" "}
        {latestRound != null ? (
          <span className="text-slate-400">{latestRound}</span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </p>
    </div>
  );
}

function AnalysisResultView({
  analysis,
  rounds,
  groupPatternCutoffRound,
  setGroupPatternCutoffRound,
  groupPatternMinCount,
  setGroupPatternMinCount,
}: {
  analysis: AnalysisResult;
  rounds?: { round: number; sum: number }[];
  groupPatternCutoffRound: number | null;
  setGroupPatternCutoffRound: (v: number | null) => void;
  groupPatternMinCount: number;
  setGroupPatternMinCount: (v: number) => void;
}) {
  const sumEntries = analysis.sumPattern?.histogram
    ? Object.entries(analysis.sumPattern.histogram)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];
  const pairKeys = [0, 1, 2, 3, 4, 5].filter(
    (k) => analysis.consecutivePattern?.pairDistribution?.[k] != null
  );
  const runKeys = [1, 2, 3, 4, 5, 6].filter(
    (k) => analysis.consecutivePattern?.maxRunDistribution?.[k] != null
  );
  return (
    <div className="space-y-4">
      <h4 className="text-slate-200 font-semibold text-sm border-b border-slate-600 pb-1">
        분석 결과 ({analysis.totalRounds}회차 기준)
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-700/40 p-3">
          <p className="text-slate-400 text-xs font-medium mb-2">인기 번호 (많이 나온 순)</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.hot.map((n) => {
              const g = getGroupKey(n);
              const style = GROUP_BALL_STYLES[g];
              return (
                <span
                  key={n}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border ${style?.bg ?? "bg-slate-600"} ${style?.text ?? "text-slate-300"} ${style?.border ?? "border-slate-500"}`}
                >
                  {n}
                </span>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg bg-slate-700/40 p-3">
          <p className="text-slate-400 text-xs font-medium mb-2">비인기 번호 (적게 나온 순)</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.cold.map((n) => {
              const g = getGroupKey(n);
              const style = GROUP_BALL_STYLES[g];
              return (
                <span
                  key={n}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border opacity-80 ${style?.bg ?? "bg-slate-600"} ${style?.text ?? "text-slate-400"} ${style?.border ?? "border-slate-500"}`}
                >
                  {n}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {analysis.sumPattern && (
        <div className="rounded-lg bg-slate-700/40 p-3 space-y-3">
          <p className="text-slate-400 text-xs font-medium">합계 패턴 (6개 번호 합) — X: 합계 21~255, Y: 당첨건수</p>
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">최소</span>
              <span className="text-slate-200 font-semibold">{analysis.sumPattern.min}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">최대</span>
              <span className="text-slate-200 font-semibold">{analysis.sumPattern.max}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">평균</span>
              <span className="text-slate-200 font-semibold">{analysis.sumPattern.avg}</span>
            </div>
          </div>
          <SumHistogramChart
            histogram={analysis.sumPattern.histogram}
            avg={analysis.sumPattern.avg}
            rounds={rounds}
            showFilter={false}
          />
          {sumEntries.length > 0 && (
            <div className="border-t border-slate-600 pt-2">
              <p className="text-slate-500 text-xs mb-2">합계별 회차 수 (상위 10개)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {sumEntries.map(([sum, cnt]) => (
                  <div
                    key={sum}
                    className="flex justify-between items-center rounded bg-slate-800/60 px-2 py-1 text-xs"
                  >
                    <span className="text-slate-300">합 {sum}</span>
                    <span className="text-amber-400/90 font-medium">{cnt}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {analysis.consecutivePattern && (
        <div className="rounded-lg bg-slate-700/40 p-3 space-y-3">
          <p className="text-slate-400 text-xs font-medium">연속번호 패턴</p>
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">연속 쌍 평균</span>
              <span className="text-slate-200 font-semibold">{analysis.consecutivePattern.avgConsecutivePairs}개</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-xs">최장 연속 평균</span>
              <span className="text-slate-200 font-semibold">{analysis.consecutivePattern.avgMaxRun}개</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-600 pt-2">
            {pairKeys.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs mb-1.5">연속 쌍 개수별</p>
                <div className="flex flex-wrap gap-2">
                  {pairKeys.map((k) => (
                    <div
                      key={k}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-2 py-1 text-xs"
                    >
                      <span className="text-slate-300">{k}쌍</span>
                      <span className="text-emerald-400/90 font-medium">{analysis.consecutivePattern!.pairDistribution[k]}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {runKeys.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs mb-1.5">최장 연속 길이별</p>
                <div className="flex flex-wrap gap-2">
                  {runKeys.map((k) => (
                    <div
                      key={k}
                      className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-2 py-1 text-xs"
                    >
                      <span className="text-slate-300">{k}개</span>
                      <span className="text-sky-400/90 font-medium">{analysis.consecutivePattern!.maxRunDistribution[k]}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {analysis.group9_45Distribution && analysis.totalRounds > 0 && (() => {
        const dist = analysis.group9_45Distribution;
        const total = analysis.totalRounds;
        let maxCount = 0;
        for (let n9 = 0; n9 <= 3; n9++) {
          for (let n45 = 0; n45 <= 3; n45++) {
            if (n9 + n45 <= 6) {
              const c = dist[`${n9},${n45}`] ?? 0;
              if (c > maxCount) maxCount = c;
            }
          }
        }
        return (
          <div className="rounded-lg bg-slate-700/40 p-3 space-y-2">
            <p className="text-slate-400 text-xs font-medium">9·45 조합 (진할수록 확률 높음)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-1 border border-slate-600">9\45</th>
                    {[0, 1, 2, 3].map((n45) => (
                      <th key={n45} className="p-1 border border-slate-600">45:{n45}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3].map((n9) => (
                    <tr key={n9}>
                      <td className="p-1 border border-slate-600 text-slate-400 font-medium">9:{n9}</td>
                      {[0, 1, 2, 3].map((n45) => {
                        if (n9 + n45 > 6) return <td key={n45} className="p-1 border border-slate-600 bg-slate-800/50" />;
                        const key = `${n9},${n45}`;
                        const count = dist[key] ?? 0;
                        const pct = ((count / total) * 100).toFixed(1);
                        const intensity = maxCount > 0 ? count / maxCount : 0;
                        const opacity = 0.25 + 0.7 * intensity;
                        return (
                          <td
                            key={n45}
                            className="p-1 border border-slate-600 text-slate-300"
                            style={{ backgroundColor: `rgba(245, 158, 11, ${opacity})` }}
                            title={`${count}회 (${pct}%)`}
                          >
                            {count}회 <span className="text-slate-900 font-semibold">{pct}%</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {analysis.groupPatternDistribution && analysis.totalRounds > 0 ? (
        <GroupPatternBlock
          analysis={analysis}
          groupPatternCutoffRound={groupPatternCutoffRound}
          setGroupPatternCutoffRound={setGroupPatternCutoffRound}
          groupPatternMinCount={groupPatternMinCount}
          setGroupPatternMinCount={setGroupPatternMinCount}
        />
      ) : null}

      {analysis.prevBucketAnalysis && analysis.prevBucketAnalysis.analyzedRounds > 0 && (
        <PrevBucketAnalysisBlock data={analysis.prevBucketAnalysis} />
      )}

      {analysis.positionFrequency && analysis.positionFrequency.totalRounds > 0 && (
        <PositionFrequencyBlock data={analysis.positionFrequency} />
      )}
    </div>
  );
}

/**
 * 열 15개: 헤더 3줄 1~15 / 16~30 / 31~45.
 * 각 자리 행 셀: 번호마다 횟수·% (세로 3단)
 */
function PositionFrequencyBlock({ data }: { data: PositionFrequencyAnalysis }) {
  const total = data.totalRounds;
  const byPos = data.positions.map((pos) => {
    const map = new Map<number, { count: number; pct: number }>();
    for (const e of pos.entries) map.set(e.num, { count: e.count, pct: e.pct });
    return map;
  });
  let maxCount = 1;
  for (const pos of data.positions) {
    for (const e of pos.entries) maxCount = Math.max(maxCount, e.count);
  }

  /** 열 c(0~14): [1+c, 16+c, 31+c] */
  const colNums = (c: number): number[] => [c + 1, c + 16, c + 31];

  const cellBg = (pi: number, num: number) => {
    const theoryMin = pi + 1;
    const theoryMax = 40 + pi;
    if (num < theoryMin || num > theoryMax) return "rgba(2,6,23,0.55)";
    const cell = byPos[pi]?.get(num);
    if (!cell || cell.count <= 0) return "rgba(15,23,42,0.9)";
    const t = cell.count / maxCount;
    return `rgba(245,158,11,${(0.12 + 0.72 * t).toFixed(3)})`;
  };

  const stackMetrics = (pi: number, num: number) => {
    const theoryMin = pi + 1;
    const theoryMax = 40 + pi;
    if (num < theoryMin || num > theoryMax) {
      return (
        <div
          key={num}
          className="flex flex-col items-center justify-center py-1 min-h-[2.1rem] opacity-30"
          style={{ backgroundColor: "rgba(2,6,23,0.55)" }}
        />
      );
    }
    const d = byPos[pi]?.get(num);
    return (
      <div
        key={num}
        title={d ? `${pi + 1}번째 · ${num}번: ${d.count}회 (${d.pct}%)` : `${num}번`}
        className="flex flex-col items-center justify-center gap-0.5 py-1 min-h-[2.1rem] leading-none"
        style={{ backgroundColor: cellBg(pi, num) }}
      >
        {d && d.count > 0 ? (
          <>
            <span className="text-white font-semibold text-xs">{d.count}</span>
            <span className="text-white/90 text-[10px]">{d.pct.toFixed(1)}%</span>
          </>
        ) : (
          <span className="text-slate-600 text-xs">·</span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-lg bg-slate-700/40 p-2 space-y-1.5">
      <p className="text-slate-200 text-sm font-semibold px-1">
        자리별 출현 · {total}회 · 번호 1~15 / 16~30 / 31~45 · 셀: 횟수·%
      </p>
      <div className="overflow-x-auto rounded border border-slate-600/60 [scrollbar-width:thin]">
        <table
          className="w-full text-xs font-mono tabular-nums border-separate"
          style={{ borderSpacing: "2px 1px" }}
        >
          <thead className="bg-slate-800">
            {[0, 1, 2].map((band) => (
              <tr key={band} className="text-slate-200 leading-none">
                {band === 0 ? (
                  <th
                    rowSpan={3}
                    className="sticky left-0 z-10 bg-slate-800 py-0 px-1.5 text-left font-semibold align-middle whitespace-nowrap text-[11px]"
                  >
                    자리
                  </th>
                ) : null}
                {Array.from({ length: 15 }, (_, c) => (
                  <th
                    key={`${band}-${c}`}
                    className="py-0 px-0.5 text-center font-semibold bg-slate-800 min-w-[2.4rem] text-[11px] h-3.5 leading-none"
                  >
                    {band * 15 + c + 1}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((pi) => (
              <tr key={pi}>
                <td className="sticky left-0 z-10 bg-slate-900 py-1.5 px-2 text-left font-bold text-amber-300 whitespace-nowrap align-middle border-b-2 border-slate-500/80">
                  {pi + 1}번째
                </td>
                {Array.from({ length: 15 }, (_, c) => (
                  <td
                    key={c}
                    className="p-0 align-top min-w-[2.4rem] border-b-2 border-slate-500/80"
                  >
                    <div className="flex flex-col gap-0.5">
                      {colNums(c).map((num) => stackMetrics(pi, num))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrevBucketAnalysisBlock({ data }: { data: PrevBucketAnalysis }) {
  const topCompositions = Object.entries(data.compositionDistribution)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const appearProb = data.nextAppearProbability ?? data.groupHitRatio;
  const perNumProb = data.perNumberHitProbability;
  const atLeastProb = data.atLeastOneProbability;
  const totalBalls = data.analyzedRounds * 6;

  return (
    <div className="rounded-lg bg-slate-700/40 p-3 space-y-4">
      <div>
        <p className="text-slate-200 text-sm font-semibold">
          직전 회차 구간 그룹 (Prev1~Prev5) · 다음 회차 출현 확률
        </p>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          {data.startRound}~{data.endRound}회({data.analyzedRounds}회) 기준. 대표 수치는 해당 Prev 그룹에서
          <span className="text-amber-400/90"> 번호가 1개라도 당첨에 나온 회차 비율</span>
          입니다. 다음 회차(
          <span className="text-amber-400/90 font-medium">{data.nextRound}회</span>
          ) 참고용.
        </p>
      </div>

      {/* 대표: 1개라도 출현 확률 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PREV_BUCKET_ORDER.map((key) => {
          const meta = PREV_BUCKET_LABELS[key];
          const pAny = atLeastProb?.[key];
          return (
            <div
              key={key}
              className="rounded-lg border border-amber-600/25 bg-slate-900/50 px-2.5 py-2.5 text-center"
            >
              <p className={`text-xs font-bold ${meta.color}`}>{meta.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{meta.window}</p>
              <p className="text-amber-300 font-bold text-xl tabular-nums mt-1.5 leading-none">
                {pAny != null ? `${pAny}%` : "—"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">1개라도 출현</p>
            </div>
          );
        })}
      </div>

      {/* 상세 표 */}
      <div className="rounded-lg border border-slate-600/50 bg-slate-800/50 p-3 space-y-2">
        <p className="text-slate-400 text-xs font-semibold">
          상세 지표 ({data.startRound}~{data.endRound}회)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[520px]">
            <thead>
              <tr className="text-slate-400 border-b border-slate-600">
                <th className="text-left py-1.5 pr-2 font-medium">그룹</th>
                <th className="text-left py-1.5 px-1 font-medium">구간</th>
                <th
                  className="text-right py-1.5 px-1 font-medium text-amber-400/80"
                  title="이 그룹에서 1개 이상 나온 회차 비율 (대표)"
                >
                  1개라도 출현
                </th>
                <th className="text-right py-1.5 px-1 font-medium" title="회차당 평균 몇 개가 이 그룹에서 나오는지">
                  회당 평균
                </th>
                <th className="text-right py-1.5 px-1 font-medium" title="당첨 공 1개가 이 그룹에서 나올 확률">
                  공 1개 비중
                </th>
                <th className="text-right py-1.5 px-1 font-medium" title="이 그룹 번호 1개가 당첨될 확률">
                  번호 1개 확률
                </th>
                <th className="text-right py-1.5 pl-1 font-medium">출현 수</th>
              </tr>
            </thead>
            <tbody>
              {PREV_BUCKET_ORDER.map((key) => {
                const meta = PREV_BUCKET_LABELS[key];
                const pBall = appearProb[key] ?? 0;
                const pNum = perNumProb?.[key];
                const pAny = atLeastProb?.[key];
                const avgSize = data.avgGroupSize?.[key];
                return (
                  <tr key={key} className="border-b border-slate-700/80">
                    <td className={`py-2 pr-2 font-bold ${meta.color}`}>{meta.title}</td>
                    <td className="py-2 px-1 text-slate-500 whitespace-nowrap">
                      {meta.window}
                      {avgSize != null && (
                        <span className="text-slate-600 ml-1">(평균 {avgSize}개)</span>
                      )}
                    </td>
                    <td className="py-2 px-1 text-right">
                      <span className="text-amber-300 font-bold text-sm tabular-nums">
                        {pAny != null ? `${pAny}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right text-slate-200 tabular-nums">
                      {data.avgPerRound[key]}
                      <span className="text-slate-500">/6</span>
                    </td>
                    <td className="py-2 px-1 text-right text-slate-400 tabular-nums">
                      {pBall}%
                    </td>
                    <td className="py-2 px-1 text-right text-sky-300/90 tabular-nums">
                      {pNum != null ? `${pNum}%` : "—"}
                    </td>
                    <td className="py-2 pl-1 text-right text-slate-400 tabular-nums">
                      {data.groupHitCounts[key]}
                      <span className="text-slate-600">/{totalBalls}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="text-[10px] text-slate-500 space-y-0.5 leading-relaxed list-disc pl-3.5">
          <li>
            <span className="text-amber-400/80">1개라도 출현</span>
            (대표): 해당 Prev 그룹 번호가 당첨 6개에 최소 1개 이상 포함된 회차 비율
          </li>
          <li>
            <span className="text-slate-400">공 1개 비중</span>: 당첨 공 전체 중 해당 그룹에서 나온 비율 (합 ≈ 100%)
          </li>
          <li>
            <span className="text-slate-400">번호 1개 확률</span>: 그 회차 그 그룹에 속한 번호 하나가 당첨에
            포함된 비율
          </li>
        </ul>

        {/* 그룹별 출현 개수 확률 (0~6) */}
        {data.hitCountDistribution && (
          <div className="border-t border-slate-600/50 pt-2 mt-1 space-y-1.5">
            <p className="text-slate-500 text-xs">
              회차당 그룹별 출현 개수 확률 (0~6개)
            </p>
            <div className="space-y-1">
              {PREV_BUCKET_ORDER.map((key) => {
                const dist = data.hitCountDistribution![key] ?? {};
                const meta = PREV_BUCKET_LABELS[key];
                return (
                  <div key={key} className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className={`w-12 shrink-0 font-semibold ${meta.color}`}>{key}</span>
                    {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                      const n = dist[c] ?? 0;
                      const pct =
                        data.analyzedRounds > 0
                          ? ((n / data.analyzedRounds) * 100).toFixed(1)
                          : "0.0";
                      if (n === 0) {
                        return (
                          <span
                            key={c}
                            className="inline-flex items-center gap-0.5 rounded bg-slate-900/40 px-1.5 py-0.5 text-slate-600"
                          >
                            {c}:{pct}%
                          </span>
                        );
                      }
                      return (
                        <span
                          key={c}
                          className="inline-flex items-center gap-0.5 rounded bg-slate-900/70 border border-slate-600/40 px-1.5 py-0.5 text-slate-300"
                          title={`${n}회`}
                        >
                          <span className="text-slate-500">{c}개</span>
                          <span className="text-amber-400/90 font-medium">{pct}%</span>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 구성 패턴 */}
      <div className="rounded-lg border border-slate-600/60 bg-slate-800/40 p-3 space-y-2">
        {topCompositions.length > 0 && (
          <div>
            <p className="text-slate-500 text-xs mb-1.5">
              회차별 구성 (Prev1~5 개수, 합 6) — 빈도 상위
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topCompositions.map(({ key, count }) => {
                const pct =
                  data.analyzedRounds > 0
                    ? ((count / data.analyzedRounds) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded bg-slate-900/60 border border-slate-600/40 px-2 py-1 text-[11px]"
                    title={`Prev1~5 개수 = ${key}`}
                  >
                    <span className="font-mono text-slate-300">{key}</span>
                    <span className="text-emerald-400/90 font-medium">{count}회</span>
                    <span className="text-slate-500">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 다음 회차 Prev 그룹 */}
      <div className="space-y-2">
        <p className="text-slate-400 text-xs font-medium">
          {data.nextRound}회 기준 Prev 그룹 번호
          <span className="text-slate-500 font-normal">
            {" "}
            (직전 {data.nextRound - 1}~{data.nextRound - 20}회 반영 · 배타 분류)
          </span>
        </p>
        <div className="space-y-2.5">
          {PREV_BUCKET_ORDER.map((key) => {
            const meta = PREV_BUCKET_LABELS[key];
            const nums = data.nextGroups[key] ?? [];
            const wr =
              key === "Prev5"
                ? null
                : data.nextWindowRounds[key as "Prev1" | "Prev2" | "Prev3" | "Prev4"];
            return (
              <div
                key={key}
                className="rounded-lg border border-slate-600/50 bg-slate-800/50 p-2.5"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
                  <span className={`text-xs font-bold ${meta.color}`}>{meta.title}</span>
                  <span className="text-[11px] text-slate-500">{meta.window}</span>
                  {wr && wr.length > 0 && (
                    <span className="text-[10px] text-slate-600 font-mono">
                      회차 {wr[wr.length - 1]}~{wr[0]}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 ml-auto">
                    {nums.length}개
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {nums.length === 0 ? (
                    <span className="text-slate-600 text-xs">없음</span>
                  ) : (
                    nums.map((n) => (
                      <span
                        key={n}
                        title={prevNumberTooltip(n, key, data.numberStats)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border cursor-help ${meta.ball}`}
                      >
                        {n}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-600">
          같은 번호가 여러 구간에 나와도 더 최근 구간(Prev1 쪽)에만 배정됩니다. Prev1~4 합 + Prev5 = 45.
        </p>
      </div>
    </div>
  );
}
const DEFAULT_GAMES = 10;
const MIN_GAMES = 1;
const MAX_GAMES = 100;
const GROUP_KEYS = [9, 18, 27, 36, 45] as const;

function getInitialFilterStates(): Record<number, NumberFilterState> {
  return {};
}

function drawLottoNumbers(
  mustInclude: number[],
  mustExclude: number[],
  atLeastOne: number[],
  extraExclude: number[] = []
): number[] {
  const excludeSet = new Set([...mustExclude, ...extraExclude]);
  const pool = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).filter(
    (n) => !excludeSet.has(n)
  );
  const result = [...mustInclude];

  const atLeastOneInPool = atLeastOne.filter((n) => !excludeSet.has(n));
  const resultSet = new Set(result);
  const hasAtLeastOne = atLeastOneInPool.some((n) => resultSet.has(n));
  if (atLeastOneInPool.length > 0 && !hasAtLeastOne) {
    const available = atLeastOneInPool.filter((n) => !resultSet.has(n));
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      result.push(pick);
      resultSet.add(pick);
    }
  }

  const poolWithoutResult = pool.filter((n) => !resultSet.has(n));
  const need = PICK_COUNT - result.length;
  if (poolWithoutResult.length < need) {
    return result.sort((a, b) => a - b);
  }
  for (let i = 0; i < need; i++) {
    const idx = Math.floor(Math.random() * poolWithoutResult.length);
    result.push(poolWithoutResult[idx]);
    poolWithoutResult.splice(idx, 1);
  }
  return result.sort((a, b) => a - b);
}

function countInGroup(nums: number[], groupKey: number): number {
  const groupNums = getNumbersInGroup(groupKey);
  return nums.filter((n) => groupNums.includes(n)).length;
}

/** 그룹별 n ≤ 개수 ≤ m 범위를 만족하도록 추출 */
function drawByGroupCounts(
  groupCountRanges: GroupCountRanges,
  groupEnabled: GroupEnabled,
  mustInclude: number[],
  mustExclude: number[],
  extraExclude: number[] = []
): number[] {
  const excludeSet = new Set([...mustExclude, ...extraExclude]);
  const result = [...mustInclude];
  const resultSet = new Set(result);

  // 1) 최소 개수(min) 충족
  for (const key of GROUP_KEYS) {
    if (!groupEnabled[key]) continue;
    const { min, max } = groupCountRanges[key] ?? { min: 0, max: 0 };
    const already = countInGroup(result, key);
    if (already > max) return []; // 꼭넣기로 max 초과 → 호출측 재시도
    const toPick = Math.max(0, min - already);
    if (toPick === 0) continue;

    const pool = getNumbersInGroup(key).filter((n) => !excludeSet.has(n) && !resultSet.has(n));
    if (pool.length < toPick) return [];

    for (let i = 0; i < toPick && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const num = pool[idx];
      result.push(num);
      resultSet.add(num);
      pool.splice(idx, 1);
    }
  }

  // 2) 나머지 채우기 (각 그룹이 max를 넘지 않도록)
  const needFill = PICK_COUNT - result.length;
  if (needFill > 0) {
    const counts: Record<number, number> = { 9: 0, 18: 0, 27: 0, 36: 0, 45: 0 };
    for (const key of GROUP_KEYS) {
      if (groupEnabled[key]) counts[key] = countInGroup(result, key);
    }

    let fillPool = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).filter(
      (n) => !excludeSet.has(n) && !resultSet.has(n)
    );

    for (let i = 0; i < needFill && fillPool.length > 0; i++) {
      const validPool = fillPool.filter((n) => {
        for (const key of GROUP_KEYS) {
          if (!groupEnabled[key]) continue;
          const { max } = groupCountRanges[key] ?? { min: 0, max: 0 };
          if (getNumbersInGroup(key).includes(n) && (counts[key] ?? 0) >= max) return false;
        }
        return true;
      });
      if (validPool.length === 0) break;
      const num = validPool[Math.floor(Math.random() * validPool.length)];
      const idxInFill = fillPool.indexOf(num);
      if (idxInFill !== -1) fillPool.splice(idxInFill, 1);
      result.push(num);
      resultSet.add(num);
      for (const key of GROUP_KEYS) {
        if (groupEnabled[key] && getNumbersInGroup(key).includes(num)) {
          counts[key] = (counts[key] ?? 0) + 1;
          if (counts[key] >= (groupCountRanges[key]?.max ?? 0)) {
            fillPool = fillPool.filter((n) => !getNumbersInGroup(key).includes(n));
          }
          break;
        }
      }
    }
  }

  if (result.length !== PICK_COUNT) return [];
  for (const key of GROUP_KEYS) {
    if (!groupEnabled[key]) continue;
    const { min, max } = groupCountRanges[key] ?? { min: 0, max: 0 };
    const c = countInGroup(result, key);
    if (c < min || c > max) return [];
  }

  return result.sort((a, b) => a - b);
}

export function LottoPageBody() {
  const [games, setGames] = useState<number[][]>([]);
  const [gameCount, setGameCount] = useState(DEFAULT_GAMES);
  const [isDrawing, setIsDrawing] = useState(false);
  const [filterStates, setFilterStates] = useState<Record<number, NumberFilterState>>(
    getInitialFilterStates
  );
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>("include");
  const [groupCountRanges, setGroupCountRanges] = useState<GroupCountRanges>(getDefaultGroupCountRanges);
  const [groupEnabled, setGroupEnabled] = useState<GroupEnabled>(getDefaultGroupEnabled);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"number" | "position" | "group" | "group9_45" | "sum" | "oddEven" | "consecutive" | "repeatAppear" | "prevRound">("number");
  const [sumMin, setSumMin] = useState<number | null>(null);
  const [sumMax, setSumMax] = useState<number | null>(null);
  const [maxConsecutivePairs, setMaxConsecutivePairs] = useState<number | null>(null);
  /** 연속 최대 2개 허용(3개 이상 금지)일 때 2, null=제한 없음 */
  const [maxConsecutiveRun, setMaxConsecutiveRun] = useState<number | null>(null);
  /** 정렬 6자리별 허용 min~max */
  const [positionLimits, setPositionLimits] = useState<PositionLimit[]>(() => defaultPositionLimits());
  const [selectedGroup9_45Keys, setSelectedGroup9_45Keys] = useState<Set<string>>(new Set());
  const [selectedOddEvenKeys, setSelectedOddEvenKeys] = useState<Set<string>>(new Set());
  const [savedRounds, setSavedRounds] = useState<{
    data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[];
    total: number;
  } | null>(null);
  const [savedRoundsLoading, setSavedRoundsLoading] = useState(true);
  const [allRounds, setAllRounds] = useState<{ round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]>([]);
  const [allRoundsLoading, setAllRoundsLoading] = useState(false);
  const [mainTab, setMainTab] = useState<"draw" | "stats">("draw");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  /** 5그룹 패턴 표: 마지막 출현 회차가 이 값 미만이면 행 숨김. null이면 필터 없음 */
  const [groupPatternCutoffRound, setGroupPatternCutoffRound] = useState<number | null>(1100);
  /** 5그룹 패턴 표: 전체 출현 건수가 이 값 미만이면 행 숨김 */
  const [groupPatternMinCount, setGroupPatternMinCount] = useState(5);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [saveDrawnLoading, setSaveDrawnLoading] = useState(false);
  const [saveDrawnMessage, setSaveDrawnMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [savedDrawnList, setSavedDrawnList] = useState<number[][]>([]);
  /** 페이지 로드 시 DB에서 조회해 둔 당첨/추출 6개 번호 세트 키 (뽑은 세트가 있으면 재추출) */
  const [exclusionWinningSetKeys, setExclusionWinningSetKeys] = useState<Set<string>>(new Set());
  const [exclusionDrawnSetKeys, setExclusionDrawnSetKeys] = useState<Set<string>>(new Set());
  /** 추출 번호의 대상 회차 (lotto_rounds 최대 회차 + 1). 표시·클립보드용 */
  const [nextRound, setNextRound] = useState<number>(1);
  /** 이전 회차 선택 필터 */
  const [prevRoundsOpen, setPrevRoundsOpen] = useState(false);
  const [selectedPrevRounds, setSelectedPrevRounds] = useState<Set<number>>(new Set());

  // 분석 결과가 있고 합계 필터가 비어 있으면, 당첨 분포 기준으로 양끝 10% 제외한 기본 범위 적용
  useEffect(() => {
    if (!analysis?.sumPattern?.histogram || sumMin != null || sumMax != null) return;
    const { defaultSumMin, defaultSumMax } = getDefaultSumRangeFromHistogram(analysis.sumPattern.histogram);
    setSumMin(defaultSumMin);
    setSumMax(defaultSumMax);
  }, [analysis, sumMin, sumMax]);

  const fetchNextRound = useCallback(() => {
    fetch("/api/lotto/next-round", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { error?: string; nextRound?: unknown; maxRound?: unknown }) => {
        if (json.error) return;
        const raw = json.nextRound;
        const n =
          typeof raw === "number" && !Number.isNaN(raw)
            ? raw
            : parseInt(String(raw ?? ""), 10);
        if (!Number.isNaN(n) && n >= 1) setNextRound(n);
      })
      .catch(() => {});
  }, []);

  const fetchDbScreenData = useCallback(() => {
    fetch("/api/lotto?limit=20", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setSavedRounds({ data: json.data ?? [], total: json.total ?? 0 });
      })
      .catch(() => setSavedRounds(null));
    fetchNextRound();
    // 항상 전체 회차 기준으로 분석 실행 (저장된 1000회차 분석이 아닌)
    setAnalysisLoading(true);
    fetch("/api/analyze-lotto", { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (json.analysis) setAnalysis(json.analysis);
        else setAnalysis(null);
      })
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [fetchNextRound]);

  useEffect(() => {
    fetchNextRound();
  }, [fetchNextRound]);

  /**
   * 클립보드·「N회차용」표시용. API nextRound가 문자열 등으로 갱신 실패하거나,
   * 목록(최신 회차)과 어긋날 때 savedRounds 첫 행(내림차순 최대 회차)+1을 반영.
   */
  const resolvedNextRound = useMemo(() => {
    const fromApi = Number(nextRound);
    const latest = savedRounds?.data?.[0]?.round;
    const fromList =
      latest != null && !Number.isNaN(Number(latest)) ? Number(latest) + 1 : 0;
    return Math.max(Number.isNaN(fromApi) ? 0 : fromApi, fromList, 1);
  }, [nextRound, savedRounds]);

  /** 선택된 이전 회차 번호들을 추출 제외 목록으로 변환 */
  const prevRoundExclude = useMemo<number[]>(() => {
    if (selectedPrevRounds.size === 0) return [];
    const nums = new Set<number>();
    for (const row of allRounds) {
      if (selectedPrevRounds.has(row.round)) {
        [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6, row.bonus].forEach(n => { if (n) nums.add(n); });
      }
    }
    return Array.from(nums);
  }, [selectedPrevRounds, allRounds]);

  useEffect(() => {
    let cancelled = false;
    setSavedRoundsLoading(true);
    fetch("/api/lotto?limit=20", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setSavedRounds(null);
          return;
        }
        setSavedRounds({ data: json.data ?? [], total: json.total ?? 0 });
        fetchNextRound();
      })
      .catch(() => {
        if (!cancelled) setSavedRounds(null);
      })
      .finally(() => {
        if (!cancelled) setSavedRoundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // DB에 저장된 분석 결과 불러오기. 9·45 조합이 없으면 재분석해서 DB·화면 반영
  useEffect(() => {
    let cancelled = false;
    fetch("/api/lotto/analysis", { cache: "no-store" })
      .then((res) => res.json())
      .then(async (json) => {
        if (cancelled) return;
        if (json.analysis) {
          setAnalysis(json.analysis);
          const has94 = json.analysis.group9_45Distribution && Object.keys(json.analysis.group9_45Distribution).length > 0;
          const hasGroupPattern =
            json.analysis.groupPatternDistribution && Object.keys(json.analysis.groupPatternDistribution).length > 0;
          const hasGroupPatternRoundDetail =
            json.analysis.groupPatternRounds &&
            Object.keys(json.analysis.groupPatternRounds).length > 0 &&
            typeof json.analysis.latestRound === "number";
          if (json.analysis.totalRounds > 0 && (!has94 || !hasGroupPattern || !hasGroupPatternRoundDetail)) {
            setAnalysisLoading(true);
            try {
              const res = await fetch("/api/analyze-lotto", { method: "POST" });
              const data = await res.json();
              if (!cancelled && data.analysis) setAnalysis(data.analysis);
            } catch {
              if (!cancelled) setAnalysis(json.analysis);
            } finally {
              if (!cancelled) setAnalysisLoading(false);
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 페이지 로드 시 당첨 내역·추출 내역의 6개 번호 세트 조회 → 메모리 보관 (뽑은 세트가 있으면 재추출)
  const fetchExclusionData = useCallback(() => {
    fetch("/api/lotto/exclusion-data", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          const win: Set<string> = Array.isArray(json.winningSets)
            ? new Set(json.winningSets.map((s: number[]) => [...s].sort((a, b) => a - b).join(",")))
            : new Set<string>();
          const drawn: Set<string> = Array.isArray(json.drawnSets)
            ? new Set(json.drawnSets.map((s: number[]) => [...s].sort((a, b) => a - b).join(",")))
            : new Set<string>();
          setExclusionWinningSetKeys(win);
          setExclusionDrawnSetKeys(drawn);
        }
      })
      .catch(() => {
        setExclusionWinningSetKeys(new Set<string>());
        setExclusionDrawnSetKeys(new Set<string>());
      });
  }, []);
  useEffect(() => {
    fetchExclusionData();
  }, [fetchExclusionData]);

  const loadSavedDrawn = useCallback(() => {
    fetch("/api/lotto/drawn", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setSavedDrawnList(json.games ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSavedDrawn();
  }, [loadSavedDrawn]);

  const loadAllRounds = useCallback(async () => {
    if (allRounds.length > 0) return;
    setAllRoundsLoading(true);
    try {
      const PAGE = 1000;
      let offset = 0;
      const collected: typeof allRounds = [];
      while (true) {
        const r = await fetch(`/api/lotto?limit=${PAGE}&offset=${offset}`, { cache: "no-store" });
        const j = await r.json();
        if (j.error || !Array.isArray(j.data) || j.data.length === 0) break;
        collected.push(...j.data);
        if (collected.length >= j.total || j.data.length < PAGE) break;
        offset += PAGE;
      }
      setAllRounds(collected);
    } catch {}
    finally { setAllRoundsLoading(false); }
  }, [allRounds.length]);

  // 저장된 설정(이전 데이터) 불러오기
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.settings) return;
        const s = json.settings;
        const gc = s.gameCount;
        if (typeof gc === "number" && gc >= MIN_GAMES && gc <= MAX_GAMES) {
          setGameCount(gc);
        }
        if (s.filterStates && typeof s.filterStates === "object") {
          const next: Record<number, NumberFilterState> = {};
          for (const [k, v] of Object.entries(s.filterStates)) {
            const n = parseInt(k, 10);
            if (!Number.isNaN(n) && n >= MIN && n <= MAX && (v === "none" || v === "include" || v === "exclude" || v === "atLeastOne")) {
              next[n] = v as NumberFilterState;
            }
          }
          setFilterStates(next);
        }
        const numKeys = [9, 18, 27, 36, 45];
        if (s.groupCounts && typeof s.groupCounts === "object") {
          setGroupCountRanges(normalizeGroupCountRanges(s.groupCounts, s.groupAtMost));
        }
        if (s.groupEnabled && typeof s.groupEnabled === "object") {
          const next: GroupEnabled = { ...getDefaultGroupEnabled() };
          for (const key of numKeys) {
            const v = s.groupEnabled[key] ?? s.groupEnabled[String(key)];
            if (typeof v === "boolean") next[key] = v;
          }
          setGroupEnabled(next);
        }
        const ps = s.patternSettings;
        if (ps && typeof ps === "object") {
          if (typeof ps.sumMin === "number" && ps.sumMin >= SUM_RANGE.min && ps.sumMin <= SUM_RANGE.max) setSumMin(ps.sumMin);
          if (typeof ps.sumMax === "number" && ps.sumMax >= SUM_RANGE.min && ps.sumMax <= SUM_RANGE.max) setSumMax(ps.sumMax);
          if (typeof ps.maxConsecutivePairs === "number" && ps.maxConsecutivePairs >= 0 && ps.maxConsecutivePairs <= 5) setMaxConsecutivePairs(ps.maxConsecutivePairs);
          // 2 = 연속 최대 2개(3개 이상 금지). 구버전 3~6 값도 동일하게 3개 이상 금지로 취급
          if (typeof ps.maxConsecutiveRun === "number" && ps.maxConsecutiveRun >= 2 && ps.maxConsecutiveRun <= 6) {
            setMaxConsecutiveRun(2);
          }
          if (Array.isArray(ps.group9_45Keys)) setSelectedGroup9_45Keys(new Set(ps.group9_45Keys));
          if (Array.isArray(ps.oddEvenKeys)) setSelectedOddEvenKeys(new Set(ps.oddEvenKeys));
          if (Array.isArray(ps.prevRoundKeys) && ps.prevRoundKeys.length > 0) {
            const rounds = new Set<number>(ps.prevRoundKeys.map(Number).filter((n: number) => !isNaN(n) && n > 0));
            if (rounds.size > 0) {
              setSelectedPrevRounds(rounds);
              loadAllRounds();
            }
          }
          if (Array.isArray(ps.positionLimits) && ps.positionLimits.length === 6) {
            const next = defaultPositionLimits();
            for (let i = 0; i < 6; i++) {
              const raw = ps.positionLimits[i];
              const t = theoryPositionRange(i);
              if (!raw || typeof raw !== "object") {
                next[i] = { ...t };
                continue;
              }
              let min =
                typeof raw.min === "number" && !Number.isNaN(raw.min)
                  ? Math.floor(raw.min)
                  : t.min;
              let max =
                typeof raw.max === "number" && !Number.isNaN(raw.max)
                  ? Math.floor(raw.max)
                  : t.max;
              min = Math.max(t.min, Math.min(t.max, min));
              max = Math.max(t.min, Math.min(t.max, max));
              if (min > max) {
                const swap = min;
                min = max;
                max = swap;
              }
              next[i] = { min, max };
            }
            setPositionLimits(next);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadAllRounds]);

  const TABS = [
    { id: "number" as const, label: "번호 선택 (포함/제외 또는 사용)" },
    { id: "position" as const, label: "자리별 번호" },
    { id: "group" as const, label: "그룹별 개수" },
    { id: "group9_45" as const, label: "9·45 조합" },
    { id: "sum" as const, label: "합계" },
    { id: "oddEven" as const, label: "홀짝" },
    { id: "consecutive" as const, label: "연속번호" },
    { id: "repeatAppear" as const, label: "연속출현" },
    { id: "prevRound" as const, label: "이전 회차" },
  ];

  const hasPositionLimits = positionLimits.some((p, i) => !isFullTheoryRange(i, p));

  const setPositionLimitField = useCallback(
    (index: number, field: "min" | "max", value: number) => {
      setPositionLimits((prev) => {
        const next = prev.map((p) => ({ ...p }));
        const t = theoryPositionRange(index);
        const cur = { ...next[index]! };
        let v = Math.max(t.min, Math.min(t.max, Math.floor(value)));
        if (field === "min") {
          // 위 핸들(최소)은 아래 핸들(최대)을 넘을 수 없음
          v = Math.min(v, cur.max);
          cur.min = v;
        } else {
          // 아래 핸들(최대)은 위 핸들(최소)을 넘을 수 없음
          v = Math.max(v, cur.min);
          cur.max = v;
        }
        next[index] = cur;
        return next;
      });
    },
    []
  );

  const toggleGroup9_45Key = useCallback((key: string) => {
    setSelectedGroup9_45Keys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleOddEvenKey = useCallback((key: string) => {
    setSelectedOddEvenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const runAnalysis = useCallback(() => {
    setAnalysisLoading(true);
    fetch("/api/analyze-lotto", { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (json.analysis) setAnalysis(json.analysis);
        else setAnalysis(null);
      })
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [fetchNextRound]);

  const { mustInclude, mustExclude, atLeastOne } = useMemo(() => {
    const include: number[] = [];
    const exclude: number[] = [];
    const oneOf: number[] = [];
    for (let n = MIN; n <= MAX; n++) {
      const s = filterStates[n];
      if (s === "include") include.push(n);
      if (s === "exclude") exclude.push(n);
      if (s === "atLeastOne") oneOf.push(n);
    }
    return {
      mustInclude: include.sort((a, b) => a - b),
      mustExclude: exclude,
      atLeastOne: oneOf.sort((a, b) => a - b),
    };
  }, [filterStates]);

  const poolSize = useMemo(
    () => 45 - mustExclude.length,
    [mustExclude.length]
  );

  const minSum = useMemo(
    () => sumGroupMins(groupCountRanges, groupEnabled),
    [groupCountRanges, groupEnabled]
  );
  const hasGroupConstraint = GROUP_KEYS.some((key) => {
    if (!groupEnabled[key]) return false;
    const { min, max } = groupCountRanges[key] ?? { min: 0, max: 3 };
    return min > 0 || max < 3;
  });
  const useGroupCountMode = minSum > 0 || hasGroupConstraint;

  useEffect(() => {
    if (minSum <= PICK_COUNT) return;
    setGroupEnabled((prev) => {
      const next = { ...prev };
      for (const key of [45, 36, 27, 18, 9] as const) {
        if (!next[key]) continue;
        next[key] = false;
        if (sumGroupMins(groupCountRanges, next) <= PICK_COUNT) return next;
      }
      return next;
    });
  }, [minSum, groupCountRanges]);

  const canDrawByGroupCounts = useMemo(() => {
    if (!useGroupCountMode) return false;
    if (minSum > PICK_COUNT) return false;
    let maxSum = 0;
    for (const key of GROUP_KEYS) {
      if (!groupEnabled[key]) continue;
      const { min, max } = groupCountRanges[key] ?? { min: 0, max: 0 };
      const groupNums = getNumbersInGroup(key);
      const available = groupNums.filter((n) => !mustExclude.includes(n)).length;
      if (available < min) return false;
      const mustInGroup = mustInclude.filter((n) => groupNums.includes(n)).length;
      if (mustInGroup > max) return false;
      maxSum += Math.min(max, available);
    }
    // 비활성 그룹에서도 채울 수 있음
    const inactivePool = GROUP_KEYS.reduce((s, key) => {
      if (groupEnabled[key]) return s;
      return s + getNumbersInGroup(key).filter((n) => !mustExclude.includes(n)).length;
    }, 0);
    const totalCapacity = maxSum + inactivePool;
    if (totalCapacity < PICK_COUNT) return false;
    return true;
  }, [useGroupCountMode, minSum, groupCountRanges, groupEnabled, mustInclude, mustExclude]);

  const canDrawFree = useMemo(() => {
    if (mustInclude.length > PICK_COUNT) return false;
    if (poolSize < PICK_COUNT - mustInclude.length) return false;
    if (atLeastOne.length === 0) return true;
    const atLeastOneInPool = atLeastOne.filter((n) => !mustExclude.includes(n));
    return atLeastOneInPool.length >= 1;
  }, [mustInclude, mustExclude, atLeastOne, poolSize]);

  const canDraw = useGroupCountMode ? canDrawByGroupCounts : canDrawFree;

  const handleCategoryChange = useCallback((category: FilterCategory) => {
    setCurrentCategory(category);
  }, []);

  const handleNumberClick = useCallback(
    (num: number) => {
      setFilterStates((prev) => {
        const current = prev[num] ?? "none";
        const includeCount = Object.values(prev).filter((v) => v === "include").length;
        const next =
          current === currentCategory
            ? "none"
            : currentCategory === "include" && includeCount >= PICK_COUNT
              ? prev[num]
              : currentCategory;
        if (currentCategory === "include" && includeCount >= PICK_COUNT && current !== "include")
          return prev;
        return { ...prev, [num]: next };
      });
    },
    [currentCategory]
  );

  const handleGroupCountMinChange = useCallback((groupKey: number, value: number) => {
    setGroupCountRanges((prev) => {
      const cur = prev[groupKey] ?? { min: 0, max: 0 };
      const min = Math.max(0, Math.min(cur.max, value));
      return { ...prev, [groupKey]: { min, max: cur.max } };
    });
  }, []);

  const handleGroupCountMaxChange = useCallback((groupKey: number, value: number) => {
    setGroupCountRanges((prev) => {
      const cur = prev[groupKey] ?? { min: 0, max: 0 };
      const max = Math.min(3, Math.max(cur.min, value));
      return { ...prev, [groupKey]: { min: cur.min, max } };
    });
  }, []);

  const handleToggleGroupEnabled = useCallback((groupKey: number) => {
    setGroupEnabled((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleSeedLotto = useCallback(async () => {
    setSeedLoading(true);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/seed-lotto", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeedMessage({ type: "error", text: data.error ?? "저장 실패" });
        return;
      }
      setSeedMessage({ type: "ok", text: data.message ?? `${data.count}건 저장됨` });
      const listRes = await fetch("/api/lotto?limit=20");
      const listJson = await listRes.json();
      if (!listJson.error && listJson.data)
        setSavedRounds({ data: listJson.data, total: listJson.total ?? 0 });
    } catch {
      setSeedMessage({ type: "error", text: "통신 실패" });
    } finally {
      setSeedLoading(false);
    }
  }, []);

  const handleDraw = useCallback(() => {
    if (!canDraw) return;
    const n = Math.min(MAX_GAMES, Math.max(MIN_GAMES, gameCount));
    const allowedGroup9_45 = selectedGroup9_45Keys.size > 0 ? selectedGroup9_45Keys : null;
    const allowedOddEven = selectedOddEvenKeys.size > 0 ? selectedOddEvenKeys : null;
    const hasPatternConstraint =
      sumMin != null ||
      sumMax != null ||
      maxConsecutivePairs != null ||
      maxConsecutiveRun != null ||
      allowedGroup9_45 != null ||
      allowedOddEven != null ||
      hasPositionLimits;
    const maxRetry = hasPatternConstraint ? 200 : 1;
    setIsDrawing(true);
    setGames([]);
    setSaveDrawnMessage(null);
    setTimeout(() => {
      const results: number[][] = [];
      const forbiddenSetKeys = new Set<string>([
        ...Array.from(exclusionWinningSetKeys),
        ...Array.from(exclusionDrawnSetKeys),
        ...savedDrawnList.map((r) => toSetKey(r)),
      ]);
      const maxSetRetry = 500;
      for (let i = 0; i < n; i++) {
        const alreadyDrawnKeysInBatch = new Set(results.map((r) => toSetKey(r)));
        let result: number[] = [];
        for (let retry = 0; retry < maxRetry * maxSetRetry; retry++) {
          result = useGroupCountMode
            ? drawByGroupCounts(groupCountRanges, groupEnabled, mustInclude, mustExclude, prevRoundExclude)
            : drawLottoNumbers(mustInclude, mustExclude, atLeastOne, prevRoundExclude);
          if (result.length !== PICK_COUNT) continue;
          if (
            !meetsPatternConstraints(
              result,
              sumMin,
              sumMax,
              maxConsecutivePairs,
              allowedGroup9_45,
              allowedOddEven,
              maxConsecutiveRun,
              hasPositionLimits ? positionLimits : null
            )
          )
            continue;
          const key = toSetKey(result);
          if (forbiddenSetKeys.has(key) || alreadyDrawnKeysInBatch.has(key)) continue;
          break;
        }
        if (result.length === PICK_COUNT) results.push(result);
      }
      setGames(results);
      setIsDrawing(false);
      // 번호 뽑은 뒤 현재 설정을 DB에 저장 (게임 수, 번호 선택, 그룹, 합계·연속 사용)
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameCount,
          filterStates,
          groupCounts: groupCountRanges,
          groupEnabled,
          groupAtMost: {},
          patternSettings: {
            sumMin,
            sumMax,
            maxConsecutivePairs,
            maxConsecutiveRun,
            positionLimits,
            group9_45Keys: Array.from(selectedGroup9_45Keys),
            oddEvenKeys: Array.from(selectedOddEvenKeys),
            prevRoundKeys: Array.from(selectedPrevRounds),
          },
        }),
      }).catch(() => {});
    }, 400);
  }, [
    canDraw,
    gameCount,
    useGroupCountMode,
    groupCountRanges,
    groupEnabled,
    mustInclude,
    mustExclude,
    atLeastOne,
    sumMin,
    sumMax,
    maxConsecutivePairs,
    maxConsecutiveRun,
    hasPositionLimits,
    positionLimits,
    selectedGroup9_45Keys,
    selectedOddEvenKeys,
    exclusionWinningSetKeys,
    exclusionDrawnSetKeys,
    prevRoundExclude,
    savedDrawnList,
  ]);

  const scope = {
    games, setGames, gameCount, setGameCount, isDrawing, filterStates, currentCategory,
    groupCountRanges, groupEnabled, seedLoading, seedMessage, activeTab, setActiveTab: (tab: typeof activeTab) => {
      setActiveTab(tab);
      if (tab === "prevRound" || tab === "repeatAppear" || tab === "sum" || tab === "oddEven") loadAllRounds();
    }, sumMin, sumMax,
    maxConsecutivePairs, maxConsecutiveRun, positionLimits, setPositionLimitField, setPositionLimits, hasPositionLimits,
    selectedGroup9_45Keys, toggleGroup9_45Key, runAnalysis, savedRounds, savedRoundsLoading, allRounds, allRoundsLoading, mainTab, setMainTab, analysis, analysisLoading,
    saveDrawnLoading, saveDrawnMessage, fetchDbScreenData, handleDraw, canDraw, nextRound: resolvedNextRound,
    savedDrawnList, setSavedDrawnList, loadSavedDrawn,
    handleCategoryChange, handleNumberClick, handleGroupCountMinChange, handleGroupCountMaxChange, handleToggleGroupEnabled,
    TABS, mustInclude, mustExclude, atLeastOne, useGroupCountMode, poolSize,
    setSaveDrawnMessage, setSaveDrawnLoading, setSavedRounds, setAnalysis, setAnalysisLoading, setSeedMessage, setSeedLoading,
    setSumMin, setSumMax, setMaxConsecutivePairs, setMaxConsecutiveRun,
    selectedOddEvenKeys, toggleOddEvenKey,
    fetchExclusionData,
    prevRoundsOpen, setPrevRoundsOpen, selectedPrevRounds, setSelectedPrevRounds, prevRoundExclude,
    MIN_GAMES, MAX_GAMES, SUM_RANGE, PICK_COUNT,
    AnalysisResultView: (props: { analysis: AnalysisResult }) =>
      React.createElement(AnalysisResultView, {
        ...props,
        rounds: allRounds.map(r => ({ round: r.round, sum: r.n1 + r.n2 + r.n3 + r.n4 + r.n5 + r.n6 })),
        groupPatternCutoffRound,
        setGroupPatternCutoffRound,
        groupPatternMinCount,
        setGroupPatternMinCount,
      }),
    SumHistogramChart,
  };
  return React.createElement(LottoPageMainContent, { scope });
}
