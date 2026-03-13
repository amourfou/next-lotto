"use client";

import React from "react";
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
  activeTab: "number" | "group" | "sum" | "consecutive";
  sumMin: number | null;
  sumMax: number | null;
  maxConsecutivePairs: number | null;
  savedRounds: { data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]; total: number } | null;
  savedRoundsLoading: boolean;
  showDbScreen: boolean;
  analysis: { totalRounds: number; hot: number[]; cold: number[]; sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> }; consecutivePattern?: { avgConsecutivePairs: number; avgMaxRun: number; pairDistribution: Record<number, number>; maxRunDistribution: Record<number, number> }; updatedAt: string } | null;
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
  TABS: { id: "number" | "group" | "sum" | "consecutive"; label: string }[];
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
  setActiveTab: (v: "number" | "group" | "sum" | "consecutive") => void;
  MIN_GAMES: number;
  MAX_GAMES: number;
  SUM_RANGE: { min: number; max: number };
  PICK_COUNT: number;
  AnalysisResultView: React.ComponentType<{ analysis: NonNullable<Scope["analysis"]> }>;
};

export function LottoPageMainContent({ scope }: { scope: Record<string, unknown> }) {
  const s = scope as unknown as Scope;

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
            const nextRound = (s.savedRounds?.data?.[0]?.round ?? 0) + 1;
            const lines = [
              `for ${nextRound}`,
              "================================ ",
              ...s.games.map(
                (nums, i) =>
                  ` ${String(i + 1).padStart(2)} : [ ${nums.map((n) => String(n).padStart(2)).join(", ")} ], `
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
              onClick={() => s.setShowDbScreen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
            >
              닫기
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
                  const aRes = await fetch("/api/lotto/analysis");
                  const aJson = await aRes.json();
                  if (aJson.analysis) s.setAnalysis(aJson.analysis);
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
              {s.activeTab === "sum" && (
                <div className="space-y-4 max-w-md mx-auto">
                  <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                    합계 제한 (6개 번호 합, 비워두면 제한 없음)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1">합계 최소 (21~255)</label>
                      <input
                        type="number"
                        min={s.SUM_RANGE.min}
                        max={s.SUM_RANGE.max}
                        value={s.sumMin ?? ""}
                        onChange={(e) => {
                          if (e.target.value === "") { s.setSumMin(null); return; }
                          const v = parseInt(e.target.value, 10);
                          s.setSumMin(Number.isNaN(v) ? null : Math.min(s.SUM_RANGE.max, Math.max(s.SUM_RANGE.min, v)));
                        }}
                        placeholder="제한 없음"
                        className="w-full rounded-lg bg-slate-700 text-white px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs font-medium mb-1">합계 최대 (21~255)</label>
                      <input
                        type="number"
                        min={s.SUM_RANGE.min}
                        max={s.SUM_RANGE.max}
                        value={s.sumMax ?? ""}
                        onChange={(e) => {
                          if (e.target.value === "") { s.setSumMax(null); return; }
                          const v = parseInt(e.target.value, 10);
                          s.setSumMax(Number.isNaN(v) ? null : Math.min(s.SUM_RANGE.max, Math.max(s.SUM_RANGE.min, v)));
                        }}
                        placeholder="제한 없음"
                        className="w-full rounded-lg bg-slate-700 text-white px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
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
