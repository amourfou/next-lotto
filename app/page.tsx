"use client";

import { useState, useCallback, useMemo } from "react";
import LottoBall from "./components/LottoBall";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "./components/NumberFilter";

const MIN = 1;
const MAX = 45;
const PICK_COUNT = 6;

function getInitialFilterStates(): Record<number, NumberFilterState> {
  return {};
}

function drawLottoNumbers(
  mustInclude: number[],
  mustExclude: number[],
  atLeastOne: number[]
): number[] {
  const excludeSet = new Set(mustExclude);
  const includeSet = new Set(mustInclude);
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

export default function Home() {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [filterStates, setFilterStates] = useState<Record<number, NumberFilterState>>(
    getInitialFilterStates
  );
  const [currentCategory, setCurrentCategory] = useState<FilterCategory>("include");

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

  const canDraw = useMemo(() => {
    if (mustInclude.length > PICK_COUNT) return false;
    const poolSize = 45 - mustExclude.length;
    if (poolSize < PICK_COUNT) return false;
    if (atLeastOne.length === 0) return true;
    const atLeastOneInPool = atLeastOne.filter((n) => !mustExclude.includes(n));
    return atLeastOneInPool.length >= 1;
  }, [mustInclude, mustExclude, atLeastOne]);

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

  const handleDraw = useCallback(() => {
    if (!canDraw) return;
    setIsDrawing(true);
    setNumbers([]);
    setTimeout(() => {
      setNumbers(drawLottoNumbers(mustInclude, mustExclude, atLeastOne));
      setIsDrawing(false);
    }, 400);
  }, [mustInclude, mustExclude, atLeastOne, canDraw]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
          로또 번호 뽑기
        </h1>
        <p className="text-slate-400 text-lg">
          1부터 45까지 번호 중 6개를 무작위로 뽑습니다
        </p>
      </div>

      <section className="w-full max-w-md mb-8">
        <h2 className="text-slate-400 font-semibold text-sm mb-3 text-center">
          꼭 넣을 번호 / 꼭 뺄 번호 / 하나는 반드시 포함
        </h2>
        <NumberFilter
          filterStates={filterStates}
          currentCategory={currentCategory}
          onCategoryChange={handleCategoryChange}
          onNumberClick={handleNumberClick}
        />
      </section>

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 min-h-[80px] items-center mb-10">
        {numbers.length === 0 && !isDrawing && (
          <p className="text-slate-500 text-lg">아래 버튼을 눌러 번호를 뽑아보세요</p>
        )}
        {isDrawing && (
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full bg-slate-600 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}
        {numbers.length > 0 &&
          !isDrawing &&
          numbers.map((num, i) => (
            <LottoBall key={i} number={num} index={i} />
          ))}
      </div>

      <button
        onClick={handleDraw}
        disabled={isDrawing || !canDraw}
        className="px-8 py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {isDrawing ? "뽑는 중..." : "번호 뽑기"}
      </button>
      {!canDraw && (mustInclude.length > PICK_COUNT || mustExclude.length > 39) && (
        <p className="mt-2 text-amber-400/90 text-sm">
          꼭 넣을 번호는 최대 6개, 꼭 뺄 번호는 최대 39개까지 가능합니다
        </p>
      )}
      {!canDraw && atLeastOne.length > 0 && atLeastOne.every((n) => mustExclude.includes(n)) && (
        <p className="mt-2 text-amber-400/90 text-sm">
          &quot;하나 포함&quot; 번호 중 꼭 뺄 번호에 없는 번호가 최소 1개 있어야 합니다
        </p>
      )}

      {numbers.length > 0 && !isDrawing && (
        <p className="mt-6 text-slate-500 text-sm">
          뽑힌 번호: {numbers.join(", ")}
        </p>
      )}
    </main>
  );
}
