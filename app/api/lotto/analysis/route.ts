import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getLottoAnalysisRow } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const row = await getLottoAnalysisRow();

    if (!row) {
      return NextResponse.json({ analysis: null });
    }

    const parsed = JSON.parse(row.data) as {
      totalRounds: number;
      frequencies: Record<number, number>;
      hot: number[];
      cold: number[];
      sumPattern?: {
        min: number;
        max: number;
        avg: number;
        histogram: Record<number, number>;
      };
      group9_45Distribution?: Record<string, number>;
      groupPatternDistribution?: Record<string, number>;
      /** 패턴별 출현 회차 번호(오름차순) */
      groupPatternRounds?: Record<string, number[]>;
      /** 데이터상 마지막 당첨 회차 번호 */
      latestRound?: number;
      consecutivePattern?: {
        avgConsecutivePairs: number;
        avgMaxRun: number;
        pairDistribution: Record<number, number>;
        maxRunDistribution: Record<number, number>;
      };
      updatedAt: string;
    };
    return NextResponse.json({
      analysis: {
        ...parsed,
        createdAt: row.created_at,
      },
    });
  } catch (e) {
    console.error("lotto analysis GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
