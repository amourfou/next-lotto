"use client";

import React, { useCallback, useState } from "react";
import LottoBall from "../components/LottoBall";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "../components/NumberFilter";
import GroupCountSelector from "../components/GroupCountSelector";
import { LottoPagePart1 } from "./LottoPagePart1";

type Scope = {
  games: number[][];
  setGames: (v: number[][] | ((prev: number[][]) => number[][])) => void;
  gameCount: number;
  setGameCount: (v: number | ((c: number) => number)) => void;
  isDrawing: boolean;
  filterStates: Record<number, NumberFilterState>;
  currentCategory: FilterCategory;
  groupCounts: Record<number, number>;
  groupEnabled: Record<number, boolean>;
  groupAtMost: Record<number, boolean>;
  seedLoading: boolean;
  seedMessage: { type: "ok" | "error"; text: string } | null;
  activeTab: "number" | "group" | "group9_45" | "sum" | "consecutive";
  sumMin: number | null;
  sumMax: number | null;
  maxConsecutivePairs: number | null;
  selectedGroup9_45Keys: Set<string>;
  toggleGroup9_45Key: (key: string) => void;
  runAnalysis: () => void;
  savedRounds: { data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]; total: number } | null;
  savedRoundsLoading: boolean;
  showDbScreen: boolean;
  analysis: { totalRounds: number; hot: number[]; cold: number[]; sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> }; group9_45Distribution?: Record<string, number>; consecutivePattern?: { avgConsecutivePairs: number; avgMaxRun: number; pairDistribution: Record<number, number>; maxRunDistribution: Record<number, number> }; updatedAt: string } | null;
  analysisLoading: boolean;
  saveDrawnLoading: boolean;
  saveDrawnMessage: { type: "ok" | "error"; text: string } | null;
  fetchDbScreenData: () => void;
  handleDraw: () => void;
  canDraw: boolean;
  handleCategoryChange: (category: FilterCategory) => void;
  handleNumberClick: (num: number) => void;
  handleGroupCountChange: (groupKey: number, value: number) => void;
  handleToggleGroupEnabled: (groupKey: number) => void;
  handleSetGroupAtMost: (groupKey: number, atMost: boolean) => void;
  TABS: { id: "number" | "group" | "group9_45" | "sum" | "consecutive"; label: string }[];
  mustInclude: number[];
  mustExclude: number[];
  atLeastOne: number[];
  useGroupCountMode: boolean;
  poolSize: number;
  setSaveDrawnMessage: (v: { type: "ok" | "error"; text: string } | null) => void;
  setSaveDrawnLoading: (v: boolean) => void;
  setSavedRounds: (v: { data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]; total: number } | null) => void;
  setAnalysis: (v: Scope["analysis"]) => void;
  setAnalysisLoading: (v: boolean) => void;
  setSeedMessage: (v: { type: "ok" | "error"; text: string } | null) => void;
  setSeedLoading: (v: boolean) => void;
  setShowDbScreen: (v: boolean) => void;
  setSumMin: (v: number | null) => void;
  setSumMax: (v: number | null) => void;
  setMaxConsecutivePairs: (v: number | null) => void;
  setActiveTab: (v: "number" | "group" | "group9_45" | "sum" | "consecutive") => void;
  fetchExclusionData: () => void;
  nextRound: number;
  MIN_GAMES: number;
  MAX_GAMES: number;
  SUM_RANGE: { min: number; max: number };
  PICK_COUNT: number;
  AnalysisResultView: React.ComponentType<{ analysis: NonNullable<Scope["analysis"]> }>;
  SumHistogramChart: React.ComponentType<{
    histogram: Record<number, number>;
    avg: number;
    sumMin?: number | null;
    sumMax?: number | null;
    setSumMin?: (v: number | null) => void;
    setSumMax?: (v: number | null) => void;
    showFilter?: boolean;
  }>;
};

export function LottoPageMainContent({ scope }: { scope: Record<string, unknown> }) {
  const s = scope as unknown as Scope;

  const [showWinningForm, setShowWinningForm] = useState(false);
  const [nextWinningRound, setNextWinningRound] = useState<number | null>(null);
  const [mainNums, setMainNums] = useState<string[]>(() => Array(6).fill(""));
  const [bonusNum, setBonusNum] = useState("");
  const [addWinningLoading, setAddWinningLoading] = useState(false);
  const [addWinningMessage, setAddWinningMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );

  const openWinningForm = useCallback(async () => {
    setShowWinningForm(true);
    setAddWinningMessage(null);
    setMainNums(Array(6).fill(""));
    setBonusNum("");
    try {
      const res = await fetch("/api/lotto/add-winning", { cache: "no-store" });
      const j = (await res.json()) as { nextRound?: number };
      if (typeof j.nextRound === "number") setNextWinningRound(j.nextRound);
      else {
        const latest = s.savedRounds?.data?.[0]?.round ?? 0;
        setNextWinningRound(latest > 0 ? latest + 1 : 1);
      }
    } catch {
      const latest = s.savedRounds?.data?.[0]?.round ?? 0;
      setNextWinningRound(latest > 0 ? latest + 1 : 1);
    }
  }, [s.savedRounds]);

  const saveWinningRound = async () => {
    setAddWinningMessage(null);
    const parsed: number[] = [];
    for (let i = 0; i < 6; i++) {
      const v = parseInt(mainNums[i]?.trim() ?? "", 10);
      if (Number.isNaN(v) || v < 1 || v > 45) {
        setAddWinningMessage({ type: "error", text: `당첨 번호 ${i + 1}번째: 1~45 숫자를 입력하세요.` });
        return;
      }
      parsed.push(v);
    }
    const bonus = parseInt(bonusNum.trim(), 10);
    if (Number.isNaN(bonus) || bonus < 1 || bonus > 45) {
      setAddWinningMessage({ type: "error", text: "보너스 번호는 1~45 숫자여야 합니다." });
      return;
    }
    setAddWinningLoading(true);
    try {
      const res = await fetch("/api/lotto/add-winning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: parsed, bonus }),
      });
      const data = (await res.json()) as { error?: string; message?: string; round?: number };
      if (!res.ok) {
        setAddWinningMessage({ type: "error", text: data.error ?? "저장 실패" });
        return;
      }
      setAddWinningMessage({ type: "ok", text: data.message ?? "저장됨" });
      setMainNums(Array(6).fill(""));
      setBonusNum("");
      s.fetchDbScreenData();
      s.fetchExclusionData();
      const nr = await fetch("/api/lotto/add-winning", { cache: "no-store" }).then((r) => r.json());
      if (typeof nr.nextRound === "number") setNextWinningRound(nr.nextRound);
    } catch {
      setAddWinningMessage({ type: "error", text: "통신 실패" });
    } finally {
      setAddWinningLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-12">
      {LottoPagePart1}

      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <span className="text-slate-400 text-sm">게임 수</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={s.gameCount <= s.MIN_GAMES || s.isDrawing}
            onClick={() => s.setGameCount((c) => Math.max(s.MIN_GAMES, c - 1))}
            className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 font-bold text-sm"
          >
            −
          </button>
          <input
            type="number"
            min={s.MIN_GAMES}
            max={s.MAX_GAMES}
            value={s.gameCount}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) s.setGameCount(Math.min(s.MAX_GAMES, Math.max(s.MIN_GAMES, v)));
            }}
            className="w-14 text-center rounded-lg bg-slate-700 text-white font-semibold py-1.5 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            disabled={s.gameCount >= s.MAX_GAMES || s.isDrawing}
            onClick={() => s.setGameCount((c) => Math.min(s.MAX_GAMES, c + 1))}
            className="w-8 h-8 rounded-lg bg-slate-600 text-slate-300 disabled:opacity-40 font-bold text-sm"
          >
            +
          </button>
        </div>
        <span className="text-slate-500 text-xs">(1~{s.MAX_GAMES})</span>
        <button
          onClick={s.handleDraw}
          disabled={s.isDrawing || !s.canDraw}
          className="ml-1 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {s.isDrawing ? "뽑는 중.." : `${s.gameCount}게임 뽑기`}
        </button>
        <button
          type="button"
          disabled={s.games.length === 0}
          onClick={() => {
            const lines = [
              `for ${s.nextRound}`,
              "================================ ",
              ...s.games.map(
                (nums, i) =>
                  `${String(i + 1).padStart(2)} : [ ${nums.map((n) => String(n).padStart(2)).join(", ")} ], `
              ),
              "================================",
            ];
            navigator.clipboard.writeText(lines.join("\n"));
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          클립보드로 복사
        </button>
        <button
          type="button"
          disabled={s.games.length === 0 || s.saveDrawnLoading}
          onClick={async () => {
            s.setSaveDrawnMessage(null);
            s.setSaveDrawnLoading(true);
            try {
              const res = await fetch("/api/lotto/save-drawn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ games: s.games }),
              });
              const data = await res.json();
              if (!res.ok) {
                s.setSaveDrawnMessage({ type: "error", text: data.error ?? "저장 실패" });
                return;
              }
              s.setSaveDrawnMessage({ type: "ok", text: data.message ?? "저장됨" });
              const listRes = await fetch("/api/lotto?limit=20");
              const listJson = await listRes.json();
              if (!listJson.error && listJson.data)
                s.setSavedRounds({ data: listJson.data, total: listJson.total ?? 0 });
              s.fetchExclusionData();
            } catch {
              s.setSaveDrawnMessage({ type: "error", text: "통신 실패" });
            } finally {
              s.setSaveDrawnLoading(false);
            }
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {s.saveDrawnLoading ? "저장 중.." : "DB에 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            s.setShowDbScreen(true);
            s.fetchDbScreenData();
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
        >
          당첨번호 DB
        </button>
      </div>

      {s.saveDrawnMessage && (
        <p
          className={`text-center text-sm mt-1 ${
            s.saveDrawnMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {s.saveDrawnMessage.text}
        </p>
      )}

      {s.showDbScreen ? (
        <div className="w-full max-w-2xl mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowWinningForm(false);
                s.setShowDbScreen(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => (showWinningForm ? setShowWinningForm(false) : openWinningForm())}
              className="w-10 h-10 rounded-xl text-lg font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30"
              title={showWinningForm ? "입력 닫기" : "당첨 번호 추가"}
            >
              {showWinningForm ? "−" : "+"}
            </button>
            <button
              type="button"
              onClick={async () => {
                s.setSeedLoading(true);
                s.setSeedMessage(null);
                try {
                  const res = await fetch("/api/seed-lotto", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) {
                    s.setSeedMessage({ type: "error", text: data.error ?? "저장 실패" });
                    return;
                  }
                  s.setSeedMessage({ type: "ok", text: data.message ?? "저장됨" });
                  s.fetchDbScreenData();
                } catch {
                  s.setSeedMessage({ type: "error", text: "통신 실패" });
                } finally {
                  s.setSeedLoading(false);
                }
              }}
              disabled={s.seedLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
            >
              {s.seedLoading ? "저장 중.." : "시드"}
            </button>
            <button
              type="button"
              onClick={async () => {
                s.setAnalysisLoading(true);
                try {
                  const res = await fetch("/api/analyze-lotto", { method: "POST" });
                  const data = await res.json();
                  if (!res.ok) {
                    s.setSeedMessage({ type: "error", text: data.error ?? "분석 실패" });
                    return;
                  }
                  s.setSeedMessage({ type: "ok", text: data.message ?? "분석 완료" });
                  if (data.analysis) s.setAnalysis(data.analysis);
                } catch {
                  s.setSeedMessage({ type: "error", text: "분석 통신 실패" });
                } finally {
                  s.setAnalysisLoading(false);
                }
              }}
              disabled={s.analysisLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
            >
              {s.analysisLoading ? "분석 중.." : "분석"}
            </button>
          </div>

          {showWinningForm && (
            <div className="rounded-xl border border-emerald-600/40 bg-slate-900/70 py-2 px-3 w-full max-w-full">
              <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <span className="text-emerald-400/90 text-xs font-semibold shrink-0">당첨 추가</span>
                <span className="text-slate-500 shrink-0">·</span>
                <span className="text-slate-400 text-xs shrink-0">회차</span>
                <span className="px-2 py-1 rounded-md bg-slate-800 text-amber-300 text-sm font-bold tabular-nums border border-slate-600 shrink-0">
                  {nextWinningRound != null ? `${nextWinningRound}회` : "…"}
                </span>
                <span className="text-slate-500 shrink-0">|</span>
                {mainNums.map((v, i) => (
                  <input
                    key={i}
                    type="number"
                    min={1}
                    max={45}
                    inputMode="numeric"
                    title={`당첨 ${i + 1}번째`}
                    placeholder="·"
                    value={v}
                    onChange={(e) => {
                      const next = [...mainNums];
                      next[i] = e.target.value;
                      setMainNums(next);
                    }}
                    className="w-9 sm:w-10 h-9 shrink-0 text-center rounded-md bg-slate-800 text-white border border-slate-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ))}
                <span className="text-slate-400 text-xs shrink-0">보너스</span>
                <input
                  type="number"
                  min={1}
                  max={45}
                  inputMode="numeric"
                  placeholder="B"
                  title="보너스"
                  value={bonusNum}
                  onChange={(e) => setBonusNum(e.target.value)}
                  className="w-9 sm:w-10 h-9 shrink-0 text-center rounded-md bg-slate-800 text-white border border-slate-600 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  disabled={addWinningLoading}
                  onClick={saveWinningRound}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                  {addWinningLoading ? "저장…" : "저장"}
                </button>
                {addWinningMessage ? (
                  <span
                    className={`text-xs shrink-0 max-w-[140px] sm:max-w-[220px] truncate ${
                      addWinningMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
                    }`}
                    title={addWinningMessage.text}
                  >
                    {addWinningMessage.text}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {s.seedMessage && (
            <p
              className={`text-center text-sm ${
                s.seedMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {s.seedMessage.text}
            </p>
          )}
          <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 p-4 min-h-[120px]">
            {s.savedRounds && s.savedRounds.total > 0 ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-sm">
                  저장된 당첨 번호: 총 {s.savedRounds.total}건 (최신 {s.savedRounds.data[0]?.round ?? "-"}회)
                </p>
                {s.analysis ? (
                  <s.AnalysisResultView analysis={s.analysis} />
                ) : (
                  <p className="text-slate-500 text-sm">분석 버튼을 누르면 당첨 번호 기반 분석을 불러옵니다.</p>
                )}
              </div>
            ) : !s.analysis ? (
              <p className="text-slate-500 text-sm text-center py-6">
                저장된 데이터가 없습니다. 시드 버튼으로 LottoNumber.txt를 불러와 저장한 뒤 분석해 주세요.
              </p>
            ) : (
              <s.AnalysisResultView analysis={s.analysis} />
            )}
          </div>
        </div>
      ) : (
        <>
          {s.seedMessage && (
            <p
              className={`text-center text-sm mb-1 ${
                s.seedMessage.type === "ok" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {s.seedMessage.text}
            </p>
          )}

          <div className="w-full max-w-2xl min-h-[80px] mb-4">
            {s.games.length === 0 && !s.isDrawing && (
              <p className="text-slate-500 text-center py-4 text-sm">게임 수를 선택한 뒤 뽑기 버튼으로 번호를 뽑아 보세요.</p>
            )}
            {s.isDrawing && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: Math.min(s.gameCount, 10) }).map((_, row) => (
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
                {s.gameCount > 10 && (
                  <p className="text-slate-500 text-xs text-center">뽑는 중..</p>
                )}
              </div>
            )}
            {s.games.length > 0 && !s.isDrawing && (
              <div className="flex flex-col gap-2">
                <p className="text-slate-400 text-sm text-center font-medium mb-0.5">
                  {s.nextRound}회차용 추출 번호
                </p>
                <p className="text-slate-500 text-xs text-center mb-1">
                  그룹별: 1~9 노랑 · 10~18 초록 · 19~27 파랑 · 28~36 보라 · 37~45 빨강
                </p>
                {s.games.map((nums, row) => (
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

          {!s.canDraw && (s.mustInclude.length > s.PICK_COUNT || s.mustExclude.length > 39) && (
            <p className="mt-2 text-amber-400/90 text-sm text-center">
              꼭 넣을 번호는 최대 6개, 꼭 뺄 번호는 최대 39개까지 가능합니다
            </p>
          )}
          {!s.canDraw && s.atLeastOne.length > 0 && s.atLeastOne.every((n) => s.mustExclude.includes(n)) && (
            <p className="mt-2 text-amber-400/90 text-sm text-center">
              &quot;하나 포함&quot; 번호 중 사용 가능한 번호가 최소 1개 있어야 합니다.
            </p>
          )}
          {!s.canDraw && !s.useGroupCountMode && s.poolSize < s.PICK_COUNT && (
            <p className="mt-2 text-amber-400/90 text-sm text-center">
              사용 가능 번호가 부족합니다 (현재 {s.poolSize}개)
            </p>
          )}
          {s.useGroupCountMode && !s.canDraw && (
            <p className="mt-2 text-amber-400/90 text-sm text-center">
              조건에 맞는 그룹별 개수를 꼭 넣을 번호가 개수에 맞게 들어가도록, 또는 이하로 채울 번호가 부족하면 뽑기가 불가합니다.
            </p>
          )}
          {s.games.length > 0 && !s.isDrawing && (
            <p className="mt-3 text-slate-500 text-sm">총 {s.games.length}게임 뽑음</p>
          )}

          <section className="w-full max-w-2xl mt-6">
            {s.savedRoundsLoading ? (
              <p className="text-slate-500 text-sm text-center">불러오는 중..</p>
            ) : s.savedRounds && s.savedRounds.total > 0 ? (
              <p className="text-slate-400 text-sm text-center">
                저장된 당첨 번호: 총 {s.savedRounds.total}건 (최신 {s.savedRounds.data[0]?.round ?? "-"}회)
              </p>
            ) : (
              <p className="text-slate-500 text-sm text-center">
                저장된 데이터 없음. 당첨번호 DB 버튼으로 불러와 저장해 주세요.
              </p>
            )}
          </section>

          <section className="w-full max-w-2xl mt-10">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {s.TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => s.setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    s.activeTab === tab.id
                      ? "bg-amber-500/90 text-slate-900 ring-2 ring-amber-400"
                      : "bg-slate-600/80 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 p-4 min-h-[140px]">
              {s.activeTab === "number" && (
                <div>
                  <h2 className="text-slate-400 font-semibold text-sm mb-3 text-center">
                    꼭 넣을 번호 / 꼭 뺄 번호 / 하나만 포함 번호 선택
                  </h2>
                  <NumberFilter
                    filterStates={s.filterStates}
                    currentCategory={s.currentCategory}
                    onCategoryChange={s.handleCategoryChange}
                    onNumberClick={s.handleNumberClick}
                  />
                </div>
              )}
              {s.activeTab === "group" && (
                <div>
                  <GroupCountSelector
                    groupCounts={s.groupCounts}
                    groupEnabled={s.groupEnabled}
                    groupAtMost={s.groupAtMost}
                    onChange={s.handleGroupCountChange}
                    onToggleEnabled={s.handleToggleGroupEnabled}
                    onSetAtMost={s.handleSetGroupAtMost}
                  />
                </div>
              )}
              {s.activeTab === "group9_45" && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                    9그룹(1~9) · 45그룹(37~45) 조합 (당첨 기준 확률, 체크한 조합만 추출)
                  </h2>
                  {s.analysis?.group9_45Distribution && s.analysis.totalRounds > 0 ? (
                    <div className="overflow-x-auto">
                      <p className="text-slate-500 text-xs text-center mb-1">9·45 그룹 0~3개만 표시. 진할수록 확률 높음.</p>
                      {(() => {
                        const dist = s.analysis!.group9_45Distribution!;
                        const total = s.analysis!.totalRounds;
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
                          <table className="w-full text-sm border-collapse mx-auto max-w-md">
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
                                    const checked = s.selectedGroup9_45Keys.has(key);
                                    return (
                                      <td
                                        key={n45}
                                        className="p-1 border border-slate-600 align-top"
                                        style={{ backgroundColor: `rgba(245, 158, 11, ${opacity})` }}
                                        title={`${count}회 (${pct}%)`}
                                      >
                                        <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => s.toggleGroup9_45Key(key)}
                                            className="rounded border-slate-500"
                                          />
                                          <span className="text-slate-900 font-medium">{count}</span>
                                          <span className="text-slate-800 font-semibold text-xs">{pct}%</span>
                                        </label>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-slate-500 text-sm">
                        저장된 분석에 9·45 조합이 없거나 당첨 데이터가 없습니다. 아래 버튼으로 분석을 실행하면 당첨 기준 확률이 표시되고 DB에 저장됩니다.
                      </p>
                      <button
                        type="button"
                        onClick={s.runAnalysis}
                        disabled={s.analysisLoading}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/90 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                      >
                        {s.analysisLoading ? "분석 중.." : "분석 실행 (9·45 포함, DB 저장)"}
                      </button>
                    </div>
                  )}
                  <p className="text-slate-500 text-xs text-center">체크한 조합만 허용됩니다. 하나도 체크하지 않으면 제한 없음.</p>
                </div>
              )}
              {s.activeTab === "sum" && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                    합계 제한 (6개 번호 합, 비워두면 제한 없음)
                  </h2>
                  {s.analysis?.sumPattern ? (
                    <s.SumHistogramChart
                      histogram={s.analysis.sumPattern.histogram}
                      avg={s.analysis.sumPattern.avg}
                      sumMin={s.sumMin}
                      sumMax={s.sumMax}
                      setSumMin={s.setSumMin}
                      setSumMax={s.setSumMax}
                      showFilter={true}
                    />
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-4">당첨번호 DB에서 분석을 실행하면 합계 그래프와 최소·최대 설정을 사용할 수 있습니다.</p>
                  )}
                  <p className="text-slate-500 text-xs text-center">번호를 뽑은 뒤 설정은 계정 DB에 저장됩니다.</p>
                </div>
              )}
              {s.activeTab === "consecutive" && (
                <div className="space-y-4 max-w-md mx-auto">
                  <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                    연속 번호 제한 (비워두면 제한 없음)
                  </h2>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1">연속 번호 최대 쌍 수 (0~5)</label>
                    <select
                      value={s.maxConsecutivePairs ?? ""}
                      onChange={(e) => {
                        const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                        s.setMaxConsecutivePairs(v);
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
                    <p className="text-slate-500 text-xs mt-2">연속이란 번호 쌍 (예: 3,4 또는 10,11)의 최대 개수를 제한합니다.</p>
                  </div>
                  <p className="text-slate-500 text-xs text-center">번호를 뽑은 뒤 설정은 계정 DB에 저장됩니다.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
