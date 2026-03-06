"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import LottoBall from "./components/LottoBall";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "./components/NumberFilter";
import { getNumbersInGroup } from "./components/GroupExclude";
import GroupCountSelector, {
  getDefaultGroupCounts,
  getDefaultGroupEnabled,
  getDefaultGroupAtMost,
  sumGroupCounts,
  type GroupCounts,
  type GroupEnabled,
  type GroupAtMost,
} from "./components/GroupCountSelector";

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
  // 꼭 넣을 번호는 무조건 결과에 포함 (그룹 모드에서도)
  const result = [...mustInclude];
  const resultSet = new Set(result);

  // 1) 지정(정확히) 그룹: 필요한 개수만큼 채움 (이미 result에 있는 해당 그룹 번호는 제외하고 부족분만)
  for (const key of GROUP_KEYS) {
    if (!groupEnabled[key] || (groupAtMost[key] ?? false)) continue;
    const need = groupCounts[key] ?? 0;
    if (need === 0) continue;

    const groupNums = getNumbersInGroup(key);
    const alreadyInResult = result.filter((n) => groupNums.includes(n));
    if (alreadyInResult.length > need) continue; // 제약 위반이면 해당 그룹은 스킵
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
    // 채우기 전에 이미 result에 있는 이하 그룹 개수 반영 (꼭 넣을 번호·지정 그룹에서 온 것)
    const countByAtMostGroup: Record<number, number> = { 9: 0, 18: 0, 27: 0, 36: 0, 45: 0 };
    for (const key of GROUP_KEYS) {
      if (groupEnabled[key] && (groupAtMost[key] ?? false)) {
        countByAtMostGroup[key] = result.filter((n) => getNumbersInGroup(key).includes(n)).length;
      }
    }
    for (let i = 0; i < needFill && fillPool.length > 0; i++) {
      // 이하 상한에 도달한 그룹 번호는 골라도 되는 후보에서 제외
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

export default function Home() {
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

  // 저장된 설정(이전 회차) 불러오기
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
    { id: "number" as const, label: "번호 선택 (넣을/뺄/하나 포함)" },
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
      if (atMost) continue; // 이하 그룹은 채우기 단계에서만 사용
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
      setSeedMessage({ type: "ok", text: data.message ?? `${data.count}개 회차 저장됨` });
      const listRes = await fetch("/api/lotto?limit=20");
      const listJson = await listRes.json();
      if (!listJson.error && listJson.data)
        setSavedRounds({ data: listJson.data, total: listJson.total ?? 0 });
    } catch {
      setSeedMessage({ type: "error", text: "요청 실패" });
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
      // 번호 뽑은 뒤 현재 설정을 회차로 DB 저장 (게임 수, 번호 선택, 그룹, 합계·연속 포함)
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

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-12">
      {/* ========== 상단: 번호 뽑기 ========== */}
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
          로또 번호 뽑기
        </h1>
        <p className="text-slate-400 text-lg">
          1부터 45까지 번호 중 6개를 무작위로 뽑습니다
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <span className="text-slate-400 text-sm">게임 수</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={gameCount <= MIN_GAMES || isDrawing}
            onClick={() => setGameCount((c) => Math.max(MIN_GAMES, c - 1))}
            className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 font-bold text-sm"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_GAMES}
            max={MAX_GAMES}
            value={gameCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setGameCount(Math.min(MAX_GAMES, Math.max(MIN_GAMES, v)));
            }}
            className="w-14 text-center rounded-lg bg-slate-700 text-white font-semibold py-1.5 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            disabled={gameCount >= MAX_GAMES || isDrawing}
            onClick={() => setGameCount((c) => Math.min(MAX_GAMES, c + 1))}
            className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 font-bold text-sm"
          >
            +
          </button>
        </div>
        <span className="text-slate-500 text-xs">(1~{MAX_GAMES})</span>
        <button
          onClick={handleDraw}
          disabled={isDrawing || !canDraw}
          className="ml-1 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isDrawing ? "뽑는 중..." : `${gameCount}게임 뽑기`}
        </button>
        <button
          type="button"
          disabled={games.length === 0}
          onClick={() => {
            const nextRound = (savedRounds?.data?.[0]?.round ?? 0) + 1;
            const lines = [
              `for ${nextRound}`,
              "================================ ",
              ...games.map(
                (nums, i) =>
                  ` ${String(i + 1).padStart(2)} : [ ${nums.map((n) => String(n).padStart(2)).join(", ")} ], `
              ),
              "================================",
            ];
            navigator.clipboard.writeText(lines.join("\n"));
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          클립보드에 복사
        </button>
        <button
          type="button"
          disabled={games.length === 0 || saveDrawnLoading}
          onClick={async () => {
            setSaveDrawnMessage(null);
            setSaveDrawnLoading(true);
            try {
              const res = await fetch("/api/lotto/save-drawn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ games }),
              });
              const data = await res.json();
              if (!res.ok) {
                setSaveDrawnMessage({ type: "error", text: data.error ?? "저장 실패" });
                return;
              }
              setSaveDrawnMessage({ type: "ok", text: data.message ?? "저장됨" });
              const listRes = await fetch("/api/lotto?limit=20");
              const listJson = await listRes.json();
              if (!listJson.error && listJson.data)
                setSavedRounds({ data: listJson.data, total: listJson.total ?? 0 });
            } catch {
              setSaveDrawnMessage({ type: "error", text: "요청 실패" });
            } finally {
              setSaveDrawnLoading(false);
            }
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveDrawnLoading ? "저장 중..." : "DB에 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowDbScreen(true);
            fetchDbScreenData();
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
        >
          당첨번호 DB
        </button>
      </div>
      {saveDrawnMessage && (
        <p
          className={`text-center text-sm mt-1 ${
            saveDrawnMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {saveDrawnMessage.text}
        </p>
      )}

      {showDbScreen ? (
        /* ========== DB 화면 ========== */
        <div className="w-full max-w-2xl mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowDbScreen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
            >
              ← 닫기
            </button>
            <button
              type="button"
              onClick={async () => {
                setSeedLoading(true);
                setSeedMessage(null);
                try {
                  const res = await fetch("/api/seed-lotto", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) {
                    setSeedMessage({ type: "error", text: data.error ?? "저장 실패" });
                    return;
                  }
                  setSeedMessage({ type: "ok", text: data.message ?? "저장됨" });
                  fetchDbScreenData();
                } catch {
                  setSeedMessage({ type: "error", text: "요청 실패" });
                } finally {
                  setSeedLoading(false);
                }
              }}
              disabled={seedLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
            >
              {seedLoading ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={async () => {
                setAnalysisLoading(true);
                try {
                  const res = await fetch("/api/analyze-lotto", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) {
                    setSeedMessage({ type: "error", text: data.error ?? "분석 실패" });
                    return;
                  }
                  setSeedMessage({ type: "ok", text: data.message ?? "분석 완료" });
                  const aRes = await fetch("/api/lotto/analysis");
                  const aJson = await aRes.json();
                  if (aJson.analysis) setAnalysis(aJson.analysis);
                } catch {
                  setSeedMessage({ type: "error", text: "분석 요청 실패" });
                } finally {
                  setAnalysisLoading(false);
                }
              }}
              disabled={analysisLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
            >
              {analysisLoading ? "분석 중..." : "분석"}
            </button>
          </div>
          {seedMessage && (
            <p
              className={`text-center text-sm ${
                seedMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {seedMessage.text}
            </p>
          )}
          <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 p-4 min-h-[120px]">
            {savedRounds && savedRounds.total > 0 ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-sm">
                  저장된 당첨 번호: 총 {savedRounds.total}회차 (최근 {savedRounds.data[0]?.round ?? "-"}회)
                </p>
                {analysis ? (
                  <AnalysisResultView analysis={analysis} />
                ) : (
                  <p className="text-slate-500 text-sm">분석 버튼을 누르면 당첨 번호 패턴을 분석해 저장합니다.</p>
                )}
              </div>
            ) : !analysis ? (
              <p className="text-slate-500 text-sm text-center py-6">
                저장된 회차가 없습니다. 저장 버튼으로 LottoNumber.txt를 불러와 저장한 뒤 분석할 수 있습니다.
              </p>
            ) : (
              <AnalysisResultView analysis={analysis} />
            )}
          </div>
        </div>
      ) : (
        <>
      {seedMessage && (
        <p
          className={`text-center text-sm mb-1 ${
            seedMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {seedMessage.text}
        </p>
      )}

      <div className="w-full max-w-2xl min-h-[80px] mb-4">
        {games.length === 0 && !isDrawing && (
          <p className="text-slate-500 text-center py-4 text-sm">게임 수를 선택하고 위 버튼으로 번호를 뽑아보세요</p>
        )}
        {isDrawing && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: Math.min(gameCount, 10) }).map((_, row) => (
              <div key={row} className="flex justify-center gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-slate-600 animate-pulse"
                    style={{ animationDelay: `${(row * 6 + i) * 30}ms` }}
                  />
                ))}
              </div>
            ))}
            {gameCount > 10 && (
              <p className="text-slate-500 text-xs text-center">뽑는 중...</p>
            )}
          </div>
        )}
        {games.length > 0 && !isDrawing && (
          <div className="flex flex-col gap-2">
            <p className="text-slate-500 text-xs text-center mb-1">
              그룹별 색: 1~9 노랑 · 10~18 초록 · 19~27 하늘 · 28~36 보라 · 37~45 로즈
            </p>
            {games.map((nums, row) => (
              <div key={row} className="flex flex-wrap justify-center gap-1.5 md:gap-2 items-center">
                <span className="text-slate-500 text-xs w-5">{row + 1}.</span>
                {nums.map((num, i) => (
                  <LottoBall key={i} number={num} index={i} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {!canDraw && (mustInclude.length > PICK_COUNT || mustExclude.length > 39) && (
        <p className="mt-2 text-amber-400/90 text-sm text-center">
          꼭 넣을 번호는 최대 6개, 꼭 뺄 번호는 최대 39개까지 가능합니다
        </p>
      )}
      {!canDraw && atLeastOne.length > 0 && atLeastOne.every((n) => mustExclude.includes(n)) && (
        <p className="mt-2 text-amber-400/90 text-sm text-center">
          &quot;하나 포함&quot; 번호 중 뽑기에 사용 가능한 번호가 최소 1개 있어야 합니다
        </p>
      )}
      {!canDraw && !useGroupCountMode && poolSize < PICK_COUNT && (
        <p className="mt-2 text-amber-400/90 text-sm text-center">
          사용 가능 번호가 부족합니다 (현재 {poolSize}개)
        </p>
      )}
      {useGroupCountMode && !canDraw && (
        <p className="mt-2 text-amber-400/90 text-sm text-center">
          체크한 그룹별로 꼭 넣을 번호가 개수 안에 있어야 하며, 나머지 칸을 채울 번호가 부족하면 뽑기가 불가합니다.
        </p>
      )}
      {games.length > 0 && !isDrawing && (
        <p className="mt-3 text-slate-500 text-sm">총 {games.length}게임 뽑힘</p>
      )}

      {/* ========== 저장된 당첨 번호 (DB) 요약만 ========== */}
      <section className="w-full max-w-2xl mt-6">
        {savedRoundsLoading ? (
          <p className="text-slate-500 text-sm text-center">불러오는 중...</p>
        ) : savedRounds && savedRounds.total > 0 ? (
          <p className="text-slate-400 text-sm text-center">
            저장된 당첨 번호: 총 {savedRounds.total}회차 (최근 {savedRounds.data[0]?.round ?? "-"}회)
          </p>
        ) : (
          <p className="text-slate-500 text-sm text-center">
            저장된 회차 없음. 당첨번호 DB 버튼으로 불러와 저장하세요.
          </p>
        )}
      </section>

      {/* ========== 하단: 탭 (설정) ========== */}
      <section className="w-full max-w-2xl mt-10">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-500/90 text-slate-900 ring-2 ring-amber-400"
                  : "bg-slate-600/80 text-slate-300 hover:bg-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 p-4 min-h-[140px]">
          {activeTab === "number" && (
            <div>
              <h2 className="text-slate-400 font-semibold text-sm mb-3 text-center">
                꼭 넣을 번호 / 꼭 뺄 번호 / 하나는 반드시 포함
              </h2>
              <NumberFilter
                filterStates={filterStates}
                currentCategory={currentCategory}
                onCategoryChange={handleCategoryChange}
                onNumberClick={handleNumberClick}
              />
            </div>
          )}
          {activeTab === "group" && (
            <div>
              <GroupCountSelector
                groupCounts={groupCounts}
                groupEnabled={groupEnabled}
                groupAtMost={groupAtMost}
                onChange={handleGroupCountChange}
                onToggleEnabled={handleToggleGroupEnabled}
                onSetAtMost={handleSetGroupAtMost}
              />
            </div>
          )}
          {activeTab === "sum" && (
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                합계 제한 (6개 번호 합, 비우면 제한 없음)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">합계 최소 (21~255)</label>
                  <input
                    type="number"
                    min={SUM_RANGE.min}
                    max={SUM_RANGE.max}
                    value={sumMin ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "") { setSumMin(null); return; }
                      const v = parseInt(e.target.value, 10);
                      setSumMin(Number.isNaN(v) ? null : Math.min(SUM_RANGE.max, Math.max(SUM_RANGE.min, v)));
                    }}
                    placeholder="제한 없음"
                    className="w-full rounded-lg bg-slate-700 text-white px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1">합계 최대 (21~255)</label>
                  <input
                    type="number"
                    min={SUM_RANGE.min}
                    max={SUM_RANGE.max}
                    value={sumMax ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "") { setSumMax(null); return; }
                      const v = parseInt(e.target.value, 10);
                      setSumMax(Number.isNaN(v) ? null : Math.min(SUM_RANGE.max, Math.max(SUM_RANGE.min, v)));
                    }}
                    placeholder="제한 없음"
                    className="w-full rounded-lg bg-slate-700 text-white px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <p className="text-slate-500 text-xs text-center">번호를 뽑은 뒤 다른 설정과 함께 DB에 저장됩니다.</p>
            </div>
          )}
          {activeTab === "consecutive" && (
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                연속 번호 제한 (비우면 제한 없음)
              </h2>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1">연속 번호 최대 쌍 수 (0~5)</label>
                <select
                  value={maxConsecutivePairs ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                    setMaxConsecutivePairs(v);
                  }}
                  className="w-full rounded-lg bg-slate-700 text-white px-3 py-2 text-sm"
                >
                  <option value="">제한 없음</option>
                  {[0, 1, 2, 3, 4, 5].map((k) => (
                    <option key={k} value={k}>
                      최대 {k}쌍
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-2">연속된 번호 쌍(예: 3,4 또는 10,11)이 최대 몇 쌍까지 허용할지 설정합니다.</p>
              </div>
              <p className="text-slate-500 text-xs text-center">번호를 뽑은 뒤 다른 설정과 함께 DB에 저장됩니다.</p>
            </div>
          )}
        </div>
      </section>
        </>
      )}
    </main>
  );
}
