import { NextResponse } from "next/server";
import {
  getWinningRoundsForAnalysis,
  upsertLottoAnalysis,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/** Prev 구간 분석 시작 회차 (이 회차부터 직전 20회 기준으로 분류·출현 집계) */
const PREV_BUCKET_START_ROUND = 101;

const PREV_BUCKET_KEYS = ["Prev1", "Prev2", "Prev3", "Prev4", "Prev5"] as const;
type PrevBucketKey = (typeof PREV_BUCKET_KEYS)[number];

/** Prev1=직전1~5, Prev2=6~10, Prev3=11~15, Prev4=16~20 (회차 오프셋) */
const PREV_WINDOWS: { key: Exclude<PrevBucketKey, "Prev5">; from: number; to: number }[] = [
  { key: "Prev1", from: 1, to: 5 },
  { key: "Prev2", from: 6, to: 10 },
  { key: "Prev3", from: 11, to: 15 },
  { key: "Prev4", from: 16, to: 20 },
];

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

/** 1등 본번호 6개만 (보너스/2등 제외) */
function mainSix(r: {
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
}): number[] {
  return [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6];
}

/**
 * targetRound 직전 20회차 본번호(보너스 제외)로 Prev1~Prev5 분류.
 * 더 최근 구간에 나온 번호가 우선 배정되고, 어디에도 안 나온 번호는 Prev5.
 */
function buildPrevBucketGroups(
  roundsByRound: Map<number, number[]>,
  targetRound: number
): {
  groups: Record<PrevBucketKey, number[]>;
  windowRounds: Record<Exclude<PrevBucketKey, "Prev5">, number[]>;
} {
  const remaining = new Set<number>();
  for (let n = 1; n <= 45; n++) remaining.add(n);

  const groups = {
    Prev1: [] as number[],
    Prev2: [] as number[],
    Prev3: [] as number[],
    Prev4: [] as number[],
    Prev5: [] as number[],
  };
  const windowRounds = {
    Prev1: [] as number[],
    Prev2: [] as number[],
    Prev3: [] as number[],
    Prev4: [] as number[],
  };

  for (const w of PREV_WINDOWS) {
    const appeared = new Set<number>();
    const rs: number[] = [];
    for (let off = w.from; off <= w.to; off++) {
      const rnd = targetRound - off;
      rs.push(rnd);
      const nums = roundsByRound.get(rnd);
      if (!nums) continue;
      for (const n of nums) {
        if (n >= 1 && n <= 45) appeared.add(n);
      }
    }
    windowRounds[w.key] = rs;
    const bucket: number[] = [];
    Array.from(appeared).forEach((n) => {
      if (remaining.has(n)) {
        bucket.push(n);
        remaining.delete(n);
      }
    });
    bucket.sort((a, b) => a - b);
    groups[w.key] = bucket;
  }

  groups.Prev5 = Array.from(remaining).sort((a, b) => a - b);
  return { groups, windowRounds };
}

function emptyPrevCounts(): Record<PrevBucketKey, number> {
  return { Prev1: 0, Prev2: 0, Prev3: 0, Prev4: 0, Prev5: 0 };
}

/** 해당 회차 6개 당첨번호가 Prev1~5 중 어디에 속하는지 개수 */
function countWinningPrevBuckets(
  winning: number[],
  groups: Record<PrevBucketKey, number[]>
): Record<PrevBucketKey, number> {
  const member = new Map<number, PrevBucketKey>();
  for (const key of PREV_BUCKET_KEYS) {
    for (const n of groups[key]) member.set(n, key);
  }
  const counts = emptyPrevCounts();
  for (const n of winning) {
    const g = member.get(n);
    if (g) counts[g] += 1;
  }
  return counts;
}

function compositionKey(counts: Record<PrevBucketKey, number>): string {
  return PREV_BUCKET_KEYS.map((k) => counts[k]).join(",");
}

/**
 * 101회~최신 회차: 직전 Prev 분류 후 당첨 6개의 그룹 출현 집계.
 * 다음 회차(최신+1): Prev1~5 번호만 분류해 반환.
 */
function analyzePrevBuckets(
  rows: {
    round: number;
    n1: number;
    n2: number;
    n3: number;
    n4: number;
    n5: number;
    n6: number;
  }[]
) {
  const roundsByRound = new Map<number, number[]>();
  let maxRound = 0;
  for (const r of rows) {
    roundsByRound.set(r.round, mainSix(r));
    if (r.round > maxRound) maxRound = r.round;
  }

  const groupHitCounts = emptyPrevCounts();
  const groupSizeSum = emptyPrevCounts();
  const atLeastOneRoundCounts = emptyPrevCounts();
  /** 그룹별 회차당 출현 개수(0~6) 분포 */
  const hitCountDistribution: Record<PrevBucketKey, Record<number, number>> = {
    Prev1: {},
    Prev2: {},
    Prev3: {},
    Prev4: {},
    Prev5: {},
  };
  const compositionDistribution: Record<string, number> = {};
  /** 번호별 전체 1등(본번호) 출현 횟수 — 보너스 출현은 제외 */
  const overallHitByNum: Record<number, number> = {};
  /** 번호가 해당 Prev 그룹에 속한 회차 수 (101~최신 Prev 분석 구간) */
  const inGroupByNum: Record<number, Record<PrevBucketKey, number>> = {};
  /** 번호가 해당 Prev 그룹에 속한 회차 중 1등 본번호로 당첨된 횟수 */
  const hitInGroupByNum: Record<number, Record<PrevBucketKey, number>> = {};
  for (let n = 1; n <= 45; n++) {
    overallHitByNum[n] = 0;
    inGroupByNum[n] = emptyPrevCounts();
    hitInGroupByNum[n] = emptyPrevCounts();
  }

  /** 전체 회차 기준 본번호(1등) 출현 — roundsByRound 값은 mainSix만 담김 */
  let totalAllRounds = 0;
  roundsByRound.forEach((mainNums) => {
    totalAllRounds += 1;
    for (const n of mainNums) {
      if (n >= 1 && n <= 45) overallHitByNum[n] += 1;
    }
  });

  let analyzedRounds = 0;
  const startRound = PREV_BUCKET_START_ROUND;
  const endRound = maxRound;

  for (let T = startRound; T <= endRound; T++) {
    const winning = roundsByRound.get(T);
    if (!winning) continue;
    // 직전 20회 중 최소 1회라도 있어야 의미 있음 (101 시점이면 보통 충분)
    const { groups } = buildPrevBucketGroups(roundsByRound, T);
    const winningSet = new Set(winning);
    const counts = countWinningPrevBuckets(winning, groups);
    for (const key of PREV_BUCKET_KEYS) {
      groupHitCounts[key] += counts[key];
      groupSizeSum[key] += groups[key].length;
      if (counts[key] > 0) atLeastOneRoundCounts[key] += 1;
      const c = counts[key];
      hitCountDistribution[key][c] = (hitCountDistribution[key][c] ?? 0) + 1;
      for (const n of groups[key]) {
        inGroupByNum[n]![key] += 1;
        if (winningSet.has(n)) hitInGroupByNum[n]![key] += 1;
      }
    }
    const ck = compositionKey(counts);
    compositionDistribution[ck] = (compositionDistribution[ck] ?? 0) + 1;
    analyzedRounds += 1;
  }

  const nextRound = maxRound + 1;
  const { groups: nextGroups, windowRounds } = buildPrevBucketGroups(
    roundsByRound,
    nextRound
  );

  const totalBalls = analyzedRounds * 6;
  const groupHitRatio: Record<PrevBucketKey, number> = emptyPrevCounts();
  /** 당첨 6개 중 해당 그룹에서 나올 확률(%) — 공 1개 기준 */
  const nextAppearProbability: Record<PrevBucketKey, number> = emptyPrevCounts();
  /** 그룹에 속한 번호 1개가 당첨될 확률(%) */
  const perNumberHitProbability: Record<PrevBucketKey, number> = emptyPrevCounts();
  /** 해당 그룹에서 1개 이상 나올 회차 비율(%) */
  const atLeastOneProbability: Record<PrevBucketKey, number> = emptyPrevCounts();
  const avgGroupSize: Record<PrevBucketKey, number> = emptyPrevCounts();
  const avgPerRound: Record<PrevBucketKey, number> = emptyPrevCounts();

  for (const key of PREV_BUCKET_KEYS) {
    groupHitRatio[key] =
      totalBalls > 0
        ? Math.round((groupHitCounts[key] / totalBalls) * 1000) / 10
        : 0;
    nextAppearProbability[key] = groupHitRatio[key];
    perNumberHitProbability[key] =
      groupSizeSum[key] > 0
        ? Math.round((groupHitCounts[key] / groupSizeSum[key]) * 1000) / 10
        : 0;
    atLeastOneProbability[key] =
      analyzedRounds > 0
        ? Math.round((atLeastOneRoundCounts[key] / analyzedRounds) * 1000) / 10
        : 0;
    avgGroupSize[key] =
      analyzedRounds > 0
        ? Math.round((groupSizeSum[key] / analyzedRounds) * 10) / 10
        : 0;
    avgPerRound[key] =
      analyzedRounds > 0
        ? Math.round((groupHitCounts[key] / analyzedRounds) * 100) / 100
        : 0;
  }

  /** 번호별 전체 출현 확률(전체 회차) + Prev 그룹 소속 시 다음 회차 출현 확률 (툴팁용) */
  const numberStats: Record<
    string,
    {
      overallAppearRate: number;
      overallHits: number;
      /** 전체 출현 분모 = 저장된 전체 당첨 회차 수 (예: 1235) */
      totalRounds: number;
      byGroup: Record<
        PrevBucketKey,
        { inGroup: number; hits: number; appearRate: number }
      >;
    }
  > = {};

  for (let n = 1; n <= 45; n++) {
    const overallHits = overallHitByNum[n] ?? 0;
    const byGroup = {} as Record<
      PrevBucketKey,
      { inGroup: number; hits: number; appearRate: number }
    >;
    for (const key of PREV_BUCKET_KEYS) {
      const inGroup = inGroupByNum[n]![key] ?? 0;
      const hits = hitInGroupByNum[n]![key] ?? 0;
      byGroup[key] = {
        inGroup,
        hits,
        appearRate:
          inGroup > 0 ? Math.round((hits / inGroup) * 1000) / 10 : 0,
      };
    }
    numberStats[String(n)] = {
      overallAppearRate:
        totalAllRounds > 0
          ? Math.round((overallHits / totalAllRounds) * 1000) / 10
          : 0,
      overallHits,
      totalRounds: totalAllRounds,
      byGroup,
    };
  }

  return {
    startRound,
    endRound,
    analyzedRounds,
    nextRound,
    /** 다음 회차 기준 Prev1~5 번호 (배타 분류) */
    nextGroups,
    /** Prev1~4에 사용된 직전 회차 번호 목록 */
    nextWindowRounds: windowRounds,
    /** 101~최신: 당첨 6개 중 각 Prev 그룹에서 나온 번호 개수 합 */
    groupHitCounts,
    /** 전체 당첨 공 대비 비율(%) = nextAppearProbability */
    groupHitRatio,
    /**
     * 다음 회차 당첨 번호(공 1개)가 해당 Prev 그룹에서 나올 확률(%).
     * 101~최신 회차 당첨 6개 중 그룹 비중과 동일.
     */
    nextAppearProbability,
    /**
     * 해당 그룹에 속한 번호 1개가 그 회차 당첨에 포함될 확률(%).
     * hits / Σ|PrevK| over rounds
     */
    perNumberHitProbability,
    /** 회차당 해당 그룹에서 1개 이상 나올 확률(%) */
    atLeastOneProbability,
    /** 회차당 평균 그룹 크기(번호 개수) */
    avgGroupSize,
    /** 회차당 평균 출현 개수 (6개 중) */
    avgPerRound,
    /** 그룹별 회차당 출현 개수(0~6) 분포 */
    hitCountDistribution,
    /**
     * 회차별 구성 분포. 키 = "Prev1개수,Prev2,...,Prev5" (합 6)
     * 예: "2,1,1,1,1"
     */
    compositionDistribution,
    /**
     * 번호별 통계.
     * overallAppearRate: 전체 회차(1~최신, 예: 1235) 중 당첨 6개에 포함된 비율(%)
     * byGroup[PrevK].appearRate: 회차 T 직전 분류로 PrevK에 속했을 때,
     *   그 다음 회차 T 당첨 6개에 포함된 비율(%) — hits/inGroup (Prev 분석 구간 101~최신)
     */
    numberStats,
  };
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

    // 인기/비인기 등 전체 빈도: 1등 본번호만 (보너스=2등 제외)
    const freq: Record<number, number> = {};
    for (let n = 1; n <= 45; n++) freq[n] = 0;

    for (const r of rows) {
      for (const n of mainSix(r)) {
        if (n >= 1 && n <= 45) freq[n] = (freq[n] ?? 0) + 1;
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
    const prevBucketAnalysis = analyzePrevBuckets(rows);

    /**
     * 정렬된 6자리(1번째=최소 … 6번째=최대)별 번호 출현 횟수·비율.
     * 이론 범위: 자리 k(1~6) → k ~ (40+k)
     */
    const positionCounts: Record<number, number>[] = Array.from({ length: 6 }, () => {
      const c: Record<number, number> = {};
      for (let n = 1; n <= 45; n++) c[n] = 0;
      return c;
    });
    for (const r of rows) {
      const sorted = mainSix(r).filter((n) => n >= 1 && n <= 45).sort((a, b) => a - b);
      if (sorted.length !== 6) continue;
      for (let i = 0; i < 6; i++) {
        const n = sorted[i]!;
        positionCounts[i]![n] = (positionCounts[i]![n] ?? 0) + 1;
      }
    }
    const totalPosRounds = rows.length;
    const positionFrequency = {
      totalRounds: totalPosRounds,
      positions: positionCounts.map((counts, i) => {
        const theoryMin = i + 1;
        const theoryMax = 40 + i;
        const entries = Object.entries(counts)
          .map(([num, count]) => ({
            num: parseInt(num, 10),
            count,
            pct:
              totalPosRounds > 0
                ? Math.round((count / totalPosRounds) * 1000) / 10
                : 0,
          }))
          .filter((e) => e.count > 0)
          .sort((a, b) => a.num - b.num);
        const observedMin = entries.length > 0 ? entries[0]!.num : theoryMin;
        const observedMax =
          entries.length > 0 ? entries[entries.length - 1]!.num : theoryMax;
        return {
          position: i + 1,
          theoryMin,
          theoryMax,
          observedMin,
          observedMax,
          entries,
        };
      }),
    };

    const updatedAt = new Date().toISOString();

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
      prevBucketAnalysis,
      positionFrequency,
      updatedAt,
    };

    await upsertLottoAnalysis(JSON.stringify(analysis));

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
