import { NextResponse } from "next/server";
import {
  getWinningRoundsForAnalysis,
  upsertLottoAnalysis,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/** 1~9, 10~18, 19~27, 28~36, 37~45 → 인덱스 0~4 */
function lottoStatGroupIndex(n: number): number {
  if (n <= 9) return 0;
  if (n <= 18) return 1;
  if (n <= 27) return 2;
  if (n <= 36) return 3;
  return 4;
}

/** 6개 본번호의 그룹별 개수를 5자리 문자열로 (예: 11202) */
function mainNumbersGroupPatternKey(nums: number[]): string {
  const counts = [0, 0, 0, 0, 0];
  for (const n of nums) {
    counts[lottoStatGroupIndex(n)] += 1;
  }
  return counts.map(String).join("");
}

export async function POST() {
  try {
    const rows = await getWinningRoundsForAnalysis();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "저장된 당첨 번호가 없습니다. 먼저 당첨 번호를 저장하세요." },
        { status: 400 }
      );
    }

    const freq: Record<number, number> = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;

    for (const r of rows) {
      for (const n of [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6, r.bonus]) {
        freq[n] = (freq[n] ?? 0) + 1;
      }
    }

    const sorted = Object.entries(freq)
      .map(([num, count]) => ({ num: parseInt(num, 10), count }))
      .sort((a, b) => b.count - a.count);

    const hot = sorted.slice(0, 10).map((x) => x.num);
    const cold = sorted.slice(-10).reverse().map((x) => x.num);

    const sums: number[] = [];
    for (const r of rows) {
      const sum = r.n1 + r.n2 + r.n3 + r.n4 + r.n5 + r.n6;
      sums.push(sum);
    }
    const sumMin = Math.min(...sums);
    const sumMax = Math.max(...sums);
    const sumAvg = Math.round((sums.reduce((a, b) => a + b, 0) / sums.length) * 10) / 10;
    const sumHistogram: Record<number, number> = {};
    for (const s of sums) {
      sumHistogram[s] = (sumHistogram[s] ?? 0) + 1;
    }

    const consecutiveCounts: number[] = [];
    const maxRunLengths: number[] = [];
    for (const r of rows) {
      const arr = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].sort((a, b) => a - b);
      let pairs = 0;
      let maxRun = 1;
      let run = 1;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i - 1] + 1) {
          pairs += 1;
          run += 1;
        } else {
          maxRun = Math.max(maxRun, run);
          run = 1;
        }
      }
      maxRun = Math.max(maxRun, run);
      consecutiveCounts.push(pairs);
      maxRunLengths.push(maxRun);
    }
    const consecutiveDist: Record<number, number> = {};
    for (const c of consecutiveCounts) {
      consecutiveDist[c] = (consecutiveDist[c] ?? 0) + 1;
    }
    const maxRunDist: Record<number, number> = {};
    for (const m of maxRunLengths) {
      maxRunDist[m] = (maxRunDist[m] ?? 0) + 1;
    }
    const avgConsecutivePairs =
      Math.round((consecutiveCounts.reduce((a, b) => a + b, 0) / consecutiveCounts.length) * 100) / 100;
    const avgMaxRun =
      Math.round((maxRunLengths.reduce((a, b) => a + b, 0) / maxRunLengths.length) * 100) / 100;

    const group9_45Distribution: Record<string, number> = {};
    for (const r of rows) {
      const n9 = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].filter((n) => n >= 1 && n <= 9).length;
      const n45 = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].filter((n) => n >= 37 && n <= 45).length;
      const key = `${n9},${n45}`;
      group9_45Distribution[key] = (group9_45Distribution[key] ?? 0) + 1;
    }

    const groupPatternRounds: Record<string, number[]> = {};
    for (const r of rows) {
      const gKey = mainNumbersGroupPatternKey([r.n1, r.n2, r.n3, r.n4, r.n5, r.n6]);
      if (!groupPatternRounds[gKey]) groupPatternRounds[gKey] = [];
      groupPatternRounds[gKey].push(r.round);
    }
    const groupPatternDistribution: Record<string, number> = {};
    for (const [k, arr] of Object.entries(groupPatternRounds)) {
      groupPatternDistribution[k] = arr.length;
    }

    const latestRound = rows[rows.length - 1]!.round;
    const data = JSON.stringify({
      totalRounds: rows.length,
      frequencies: freq,
      hot,
      cold,
      sumPattern: {
        min: sumMin,
        max: sumMax,
        avg: sumAvg,
        histogram: sumHistogram,
      },
      consecutivePattern: {
        avgConsecutivePairs,
        avgMaxRun,
        pairDistribution: consecutiveDist,
        maxRunDistribution: maxRunDist,
      },
      group9_45Distribution,
      groupPatternDistribution,
      groupPatternRounds,
      latestRound,
      updatedAt: new Date().toISOString(),
    });

    await upsertLottoAnalysis(data);

    const analysis = {
      totalRounds: rows.length,
      frequencies: freq,
      hot,
      cold,
      sumPattern: {
        min: sumMin,
        max: sumMax,
        avg: sumAvg,
        histogram: sumHistogram,
      },
      consecutivePattern: {
        avgConsecutivePairs,
        avgMaxRun,
        pairDistribution: consecutiveDist,
        maxRunDistribution: maxRunDist,
      },
      group9_45Distribution,
      groupPatternDistribution,
      groupPatternRounds,
      latestRound,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `분석 완료 (${rows.length}회차 기준)`,
      analysis: {
        ...analysis,
        group9_45Distribution: analysis.group9_45Distribution ?? {},
        groupPatternDistribution: analysis.groupPatternDistribution ?? {},
        groupPatternRounds: analysis.groupPatternRounds ?? {},
      },
    });
  } catch (e) {
    console.error("analyze-lotto error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
