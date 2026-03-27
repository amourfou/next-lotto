import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAllPensionDrawnGrouped, getAllPensionRoundOptions } from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const drawn = await getAllPensionDrawnGrouped();

    // 옵션 테이블이 없을 수 있으므로 조용히 처리
    let optionsMap: Record<number, object> = {};
    try {
      const opts = await getAllPensionRoundOptions();
      for (const o of opts) {
        optionsMap[o.round] = {
          selectedPatterns: o.selectedPatterns,
          selectedDuplicateDigits: o.selectedDuplicateDigits,
          limitToStdDev: o.limitToStdDev,
          useRecentTrend: o.useRecentTrend,
        };
      }
    } catch {
      // pension_round_options 테이블이 없으면 무시
    }

    const data = drawn.map(({ round, predictions }) => ({
      round,
      predictions,
      options: optionsMap[round] ?? null,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error("pension drawn/all GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
