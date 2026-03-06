import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const row = db
      .prepare("SELECT data, created_at FROM lotto_analysis WHERE id = 1")
      .get() as { data: string; created_at: string } | undefined;

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
