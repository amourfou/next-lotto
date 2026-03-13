"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import LottoBall from "../components/LottoBall";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "../components/NumberFilter";
import { getNumbersInGroup } from "../components/GroupExclude";
import GroupCountSelector, {
  getDefaultGroupCounts,
  getDefaultGroupEnabled,
  getDefaultGroupAtMost,
  sumGroupCounts,
  type GroupCounts,
  type GroupEnabled,
  type GroupAtMost,
} from "../components/GroupCountSelector";
import { LottoPagePart1 } from "./LottoPagePart1";
import { LottoPageMainContent } from "./LottoPageMainContent";

const MIN = 1;
const MAX = 45;
const PICK_COUNT = 6;
const SUM_RANGE = { min: 21, max: 255 }; // 1+2+3+4+5+6 ~ 40+41+42+43+44+45

function getConsecutivePairs(nums: number[]): number {
  const arr = [...nums].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) pairs += 1;
  }
  return pairs;
}

function meetsPatternConstraints(
  nums: number[],
  sumMin: number | null,
  sumMax: number | null,
  maxConsecutivePairs: number | null
): boolean {
  if (nums.length !== PICK_COUNT) return false;
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sumMin != null && sum < sumMin) return false;
  if (sumMax != null && sum > sumMax) return false;
  if (maxConsecutivePairs != null && getConsecutivePairs(nums) > maxConsecutivePairs) return false;
  return true;
}

type AnalysisResult = {
  totalRounds: number;
  hot: number[];
  cold: number[];
  sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> };
  consecutivePattern?: {
    avgConsecutivePairs: number;
    avgMaxRun: number;
    pairDistribution: Record<number, number>;
    maxRunDistribution: Record<number, number>;
  };
  updatedAt: string;
};

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

function AnalysisResultView({ analysis }: { analysis: AnalysisResult }) {
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
          <p className="text-slate-400 text-xs font-medium">합계 패턴 (6개 번호 합)</p>
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
  atLeastOne: number[]
): number[] {
  const excludeSet = new Set(mustExclude);
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

function drawByGroupCounts(
  groupCounts: GroupCounts,
  groupEnabled: GroupEnabled,
  groupAtMost: GroupAtMost,
  mustInclude: number[],
  mustExclude: number[]
): number[] {
  const excludeSet = new Set(mustExclude);
  // 꼭 넣을 번호·조건 결과로 채움 (그룹 모드에서)
  const result = [...mustInclude];
  const resultSet = new Set(result);

  // 1) 먼저 채울 그룹: 필요한 개수만큼 뽑기 (이미 result에 든 해당 그룹 번호는 제외하고 조건 검사)
  for (const key of GROUP_KEYS) {
    if (!groupEnabled[key] || (groupAtMost[key] ?? false)) continue;
    const need = groupCounts[key] ?? 0;
    if (need === 0) continue;

    const groupNums = getNumbersInGroup(key);
    const alreadyInResult = result.filter((n) => groupNums.includes(n));
    if (alreadyInResult.length > need) continue; // 초과 채웠으면 해당 그룹은 스킵
    const toPick = need - alreadyInResult.length;
    if (toPick <= 0) continue;

    const pool = groupNums.filter((n) => !excludeSet.has(n) && !resultSet.has(n));
    if (pool.length < toPick) continue;

    for (let i = 0; i < toPick && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const num = pool[idx];
      result.push(num);
      resultSet.add(num);
      pool.splice(idx, 1);
    }
  }

  const needFill = PICK_COUNT - result.length;
  if (needFill > 0) {
    const excludeFromFill = new Set<number>();
    for (const key of GROUP_KEYS) {
      if (groupEnabled[key] && (groupCounts[key] ?? 0) === 0 && !(groupAtMost[key] ?? false)) {
        for (const n of getNumbersInGroup(key)) excludeFromFill.add(n);
      }
    }
    let fillPool = Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).filter(
      (n) =>
        !excludeSet.has(n) &&
        !resultSet.has(n) &&
        !excludeFromFill.has(n)
    );
    // 뽑을 때 이미 result에 든 나머지 그룹 개수 반영 (꼭 넣을 번호·제외 그룹에서 계산)
    const countByAtMostGroup: Record<number, number> = { 9: 0, 18: 0, 27: 0, 36: 0, 45: 0 };
    for (const key of GROUP_KEYS) {
      if (groupEnabled[key] && (groupAtMost[key] ?? false)) {
        countByAtMostGroup[key] = result.filter((n) => getNumbersInGroup(key).includes(n)).length;
      }
    }
    for (let i = 0; i < needFill && fillPool.length > 0; i++) {
      // 나머지 채울 때 넘치는 그룹 번호와 겹치는 놈부터 제거
      const validPool = fillPool.filter((n) => {
        for (const key of GROUP_KEYS) {
          if (
            groupEnabled[key] &&
            (groupAtMost[key] ?? false) &&
            getNumbersInGroup(key).includes(n)
          ) {
            if ((countByAtMostGroup[key] ?? 0) >= (groupCounts[key] ?? 0)) return false;
          }
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
        if (groupEnabled[key] && (groupAtMost[key] ?? false) && getNumbersInGroup(key).includes(num)) {
          countByAtMostGroup[key] = (countByAtMostGroup[key] ?? 0) + 1;
          if (countByAtMostGroup[key] >= (groupCounts[key] ?? 0)) {
            fillPool = fillPool.filter((n) => !getNumbersInGroup(key).includes(n));
          }
          break;
        }
      }
    }
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
  const [groupCounts, setGroupCounts] = useState<GroupCounts>(getDefaultGroupCounts);
  const [groupEnabled, setGroupEnabled] = useState<GroupEnabled>(getDefaultGroupEnabled);
  const [groupAtMost, setGroupAtMost] = useState<GroupAtMost>(getDefaultGroupAtMost);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"number" | "group" | "sum" | "consecutive">("number");
  const [sumMin, setSumMin] = useState<number | null>(null);
  const [sumMax, setSumMax] = useState<number | null>(null);
  const [maxConsecutivePairs, setMaxConsecutivePairs] = useState<number | null>(null);
  const [savedRounds, setSavedRounds] = useState<{
    data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[];
    total: number;
  } | null>(null);
  const [savedRoundsLoading, setSavedRoundsLoading] = useState(true);
  const [showDbScreen, setShowDbScreen] = useState(false);
  const [analysis, setAnalysis] = useState<{
    totalRounds: number;
    hot: number[];
    cold: number[];
    sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> };
    consecutivePattern?: {
      avgConsecutivePairs: number;
      avgMaxRun: number;
      pairDistribution: Record<number, number>;
      maxRunDistribution: Record<number, number>;
    };
    updatedAt: string;
  } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [saveDrawnLoading, setSaveDrawnLoading] = useState(false);
  const [saveDrawnMessage, setSaveDrawnMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const fetchDbScreenData = useCallback(() => {
    fetch("/api/lotto?limit=20")
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setSavedRounds({ data: json.data ?? [], total: json.total ?? 0 });
      })
      .catch(() => setSavedRounds(null));
    fetch("/api/lotto/analysis")
      .then((res) => res.json())
      .then((json) => {
        if (json.analysis) setAnalysis(json.analysis);
        else setAnalysis(null);
      })
      .catch(() => setAnalysis(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSavedRoundsLoading(true);
    fetch("/api/lotto?limit=20")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setSavedRounds(null);
          return;
        }
        setSavedRounds({ data: json.data ?? [], total: json.total ?? 0 });
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
          const next: GroupCounts = { ...getDefaultGroupCounts() };
          for (const key of numKeys) {
            const v = s.groupCounts[key] ?? s.groupCounts[String(key)];
            if (typeof v === "number" && v >= 0 && v <= 6) next[key] = v;
          }
          setGroupCounts(next);
        }
        if (s.groupEnabled && typeof s.groupEnabled === "object") {
          const next: GroupEnabled = { ...getDefaultGroupEnabled() };
          for (const key of numKeys) {
            const v = s.groupEnabled[key] ?? s.groupEnabled[String(key)];
            if (typeof v === "boolean") next[key] = v;
          }
          setGroupEnabled(next);
        }
        if (s.groupAtMost && typeof s.groupAtMost === "object") {
          const next: GroupAtMost = { ...getDefaultGroupAtMost() };
          for (const key of numKeys) {
            const v = s.groupAtMost[key] ?? s.groupAtMost[String(key)];
            if (typeof v === "boolean") next[key] = v;
          }
          setGroupAtMost(next);
        }
        const ps = s.patternSettings;
        if (ps && typeof ps === "object") {
          if (typeof ps.sumMin === "number" && ps.sumMin >= SUM_RANGE.min && ps.sumMin <= SUM_RANGE.max) setSumMin(ps.sumMin);
          if (typeof ps.sumMax === "number" && ps.sumMax >= SUM_RANGE.min && ps.sumMax <= SUM_RANGE.max) setSumMax(ps.sumMax);
          if (typeof ps.maxConsecutivePairs === "number" && ps.maxConsecutivePairs >= 0 && ps.maxConsecutivePairs <= 5) setMaxConsecutivePairs(ps.maxConsecutivePairs);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const TABS = [
    { id: "number" as const, label: "번호 선택 (포함/제외 또는 사용)" },
    { id: "group" as const, label: "그룹별 개수" },
    { id: "sum" as const, label: "합계" },
    { id: "consecutive" as const, label: "연속" },
  ];

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

  const enabledSum = useMemo(
    () => sumGroupCounts(groupCounts, groupEnabled),
    [groupCounts, groupEnabled]
  );
  const exactSum = useMemo(
    () =>
      GROUP_KEYS.reduce(
        (s, key) =>
          s + (groupEnabled[key] && !(groupAtMost[key] ?? false) ? groupCounts[key] ?? 0 : 0),
        0
      ),
    [groupCounts, groupEnabled, groupAtMost]
  );
  const hasExcludedGroups =
    GROUP_KEYS.some(
      (key) =>
        groupEnabled[key] &&
        (groupCounts[key] ?? 0) === 0 &&
        !(groupAtMost[key] ?? false)
    );
  const useGroupCountMode = enabledSum > 0 || hasExcludedGroups;

  useEffect(() => {
    if (exactSum <= PICK_COUNT) return;
    setGroupEnabled((prev) => {
      const next = { ...prev };
      for (const key of [45, 36, 27, 18, 9] as const) {
        if (next[key] && !(groupAtMost[key] ?? false)) {
          next[key] = false;
          const newExact = GROUP_KEYS.reduce(
            (s, k) =>
              s + (next[k] && !(groupAtMost[k] ?? false) ? groupCounts[k] ?? 0 : 0),
            0
          );
          if (newExact <= PICK_COUNT) return next;
        }
      }
      return next;
    });
  }, [exactSum, groupCounts, groupAtMost]);

  const canDrawByGroupCounts = useMemo(() => {
    if (!useGroupCountMode) return false;
    let totalFromGroups = 0;
    let excludeFromFillCount = 0;
    for (const key of GROUP_KEYS) {
      if (!groupEnabled[key]) continue;
      const need = groupCounts[key] ?? 0;
      const atMost = groupAtMost[key] ?? false;
      if (need === 0 && !atMost) {
        excludeFromFillCount += getNumbersInGroup(key).length;
        continue;
      }
      if (atMost) continue; // 나머지 그룹은 뽑을 개수에서만 사용
      const groupNums = getNumbersInGroup(key);
      const available = groupNums.filter((n) => !mustExclude.includes(n)).length;
      if (available < need) return false;
      const mustInGroup = mustInclude.filter((n) => groupNums.includes(n)).length;
      if (mustInGroup > need) return false;
      totalFromGroups += need;
    }
    const needFill = PICK_COUNT - totalFromGroups;
    if (needFill <= 0) return true;
    const fillPoolSize = 45 - mustExclude.length - totalFromGroups - excludeFromFillCount;
    return fillPoolSize >= needFill;
  }, [useGroupCountMode, groupCounts, groupEnabled, groupAtMost, mustInclude, mustExclude]);

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

  const handleGroupCountChange = useCallback((groupKey: number, value: number) => {
    setGroupCounts((prev) => ({ ...prev, [groupKey]: value }));
  }, []);

  const handleToggleGroupEnabled = useCallback((groupKey: number) => {
    setGroupEnabled((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleSetGroupAtMost = useCallback((groupKey: number, atMost: boolean) => {
    setGroupAtMost((prev) => ({ ...prev, [groupKey]: atMost }));
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
    const hasPatternConstraint = sumMin != null || sumMax != null || maxConsecutivePairs != null;
    const maxRetry = hasPatternConstraint ? 200 : 1;
    setIsDrawing(true);
    setGames([]);
    setSaveDrawnMessage(null);
    setTimeout(() => {
      const results: number[][] = [];
      for (let i = 0; i < n; i++) {
        let result: number[] = [];
        for (let retry = 0; retry < maxRetry; retry++) {
          result = useGroupCountMode
            ? drawByGroupCounts(
                groupCounts,
                groupEnabled,
                groupAtMost,
                mustInclude,
                mustExclude
              )
            : drawLottoNumbers(mustInclude, mustExclude, atLeastOne);
          if (result.length === PICK_COUNT && meetsPatternConstraints(result, sumMin, sumMax, maxConsecutivePairs)) break;
        }
        results.push(result);
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
          groupCounts,
          groupEnabled,
          groupAtMost,
          patternSettings: { sumMin, sumMax, maxConsecutivePairs },
        }),
      }).catch(() => {});
    }, 400);
  }, [
    canDraw,
    gameCount,
    useGroupCountMode,
    groupCounts,
    groupEnabled,
    groupAtMost,
    mustInclude,
    mustExclude,
    atLeastOne,
    sumMin,
    sumMax,
    maxConsecutivePairs,
  ]);

  const scope = {
    games, setGames, gameCount, setGameCount, isDrawing, filterStates, currentCategory,
    groupCounts, groupEnabled, groupAtMost, seedLoading, seedMessage, activeTab, sumMin, sumMax,
    maxConsecutivePairs, savedRounds, savedRoundsLoading, showDbScreen, analysis, analysisLoading,
    saveDrawnLoading, saveDrawnMessage, fetchDbScreenData, handleDraw, canDraw,
    handleCategoryChange, handleNumberClick, handleGroupCountChange, handleToggleGroupEnabled, handleSetGroupAtMost,
    TABS, mustInclude, mustExclude, atLeastOne, useGroupCountMode, poolSize,
    setSaveDrawnMessage, setSaveDrawnLoading, setSavedRounds, setAnalysis, setAnalysisLoading, setSeedMessage, setSeedLoading, setShowDbScreen,
    MIN_GAMES, MAX_GAMES, SUM_RANGE, PICK_COUNT, AnalysisResultView,
  };
  return React.createElement(LottoPageMainContent, { scope });
}
