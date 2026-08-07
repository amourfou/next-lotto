"use client";

import React, { useCallback, useState } from "react";
import NumberFilter, { type NumberFilterState, type FilterCategory } from "../components/NumberFilter";
import GroupCountSelector from "../components/GroupCountSelector";

function lottoBallFill(n: number): string {
  if (n <= 9) return "#eab308";
  if (n <= 18) return "#3b82f6";
  if (n <= 27) return "#ef4444";
  if (n <= 36) return "#64748b";
  return "#16a34a";
}

function countGroup9(nums: number[]): number {
  return nums.filter((n) => n >= 1 && n <= 9).length;
}

function countGroup45(nums: number[]): number {
  return nums.filter((n) => n >= 37 && n <= 45).length;
}

function formatGroup9_45(nums: number[]): string {
  return `${countGroup9(nums)},${countGroup45(nums)}`;
}

function getConsecutivePairs(nums: number[]): number {
  const arr = [...nums].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) pairs += 1;
  }
  return pairs;
}

/** 홀:짝 (예: 3:3) */
function formatOddEven(nums: number[]): string {
  const even = nums.filter((n) => n % 2 === 0).length;
  return `${nums.length - even}:${even}`;
}

function formatGroup5Pattern(nums: number[]): string {
  const counts = [0, 0, 0, 0, 0];
  for (const n of nums) {
    if (n <= 9) counts[0]++;
    else if (n <= 18) counts[1]++;
    else if (n <= 27) counts[2]++;
    else if (n <= 36) counts[3]++;
    else counts[4]++;
  }
  return counts.join("-");
}

/** 팝업에 보이는 회차 블록과 동일한 레이아웃을 PNG로 클립보드에 복사 */
async function copyRoundDisplayAsImage(round: number, games: number[][]): Promise<void> {
  const pad = 6;
  const headerGap = 4;
  const headerH = 18;
  const rowH = 26;
  const idxW = 22;
  const ballW = 28;
  const ballH = 24;
  const ballGap = 1;
  const tablePadX = 6;
  const tableW = tablePadX * 2 + idxW + 6 * ballW + 5 * ballGap;
  const width = pad * 2 + tableW;
  const tableTop = pad + headerH + headerGap;
  const height = tableTop + games.length * rowH + pad;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${round}회`, pad, pad + 13);
  ctx.fillStyle = "#64748b";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${games.length}게임`, width - pad, pad + 13);
  ctx.textAlign = "left";

  const boxX = pad;
  const boxY = tableTop;
  const boxH = games.length * rowH;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, tableW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(100,116,139,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  games.forEach((nums, idx) => {
    const y = boxY + idx * rowH;
    if (idx > 0) {
      ctx.strokeStyle = "rgba(100,116,139,0.3)";
      ctx.beginPath();
      ctx.moveTo(boxX, y);
      ctx.lineTo(boxX + tableW, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#64748b";
    ctx.font = "12px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(idx + 1), boxX + tablePadX + idxW - 4, y + rowH / 2);

    let x = boxX + tablePadX + idxW;
    ctx.textAlign = "center";
    for (const num of nums) {
      ctx.fillStyle = lottoBallFill(num);
      ctx.fillRect(x, y + (rowH - ballH) / 2, ballW, ballH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText(String(num), x + ballW / 2, y + rowH / 2);
      x += ballW + ballGap;
    }
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("image encode failed");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

async function copyRoundToClipboard(round: number, games: number[][]): Promise<void> {
  try {
    await copyRoundDisplayAsImage(round, games);
  } catch {
    const lines = [
      `${round}회 · ${games.length}게임`,
      ...games.map((nums, i) =>
        `${String(i + 1).padStart(2)}  ${nums.map((n) => String(n).padStart(2)).join(" ")}`
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  }
}

type Scope = {
  games: number[][];
  setGames: (v: number[][] | ((prev: number[][]) => number[][])) => void;
  gameCount: number;
  setGameCount: (v: number | ((c: number) => number)) => void;
  isDrawing: boolean;
  filterStates: Record<number, NumberFilterState>;
  currentCategory: FilterCategory;
  groupCountRanges: Record<number, { min: number; max: number }>;
  groupEnabled: Record<number, boolean>;
  seedLoading: boolean;
  seedMessage: { type: "ok" | "error"; text: string } | null;
  activeTab: "number" | "group" | "group9_45" | "sum" | "oddEven" | "consecutive" | "repeatAppear" | "prevRound";
  sumMin: number | null;
  sumMax: number | null;
  maxConsecutivePairs: number | null;
  selectedGroup9_45Keys: Set<string>;
  toggleGroup9_45Key: (key: string) => void;
  runAnalysis: () => void;
  savedRounds: { data: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]; total: number } | null;
  savedRoundsLoading: boolean;
  allRounds: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[];
  allRoundsLoading: boolean;
  mainTab: "draw" | "stats";
  setMainTab: (v: "draw" | "stats") => void;
  analysis: {
    totalRounds: number;
    hot: number[];
    cold: number[];
    sumPattern?: { min: number; max: number; avg: number; histogram: Record<number, number> };
    group9_45Distribution?: Record<string, number>;
    groupPatternDistribution?: Record<string, number>;
    groupPatternRounds?: Record<string, number[]>;
    latestRound?: number;
    consecutivePattern?: {
      avgConsecutivePairs: number;
      avgMaxRun: number;
      pairDistribution: Record<number, number>;
      maxRunDistribution: Record<number, number>;
    };
    prevBucketAnalysis?: {
      startRound: number;
      endRound: number;
      analyzedRounds: number;
      nextRound: number;
      nextGroups: Record<string, number[]>;
      nextWindowRounds?: Record<string, number[]>;
      groupHitCounts: Record<string, number>;
      groupHitRatio: Record<string, number>;
      nextAppearProbability?: Record<string, number>;
      perNumberHitProbability?: Record<string, number>;
      atLeastOneProbability?: Record<string, number>;
      avgGroupSize?: Record<string, number>;
      avgPerRound: Record<string, number>;
      compositionDistribution: Record<string, number>;
      numberStats?: Record<
        string,
        {
          overallAppearRate: number;
          overallHits: number;
          totalRounds?: number;
          analyzedRounds?: number;
          byGroup: Record<
            string,
            { inGroup: number; hits: number; appearRate: number }
          >;
        }
      >;
    };
    updatedAt: string;
  } | null;
  analysisLoading: boolean;
  saveDrawnLoading: boolean;
  saveDrawnMessage: { type: "ok" | "error"; text: string } | null;
  fetchDbScreenData: () => void;
  handleDraw: () => void;
  canDraw: boolean;
  handleCategoryChange: (category: FilterCategory) => void;
  handleNumberClick: (num: number) => void;
  handleGroupCountMinChange: (groupKey: number, value: number) => void;
  handleGroupCountMaxChange: (groupKey: number, value: number) => void;
  handleToggleGroupEnabled: (groupKey: number) => void;
  TABS: { id: "number" | "group" | "group9_45" | "sum" | "oddEven" | "consecutive" | "repeatAppear" | "prevRound"; label: string }[];
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
  setSumMin: (v: number | null) => void;
  setSumMax: (v: number | null) => void;
  setMaxConsecutivePairs: (v: number | null) => void;
  setActiveTab: (v: "number" | "group" | "group9_45" | "sum" | "oddEven" | "consecutive" | "repeatAppear" | "prevRound") => void;
  selectedOddEvenKeys: Set<string>;
  toggleOddEvenKey: (key: string) => void;
  fetchExclusionData: () => void;
  selectedPrevRounds: Set<number>;
  setSelectedPrevRounds: (v: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  prevRoundExclude: number[];
  nextRound: number;
  savedDrawnList: number[][];
  setSavedDrawnList: (v: number[][] | ((prev: number[][]) => number[][])) => void;
  loadSavedDrawn: () => void;
  MIN_GAMES: number;
  MAX_GAMES: number;
  SUM_RANGE: { min: number; max: number };
  PICK_COUNT: number;
  AnalysisResultView: React.ComponentType<{ analysis: NonNullable<Scope["analysis"]> }>;
  SumHistogramChart: React.ComponentType<{
    histogram: Record<number, number>;
    avg: number;
    rounds?: { round: number; sum: number }[];
    sumMin?: number | null;
    sumMax?: number | null;
    setSumMin?: (v: number | null) => void;
    setSumMax?: (v: number | null) => void;
    showFilter?: boolean;
  }>;
};

export function LottoPageMainContent({ scope }: { scope: Record<string, unknown> }) {
  const s = scope as unknown as Scope;

  const [selectedHeatCols, setSelectedHeatCols] = useState<Set<number>>(new Set());
  const R_max = s.allRounds.length > 0 ? s.allRounds[0].round : 0;
  const toggleHeatCol = (i: number) => {
    setSelectedHeatCols(prev => {
      const n = new Set(prev);
      const meetingRound = R_max - i;
      if (n.has(i)) {
        n.delete(i);
        if (meetingRound > 0) s.setSelectedPrevRounds(p => { const p2 = new Set(p); p2.delete(meetingRound); return p2; });
      } else {
        n.add(i);
        if (meetingRound > 0) s.setSelectedPrevRounds(p => { const s2 = new Set(Array.from(p)); s2.add(meetingRound); return s2; });
      }
      return n;
    });
  };

  const [showWinningForm, setShowWinningForm] = useState(false);
  const [nextWinningRound, setNextWinningRound] = useState<number | null>(null);
  const [mainNums, setMainNums] = useState<string[]>(() => Array(6).fill(""));
  const [bonusNum, setBonusNum] = useState("");
  const [addWinningLoading, setAddWinningLoading] = useState(false);
  const [addWinningMessage, setAddWinningMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<{ round: number; games: number[][] }[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const lottoNumBg = (n: number) =>
    n <= 9 ? "bg-yellow-500" :
    n <= 18 ? "bg-blue-500" :
    n <= 27 ? "bg-red-500" :
    n <= 36 ? "bg-slate-500" :
    "bg-green-600";

  const toSetKey = (nums: number[]) => [...nums].sort((a, b) => a - b).join(",");

  const handleOpenHistory = useCallback(async () => {
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    try {
      const res = await fetch("/api/lotto/drawn/all", { cache: "no-store" });
      const json = (await res.json()) as { error?: string; data?: { round: number; games: number[][] }[] };
      if (!json.error) setHistoryData(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

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
    <main className="flex flex-col items-center w-full flex-1 min-h-0 overflow-hidden px-6 pt-6 pb-0">
      <div className="w-full max-w-[1400px] flex border-b border-slate-600/50 mb-4 shrink-0">
        {(["draw", "stats"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { s.setMainTab(tab); if (tab === "stats") s.fetchDbScreenData(); }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative z-10 -mb-px ${
              s.mainTab === tab
                ? "border border-b-0 border-slate-600/50 rounded-t-lg bg-slate-800/50 text-amber-400"
                : "border border-transparent text-slate-400 hover:text-slate-200 rounded-t-lg"
            }`}
          >
            {tab === "draw" ? "번호 뽑기" : "통계"}
          </button>
        ))}
      </div>

      {s.mainTab === "stats" ? (
        <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center pb-12 [scrollbar-width:thin]">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
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
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col items-center pb-12 [scrollbar-width:thin]">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4 shrink-0">
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
                const existing = new Set(s.savedDrawnList.map((nums) => toSetKey(nums)));
                const newOnes = s.games.filter((g) => !existing.has(toSetKey(g)));
                const newList = [...s.savedDrawnList, ...newOnes];
                const res = await fetch("/api/lotto/save-drawn", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ games: newList }),
                });
                const data = await res.json();
                if (!res.ok) {
                  s.setSaveDrawnMessage({ type: "error", text: data.error ?? "저장 실패" });
                  return;
                }
                s.setSaveDrawnMessage({ type: "ok", text: data.message ?? "저장됨" });
                s.setSavedDrawnList(newList);
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
            onClick={handleOpenHistory}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-600 text-slate-200 hover:bg-slate-500"
            title="저장된 추출 번호 보기"
          >
            저장번호보기
          </button>
        </div>
        <div className="w-full max-w-[1400px] flex flex-col items-center">
          {s.seedMessage && (
            <p className={`text-center text-sm mb-1 ${s.seedMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {s.seedMessage.text}
            </p>
          )}
          {!s.canDraw && (s.mustInclude.length > s.PICK_COUNT || s.mustExclude.length > 39) && (
            <p className="text-amber-400/90 text-sm text-center">꼭 넣을 번호는 최대 6개, 꼭 뺄 번호는 최대 39개까지 가능합니다</p>
          )}
          {!s.canDraw && s.atLeastOne.length > 0 && s.atLeastOne.every((n) => s.mustExclude.includes(n)) && (
            <p className="text-amber-400/90 text-sm text-center">&quot;하나 포함&quot; 번호 중 사용 가능한 번호가 최소 1개 있어야 합니다.</p>
          )}
          {!s.canDraw && !s.useGroupCountMode && s.poolSize < s.PICK_COUNT && (
            <p className="text-amber-400/90 text-sm text-center">사용 가능 번호가 부족합니다 (현재 {s.poolSize}개)</p>
          )}
          {s.useGroupCountMode && !s.canDraw && (
            <p className="text-amber-400/90 text-sm text-center">그룹별 개수 범위(n≤x≤m)와 꼭 넣을/뺄 번호 조건이 맞지 않아 뽑기가 불가합니다.</p>
          )}

          <div className="w-full flex gap-4 mt-2 items-start">
            {/* 왼쪽: 이번에 뽑은 번호 */}
            <div className="shrink-0">
              {s.isDrawing && (
                <table className="text-xs border-collapse opacity-40">
                  <tbody>
                    {Array.from({ length: Math.min(s.gameCount, 10) }).map((_, row) => (
                      <tr key={row}>
                        <td className="pr-2 text-slate-500 text-right">{row + 1}.</td>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <td key={i} className="p-0 border border-slate-600/40">
                            <div className="w-7 h-6 bg-slate-600 animate-pulse" style={{ animationDelay: `${(row * 6 + i) * 30}ms` }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.games.length > 0 && !s.isDrawing && (
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">{s.nextRound}회</p>
                  <table className="text-xs border-collapse">
                    <tbody>
                      {s.games.map((nums, row) => (
                        <tr key={row}>
                          <td className="pr-2 text-slate-500 text-right">{row + 1}.</td>
                          {nums.map((num, i) => (
                            <td key={i} className="p-0 border border-slate-600/40">
                              <span className={`inline-flex items-center justify-center w-7 h-6 text-white font-bold ${lottoNumBg(num)}`}>
                                {num}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.saveDrawnMessage && (
                <p className={`text-xs mt-1 ${s.saveDrawnMessage.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                  {s.saveDrawnMessage.text}
                </p>
              )}
            </div>

            {/* 오른쪽: 필터 탭 */}
            <section className="flex-1 min-w-[320px]">
            <div className="flex flex-wrap border-b border-slate-600/50">
              {s.TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => s.setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative z-10 -mb-px ${
                    s.activeTab === tab.id
                      ? "border border-b-0 border-slate-600/50 rounded-t-lg bg-slate-800/50 text-amber-400"
                      : "border border-transparent text-slate-400 hover:text-slate-200 rounded-t-lg"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="rounded-b-xl bg-slate-800/50 border border-t-0 border-slate-600/50 p-4 min-h-[140px]">
              {s.activeTab === "number" && (
                <div className="flex flex-col md:flex-row gap-3 items-start">
                  {/* 왼쪽: 번호 선택 */}
                  <div className="shrink-0 w-full md:w-auto">
                    <h2 className="text-slate-400 font-semibold text-sm mb-3 text-center md:text-left">
                      꼭 넣을 번호 / 꼭 뺄 번호 / 하나만 포함 번호 선택
                    </h2>
                    <NumberFilter
                      filterStates={s.filterStates}
                      currentCategory={s.currentCategory}
                      onCategoryChange={s.handleCategoryChange}
                      onNumberClick={s.handleNumberClick}
                    />
                  </div>

                  {/* Prev1~5 번호 + 이진 패턴 확률 */}
                  {(() => {
                    const pb = s.analysis?.prevBucketAnalysis;
                    const KEYS = ["Prev1", "Prev2", "Prev3", "Prev4", "Prev5"] as const;
                    const META: Record<
                      (typeof KEYS)[number],
                      { window: string; color: string; rgb: string }
                    > = {
                      Prev1: {
                        window: "1~5회",
                        color: "text-rose-300",
                        rgb: "244,63,94",
                      },
                      Prev2: {
                        window: "6~10회",
                        color: "text-orange-300",
                        rgb: "249,115,22",
                      },
                      Prev3: {
                        window: "11~15회",
                        color: "text-amber-300",
                        rgb: "245,158,11",
                      },
                      Prev4: {
                        window: "16~20회",
                        color: "text-sky-300",
                        rgb: "14,165,233",
                      },
                      Prev5: {
                        window: "그 외",
                        color: "text-emerald-300",
                        rgb: "16,185,129",
                      },
                    };

                    if (!pb || pb.analyzedRounds <= 0) {
                      return (
                        <div className="rounded-lg border border-slate-600/40 bg-slate-900/30 px-3 py-4 text-center space-y-2 min-h-[120px] flex flex-col items-center justify-center">
                          <p className="text-slate-200 text-sm">
                            Prev1~5 · 분석을 실행하면 표시됩니다
                          </p>
                          <button
                            type="button"
                            onClick={s.runAnalysis}
                            disabled={s.analysisLoading}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/90 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                          >
                            {s.analysisLoading ? "분석 중.." : "분석 실행"}
                          </button>
                        </div>
                      );
                    }

                    const atLeast = pb.atLeastOneProbability ?? {};
                    const groupAppearRate = (n: number, groupKey: (typeof KEYS)[number]) =>
                      pb.numberStats?.[String(n)]?.byGroup?.[groupKey]?.appearRate ?? 0;

                    const overallAppearRate = (n: number) =>
                      pb.numberStats?.[String(n)]?.overallAppearRate ?? 0;

                    /**
                     * Prev 그룹별 순위 (1=최고).
                     * 1) 그룹 내 다음회차 출현확률 내림차순
                     * 2) 동점이면 전체 출현 확률 내림차순
                     * 3) 그래도 같으면 번호 오름차순
                     */
                    const rankByGroup = {} as Record<(typeof KEYS)[number], Map<number, number>>;
                    for (const key of KEYS) {
                      const nums = [...(pb.nextGroups[key] ?? [])];
                      nums.sort((a, b) => {
                        const ra = groupAppearRate(a, key);
                        const rb = groupAppearRate(b, key);
                        if (rb !== ra) return rb - ra;
                        const oa = overallAppearRate(a);
                        const ob = overallAppearRate(b);
                        if (ob !== oa) return ob - oa;
                        return a - b;
                      });
                      const m = new Map<number, number>();
                      nums.forEach((n, i) => m.set(n, i + 1));
                      rankByGroup[key] = m;
                    }

                    const ballStyle = (n: number, groupKey: (typeof KEYS)[number]) => {
                      const nums = pb.nextGroups[groupKey] ?? [];
                      const size = Math.max(1, nums.length);
                      const rank = rankByGroup[groupKey]?.get(n) ?? size;
                      // rank 1(최고) → t=1 진함, rank=size(최저) → t=0 연함
                      const t = size <= 1 ? 1 : (size - rank) / (size - 1);
                      const bgA = 0.12 + 0.78 * t;
                      const borderA = 0.3 + 0.65 * t;
                      const rgb = META[groupKey].rgb;
                      return {
                        backgroundColor: `rgba(${rgb},${bgA.toFixed(3)})`,
                        borderColor: `rgba(${rgb},${borderA.toFixed(3)})`,
                        color: t >= 0.45 ? "#fff" : `rgba(${rgb},1)`,
                        boxShadow:
                          t >= 0.7
                            ? `0 0 0 1px rgba(${rgb},0.45), 0 0 8px rgba(${rgb},0.35)`
                            : undefined,
                      } as React.CSSProperties;
                    };

                    const numTip = (n: number, groupKey: (typeof KEYS)[number]) => {
                      const st = pb.numberStats?.[String(n)];
                      if (!st) return `${n}번`;
                      const g = st.byGroup?.[groupKey];
                      const totalR = st.totalRounds ?? st.analyzedRounds ?? 0;
                      const rank = rankByGroup[groupKey]?.get(n);
                      const size = (pb.nextGroups[groupKey] ?? []).length;
                      const overall = `전체 출현(본번호) ${st.overallAppearRate}% (${st.overallHits}/${totalR}회)`;
                      const whenInGroup = g
                        ? `${groupKey}일 때 다음 회차 출현(본번호) ${g.appearRate}% (${g.hits}/${g.inGroup}회)`
                        : `${groupKey}일 때 다음 회차 출현(본번호) —`;
                      const rankLine =
                        rank != null && size > 0
                          ? `${groupKey} 내 순위 ${rank}/${size}위`
                          : "";
                      return [n + "번", overall, whenInGroup, rankLine].filter(Boolean).join("\n");
                    };

                    /** "4,1,1,0,0" → "11100" (그룹에 1개라도 나오면 1) */
                    const toBinaryPattern = (compKey: string) =>
                      compKey
                        .split(",")
                        .map((part) => {
                          const n = parseInt(part, 10);
                          return !Number.isNaN(n) && n > 0 ? "1" : "0";
                        })
                        .join("");

                    const binaryDist: Record<string, number> = {};
                    for (const [compKey, count] of Object.entries(
                      pb.compositionDistribution ?? {}
                    )) {
                      const bin = toBinaryPattern(compKey);
                      if (bin.length !== 5) continue;
                      binaryDist[bin] = (binaryDist[bin] ?? 0) + count;
                    }
                    const binaryPatterns = Object.entries(binaryDist)
                      .map(([pattern, count]) => ({
                        pattern,
                        count,
                        pct:
                          pb.analyzedRounds > 0
                            ? Math.round((count / pb.analyzedRounds) * 1000) / 10
                            : 0,
                      }))
                      .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));

                    // relative 높이 = Prev 패널만 반영. 패턴 패널은 absolute로 같은 높이에 고정 후 내부 스크롤
                    return (
                      <div className="relative w-full md:w-[calc(33.6rem+0.75rem+14.3rem)] shrink-0">
                        {/* Prev 번호 목록 (높이 기준) — 기존 42rem의 약 80% */}
                        <div className="w-full md:w-[33.6rem]">
                          <div className="rounded-lg border border-amber-500/40 bg-slate-900/30 px-2.5 py-2.5 space-y-2.5">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <p className="text-white text-sm font-semibold">
                                Prev1~5 · 1개라도 출현
                              </p>
                              <p className="text-xs text-amber-200/90">
                                {pb.startRound}~{pb.endRound} ·{" "}
                                <span className="text-amber-300 font-semibold">{pb.nextRound}회</span>
                              </p>
                            </div>

                            <div className="flex flex-nowrap justify-between gap-1">
                              {KEYS.map((key) => {
                                const meta = META[key];
                                const p = atLeast[key];
                                return (
                                  <div
                                    key={key}
                                    className="flex flex-col items-center min-w-0 flex-1 rounded border border-slate-500/50 bg-slate-800/70 px-0.5 py-1.5"
                                    title={meta.window}
                                  >
                                    <span className={`text-[11px] font-bold leading-none ${meta.color}`}>
                                      {key}
                                    </span>
                                    <span className="text-amber-300 font-bold text-sm tabular-nums leading-none mt-1">
                                      {p != null ? `${p}%` : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="space-y-2.5">
                              {KEYS.map((key) => {
                                const meta = META[key];
                                const nums = pb.nextGroups[key] ?? [];
                                const p = atLeast[key];
                                return (
                                  <div key={key} className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                                      <span className={`text-sm font-bold ${meta.color}`}>{key}</span>
                                      <span className="text-xs text-amber-100/90">{meta.window}</span>
                                      <span className="text-sm text-amber-300 font-bold tabular-nums">
                                        {p != null ? `${p}%` : "—"}
                                      </span>
                                      <span className="text-xs text-white/90">{nums.length}개</span>
                                    </div>
                                    {nums.length === 0 ? (
                                      <span className="text-white/80 text-sm">—</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {nums.map((n) => (
                                          <span
                                            key={n}
                                            title={numTip(n, key)}
                                            style={ballStyle(n, key)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border cursor-help"
                                          >
                                            {n}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 패턴 리스트: Prev 높이에 고정, 내부만 스크롤 (md+) / 모바일은 제한 높이 */}
                        <div className="mt-3 md:mt-0 w-full md:w-[14.3rem] md:absolute md:top-0 md:bottom-0 md:right-0 flex flex-col min-h-0 overflow-hidden rounded-lg border border-violet-500/40 bg-slate-900/30 px-2.5 py-2.5 max-h-64 md:max-h-none">
                          <p className="text-white text-sm font-semibold mb-0.5 shrink-0">
                            Prev 패턴 확률
                          </p>
                          <p className="text-xs text-violet-200/90 mb-2 leading-snug shrink-0">
                            자리=Prev1~5 · 1=1개↑ · 0=미출현
                            <br />
                            {pb.startRound}~{pb.endRound} · {pb.analyzedRounds}회
                          </p>
                          {binaryPatterns.length === 0 ? (
                            <p className="text-white/80 text-sm">데이터 없음</p>
                          ) : (
                            <div className="space-y-1 flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                              {binaryPatterns.map(({ pattern, count, pct }) => (
                                <div
                                  key={pattern}
                                  className="flex items-center gap-2 rounded border border-slate-500/40 bg-slate-800/60 px-2 py-1.5"
                                  title={pattern
                                    .split("")
                                    .map((bit, i) => `Prev${i + 1}:${bit === "1" ? "출현" : "없음"}`)
                                    .join(" ")}
                                >
                                  <span className="font-mono text-sm font-bold text-violet-200 tracking-wider tabular-nums">
                                    {pattern}
                                  </span>
                                  <span className="text-amber-300 font-bold text-sm tabular-nums ml-auto">
                                    {pct}%
                                  </span>
                                  <span className="text-xs text-white/90 tabular-nums w-10 text-right">
                                    {count}회
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {s.activeTab === "group" && (
                <div>
                  <GroupCountSelector
                    groupCountRanges={s.groupCountRanges}
                    groupEnabled={s.groupEnabled}
                    onChangeMin={s.handleGroupCountMinChange}
                    onChangeMax={s.handleGroupCountMaxChange}
                    onToggleEnabled={s.handleToggleGroupEnabled}
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
                <div className="space-y-4 w-full">
                  <h2 className="text-slate-400 font-semibold text-sm text-center mb-3">
                    합계 제한 (6개 번호 합, 비워두면 제한 없음)
                  </h2>
                  {s.analysis?.sumPattern ? (
                    <s.SumHistogramChart
                      histogram={s.analysis.sumPattern.histogram}
                      avg={s.analysis.sumPattern.avg}
                      rounds={s.allRounds.map(r => ({ round: r.round, sum: r.n1 + r.n2 + r.n3 + r.n4 + r.n5 + r.n6 }))}
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
              {s.activeTab === "oddEven" && (() => {
                const ODD_EVEN_COMBOS = [
                  { key: "6,0", label: "짝6 홀0" },
                  { key: "5,1", label: "짝5 홀1" },
                  { key: "4,2", label: "짝4 홀2" },
                  { key: "3,3", label: "짝3 홀3" },
                  { key: "2,4", label: "짝2 홀4" },
                  { key: "1,5", label: "짝1 홀5" },
                  { key: "0,6", label: "짝0 홀6" },
                ];
                const dist: Record<string, number> = {};
                let distTotal = 0;
                for (const r of s.allRounds) {
                  const nums = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6];
                  const even = nums.filter((n) => n % 2 === 0).length;
                  const k = `${even},${6 - even}`;
                  dist[k] = (dist[k] ?? 0) + 1;
                  distTotal++;
                }
                const maxCount = Math.max(...ODD_EVEN_COMBOS.map((c) => dist[c.key] ?? 0), 1);
                return (
                  <div className="space-y-3 max-w-sm mx-auto">
                    <h2 className="text-slate-400 font-semibold text-sm text-center">
                      홀짝 비율 필터 (체크한 조합만 허용, 하나도 없으면 제한 없음)
                    </h2>
                    {distTotal === 0 && (
                      <p className="text-slate-500 text-xs text-center">당첨 번호 데이터를 불러오면 통계가 표시됩니다.</p>
                    )}
                    <div className="space-y-1.5">
                      {ODD_EVEN_COMBOS.map(({ key, label }) => {
                        const count = dist[key] ?? 0;
                        const pct = distTotal > 0 ? ((count / distTotal) * 100).toFixed(1) : "0.0";
                        const barW = Math.round((count / maxCount) * 100);
                        const checked = s.selectedOddEvenKeys.has(key);
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              checked
                                ? "bg-violet-600/25 border border-violet-500/50"
                                : "bg-slate-700/40 border border-slate-600/40 hover:bg-slate-700/70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => s.toggleOddEvenKey(key)}
                              className="rounded border-slate-500 accent-violet-500"
                            />
                            <span className="text-slate-200 text-sm font-medium w-16 shrink-0">{label}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 bg-slate-600/50 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-violet-500/80"
                                  style={{ width: `${barW}%` }}
                                />
                              </div>
                              {distTotal > 0 && (
                                <span className="text-slate-400 text-xs w-16 text-right shrink-0">
                                  {count}회 ({pct}%)
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-slate-500 text-xs text-center">번호를 뽑은 뒤 설정은 계정 DB에 저장됩니다.</p>
                  </div>
                );
              })()}
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
              {s.activeTab === "repeatAppear" && (() => {
                const numBg = (n: number) =>
                  n <= 9 ? "bg-yellow-500" :
                  n <= 18 ? "bg-blue-500" :
                  n <= 27 ? "bg-red-500" :
                  n <= 36 ? "bg-slate-500" :
                  "bg-green-600";

                type RepeatStat = { repeat: number; total: number; prob: number };
                const stats = new Map<number, RepeatStat>();
                for (let n = 1; n <= 45; n++) stats.set(n, { repeat: 0, total: 0, prob: 0 });

                const sorted = [...s.allRounds].sort((a, b) => a.round - b.round);
                for (let i = 1; i < sorted.length; i++) {
                  const prev = sorted[i - 1];
                  const next = sorted[i];
                  if (next.round !== prev.round + 1) continue;
                  const prevNums = [prev.n1, prev.n2, prev.n3, prev.n4, prev.n5, prev.n6];
                  const nextSet = new Set([next.n1, next.n2, next.n3, next.n4, next.n5, next.n6]);
                  for (const n of prevNums) {
                    const cur = stats.get(n)!;
                    cur.total++;
                    if (nextSet.has(n)) cur.repeat++;
                  }
                }
                for (let n = 1; n <= 45; n++) {
                  const cur = stats.get(n)!;
                  cur.prob = cur.total > 0 ? cur.repeat / cur.total : 0;
                }

                const maxProb = Math.max(...Array.from(stats.values()).map((v) => v.prob), 0.001);
                let pairCount = 0;
                for (let i = 1; i < sorted.length; i++) {
                  if (sorted[i].round === sorted[i - 1].round + 1) pairCount++;
                }

                const ranked = Array.from({ length: 45 }, (_, i) => i + 1).sort((a, b) => {
                  const pa = stats.get(a)!.prob;
                  const pb = stats.get(b)!.prob;
                  if (pb !== pa) return pb - pa;
                  return a - b;
                });

                return (
                  <div className="space-y-3 max-w-2xl mx-auto">
                    <h2 className="text-slate-400 font-semibold text-sm text-center">
                      연속 출현 확률 (직전 회차 당첨번호 → 다음 회차)
                    </h2>
                    <p className="text-slate-500 text-xs text-center">
                      번호별로 직전 회차에 나온 뒤 바로 다음 회차에도 나온 비율입니다. (당첨번호 6개 기준, {pairCount}쌍 분석, 확률 높은 순)
                    </p>
                    {s.allRoundsLoading && (
                      <p className="text-slate-500 text-xs text-center py-4">불러오는 중..</p>
                    )}
                    {!s.allRoundsLoading && pairCount === 0 && (
                      <p className="text-slate-500 text-sm text-center py-4">당첨 번호 데이터를 불러오면 통계가 표시됩니다.</p>
                    )}
                    {!s.allRoundsLoading && pairCount > 0 && (
                      <div className="grid grid-cols-9 gap-1.5">
                        {ranked.map((n) => {
                          const { repeat, total, prob } = stats.get(n)!;
                          const pct = (prob * 100).toFixed(1);
                          const barW = Math.round((prob / maxProb) * 100);
                          return (
                            <div
                              key={n}
                              className="rounded-lg border border-slate-600/50 bg-slate-700/30 p-1.5 flex flex-col items-center gap-1"
                              title={`${repeat}/${total}회 (${pct}%)`}
                            >
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${numBg(n)}`}>
                                {n}
                              </span>
                              <div className="w-full h-1.5 rounded-full bg-slate-600/60 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-teal-400/80"
                                  style={{ width: `${barW}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-300 font-semibold leading-none">{pct}%</span>
                              <span className="text-[9px] text-slate-500 leading-none">{repeat}/{total}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              {s.activeTab === "prevRound" && (() => {
                const numBg = (n: number) =>
                  n <= 9 ? "bg-yellow-500" :
                  n <= 18 ? "bg-blue-500" :
                  n <= 27 ? "bg-red-500" :
                  n <= 36 ? "bg-slate-500" :
                  "bg-green-600";

                // 회차별 번호 셋 (보너스 포함) 조회용 맵
                const roundMap = new Map<number, Set<number>>();
                for (const r of s.allRounds) {
                  roundMap.set(r.round, new Set([r.n1, r.n2, r.n3, r.n4, r.n5, r.n6, r.bonus]));
                }
                const PREV_COUNT = 20;
                const bevel = "inset 1px 1px 0 rgba(255,255,255,0.18), inset -1px -1px 0 rgba(0,0,0,0.38)";

                return (
                  <div>
                    <div className="mb-2 p-2 bg-amber-900/30 rounded-lg border border-amber-700/50 text-xs text-amber-300">
                      제외 번호: {s.selectedPrevRounds.size > 0 ? Array.from(s.selectedPrevRounds).flatMap(r => {
                        const row = s.allRounds.find(d => d.round === r);
                        return row ? [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6, row.bonus].filter(Boolean) : [];
                      }).sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i).join(", ") : "없음"}
                    </div>
                    {s.allRoundsLoading && <p className="text-slate-500 text-xs text-center py-4">불러오는 중..</p>}
                    <div className="overflow-x-auto">
                    <div className="flex shrink-0 items-start">
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-18rem)]">
                      <table className="text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-700 z-10">
                          <tr className="text-slate-200 text-center">
                            <th className="pb-1 pr-2 text-center font-medium w-14">회차</th>
                            {Array.from({ length: PREV_COUNT }, (_, k) => (
                              <th
                                key={k}
                                onClick={() => toggleHeatCol(k)}
                                className={`p-0 font-medium w-[25px] min-w-[25px] max-w-[25px] text-center border border-slate-500 cursor-pointer transition-colors ${selectedHeatCols.has(k) ? "bg-amber-500/60 text-white" : "hover:bg-slate-600"}`}
                              >{k + 1}</th>
                            ))}
                            <th className="pb-1 w-2"></th>
                            {[1,2,3,4,5,6].map((label, i) => (
                              <th key={i} className="p-0 font-medium w-[25px] min-w-[25px] max-w-[25px] text-center border border-slate-600/50">{label}</th>
                            ))}
                            <th className="pb-1 w-2"></th>
                            <th className="p-0 font-medium w-[25px] min-w-[25px] max-w-[25px] text-center border border-slate-600/50 text-fuchsia-400">B</th>
                            <th
                              className="pb-1 w-8 cursor-pointer text-slate-400 hover:text-amber-400 transition-colors"
                              onClick={() => s.setSelectedPrevRounds(new Set())}
                              title="전체 해제"
                            >✕</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.allRounds.map((row) => {
                            const isSelected = s.selectedPrevRounds.has(row.round);
                            // 만나는 회차: 선택된 컬럼 k_0의 대상 회차 = R_max - k_0
                            const isMeetingRound = selectedHeatCols.size > 0 && selectedHeatCols.has(R_max - row.round);
                            const nums = [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6];
                            const currentNums = roundMap.get(row.round)!;
                            return (
                              <tr
                                key={row.round}
                                onClick={() => s.setSelectedPrevRounds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(row.round)) next.delete(row.round); else next.add(row.round);
                                  return next;
                                })}
                                className={`cursor-pointer transition-colors ${isSelected ? "bg-amber-900/20" : "hover:bg-slate-700/40"}`}
                              >
                                <td className={`pr-2 text-center font-bold border ${isSelected ? "text-amber-300 border-amber-700/40" : isMeetingRound ? "text-cyan-300 border-cyan-400/50" : "text-slate-400 border-slate-600/40"}`}>
                                  {row.round}
                                </td>
                                {Array.from({ length: PREV_COUNT }, (_, k) => {
                                  const prevNums = roundMap.get(row.round - (k + 1));
                                  const heatSelected = selectedHeatCols.has(k);
                                  // 대각선: 컬럼 k_0 선택 시, (R_max, k_0-1)→(R_max-1, k_0-2)→...→(R_max-(k_0-1), 0) ↙ 방향
                                  const isDiag = selectedHeatCols.size > 0 && selectedHeatCols.has(R_max - row.round + k + 1);
                                  const isMeet = isMeetingRound;
                                  const isCyan = isDiag || isMeet || heatSelected;
                                  if (!prevNums) return (
                                    <td
                                      key={k}
                                      className={`w-[25px] h-[25px] border ${isDiag ? "border-cyan-400/70" : isCyan ? "border-cyan-400/50" : "border-slate-600/40"}`}
                                      style={{ backgroundColor: isDiag ? "rgba(34,211,238,0.12)" : isCyan ? "rgba(34,211,238,0.07)" : "rgba(51,65,85,0.3)", boxShadow: isCyan ? bevel : undefined }}
                                    />
                                  );
                                  let cnt = 0;
                                  currentNums.forEach(n => { if (prevNums.has(n)) cnt++; });
                                  const alpha = cnt === 0 ? 0 : Math.min(0.2 + (cnt / 7) * 0.8, 1);
                                  const bg = isDiag
                                    ? (cnt === 0 ? "rgba(34,211,238,0.12)" : `rgba(34,211,238,${Math.min(0.2 + (cnt / 7) * 0.8, 1).toFixed(2)})`)
                                    : isCyan
                                      ? (cnt === 0 ? "rgba(34,211,238,0.07)" : `rgba(34,211,238,${(0.07 + alpha * 0.3).toFixed(2)})`)
                                      : cnt === 0
                                        ? "rgba(51,65,85,0.3)"
                                        : `rgba(245,158,11,${alpha.toFixed(2)})`;
                                  return (
                                    <td
                                      key={k}
                                      className={`text-center w-[25px] h-[25px] px-0 border ${isDiag ? "border-cyan-400/70" : isCyan ? "border-cyan-400/50" : "border-slate-600/40"}`}
                                      style={{ backgroundColor: bg, boxShadow: isCyan ? bevel : undefined }}
                                    >
                                      {cnt > 0 && (
                                        <span className={`font-semibold ${isCyan ? "text-cyan-100" : cnt >= 4 ? "text-white" : isSelected ? "text-amber-300" : "text-slate-300"}`}>{cnt}</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="w-2" />
                                {nums.map((n, i) => (
                                  <td key={i} className={`p-0 w-[25px] text-center border ${isMeetingRound ? "border-cyan-400/50" : "border-slate-600/40"}`}>
                                    <span className={`inline-flex items-center justify-center w-[25px] h-[25px] text-white font-bold transition-opacity ${numBg(n)} ${isSelected ? "opacity-40" : ""}`}>
                                      {n}
                                    </span>
                                  </td>
                                ))}
                                <td className="w-2" />
                                <td className={`p-0 w-[25px] text-center border ${isMeetingRound ? "border-cyan-400/50" : "border-slate-600/40"}`}>
                                  <span className={`inline-flex items-center justify-center w-[25px] h-[25px] text-white font-bold transition-opacity bg-fuchsia-600 ${isSelected ? "opacity-40" : ""}`}>
                                    {row.bonus}
                                  </span>
                                </td>
                                <td className={`text-center w-4 border ${isMeetingRound ? "border-cyan-400/50" : "border-slate-600/40"}`}>
                                  {isSelected && <span className="text-amber-400">✕</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 오른쪽: k별 비율 */}
                    {s.allRounds.length > 0 && (() => {
                      const stats = Array.from({ length: PREV_COUNT }, (_, k) => {
                        let total = 0, nonZero = 0;
                        for (const r of s.allRounds) {
                          const prev = roundMap.get(r.round - (k + 1));
                          if (!prev) continue;
                          total++;
                          const cur = roundMap.get(r.round)!;
                          let cnt = 0;
                          cur.forEach(n => { if (prev.has(n)) cnt++; });
                          if (cnt > 0) nonZero++;
                        }
                        return total > 0 ? nonZero / total : 0;
                      });
                      const maxRatio = Math.max(...stats);
                      const sorted = [...stats].sort((a, b) => b - a);
                      return (
                        <div className="shrink-0 overflow-y-auto max-h-[calc(100dvh-18rem)] border-l border-slate-600/50">
                          <div className="sticky top-0 bg-slate-700 text-slate-200 text-xs font-medium text-center pb-1 mb-0 border-b border-slate-600/50">비율</div>
                          {stats.map((ratio, k) => {
                            const pct = (ratio * 100).toFixed(1);
                            const barW = maxRatio > 0 ? (ratio / maxRatio) * 48 : 0;
                            const rank = sorted.indexOf(ratio);
                            const alpha = 0.15 + ((PREV_COUNT - 1 - rank) / (PREV_COUNT - 1)) * 0.85;
                            return (
                              <div key={k} className="flex items-center gap-1 border border-slate-600/40 px-1" style={{ backgroundColor: `rgba(245,158,11,${alpha.toFixed(2)})` }}>
                                <span className="text-xs text-slate-200 w-4 shrink-0">{k + 1}</span>
                                <div className="h-3 rounded-sm bg-amber-400/60 shrink-0" style={{ width: `${barW}px` }} />
                                <span className="text-xs text-white font-semibold shrink-0">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            </section>
          </div>
        </div>
        </div>
      )}

      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl w-max max-w-[95vw] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-600/50 shrink-0">
              <h3 className="text-base font-bold text-slate-100">저장된 추출 번호</h3>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 text-sm"
              >
                닫기
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 min-h-0 [scrollbar-width:thin]">
              {isHistoryLoading ? (
                <p className="text-sm text-slate-400 text-center py-8">불러오는 중…</p>
              ) : historyData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">저장된 번호가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {historyData.map(({ round, games }) => (
                    <div key={round}>
                      <div className="flex items-center justify-between mb-1 px-0.5">
                        <span className="text-sm font-bold text-amber-400">{round}회</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{games.length}게임</span>
                          <button
                            type="button"
                            onClick={() => void copyRoundToClipboard(round, games)}
                            className="px-2 py-0.5 text-[11px] text-slate-300 border border-slate-600/50 rounded hover:bg-slate-700/50 transition-colors"
                          >
                            복사
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-600/40 overflow-x-auto w-fit max-w-full">
                        <table className="w-auto text-xs border-collapse leading-none">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-600/30">
                              <th className="py-px pr-1 pl-1.5 text-right font-medium w-6">#</th>
                              <th className="py-px pr-1 text-left font-medium w-0 whitespace-nowrap">번호</th>
                              <th className="py-px pl-1 pr-0.5 text-right font-medium whitespace-nowrap">합</th>
                              <th className="py-px px-0.5 text-right font-medium whitespace-nowrap">홀짝</th>
                              <th className="py-px px-0.5 text-right font-medium whitespace-nowrap">연속</th>
                              <th className="py-px px-0.5 text-right font-medium whitespace-nowrap">5그룹</th>
                              <th className="py-px pr-1.5 pl-0.5 text-right font-medium whitespace-nowrap">9·45</th>
                            </tr>
                          </thead>
                          <tbody>
                            {games.map((nums, idx) => {
                              const sum = nums.reduce((a, b) => a + b, 0);
                              const consecutive = getConsecutivePairs(nums);
                              return (
                                <tr key={idx} className={idx > 0 ? "border-t border-slate-600/30" : undefined}>
                                  <td className="py-0 pr-1 pl-1.5 text-slate-500 text-right w-6 tabular-nums align-middle">
                                    {idx + 1}
                                  </td>
                                  <td className="py-0 pr-1 w-0 whitespace-nowrap align-middle">
                                    <div className="inline-flex gap-px">
                                      {nums.map((num, i) => (
                                        <span
                                          key={i}
                                          className={`inline-flex items-center justify-center w-7 h-6 text-white font-bold ${lottoNumBg(num)}`}
                                        >
                                          {num}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-0 pl-1 pr-0.5 text-slate-400 text-right tabular-nums align-middle whitespace-nowrap">
                                    {sum}
                                  </td>
                                  <td className="py-0 px-0.5 text-slate-300 text-right tabular-nums align-middle font-mono whitespace-nowrap">
                                    {formatOddEven(nums)}
                                  </td>
                                  <td className="py-0 px-0.5 text-slate-300 text-right tabular-nums align-middle whitespace-nowrap">
                                    {consecutive}
                                  </td>
                                  <td className="py-0 px-0.5 text-slate-300 text-right tabular-nums align-middle font-mono text-[10px] whitespace-nowrap">
                                    {formatGroup5Pattern(nums)}
                                  </td>
                                  <td className="py-0 pr-1.5 pl-0.5 text-slate-300 text-right tabular-nums align-middle font-mono whitespace-nowrap">
                                    {formatGroup9_45(nums)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
