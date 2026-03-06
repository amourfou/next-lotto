import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT n1, n2, n3, n4, n5, n6, bonus FROM lotto_rounds ORDER BY round ASC"
      )
      .all() as { n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[];

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

    // 합계 패턴: 각 회차 6개 번호 합 (21~255)
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

    // 연속번호 패턴: 각 회차에서 연속된 번호 쌍 개수 (예: 3,4 → 1쌍, 10,11,12 → 2쌍)
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
      updatedAt: new Date().toISOString(),
    });

    db.prepare(
      "INSERT OR REPLACE INTO lotto_analysis (id, data, created_at) VALUES (1, ?, datetime('now'))"
    ).run(data);

    return NextResponse.json({
      success: true,
      message: `분석 완료 (${rows.length}회차 기준)`,
      hot,
      cold,
      sumPattern: { min: sumMin, max: sumMax, avg: sumAvg },
      consecutivePattern: { avgConsecutivePairs, avgMaxRun },
    });
  } catch (e) {
    console.error("analyze-lotto error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
