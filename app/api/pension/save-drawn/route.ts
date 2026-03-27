import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getMaxPensionOrderNum,
  deletePensionDrawnByRound,
  insertPensionDrawnBatch,
  upsertPensionRoundOptions,
} from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  noStore();
  try {
    const body = (await request.json()) as {
      predictions?: number[][];
      options?: {
        selectedPatterns?: string[];
        selectedDuplicateDigits?: number[];
        limitToStdDev?: boolean;
        useRecentTrend?: boolean;
      };
    };
    const predictions = body.predictions;

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json(
        { error: "저장할 번호가 없습니다. 먼저 번호를 뽑아주세요." },
        { status: 400 }
      );
    }

    for (const row of predictions) {
      if (!Array.isArray(row) || row.length !== 6) {
        return NextResponse.json(
          { error: "각 예측은 숫자 6개여야 합니다." },
          { status: 400 }
        );
      }
      if (row.some((n) => !Number.isInteger(n) || n < 0 || n > 9)) {
        return NextResponse.json(
          { error: "각 자릿수는 0~9 범위의 정수여야 합니다." },
          { status: 400 }
        );
      }
    }

    // 다음 회차 = DB 최대 회차 + 1
    const maxOrder = await getMaxPensionOrderNum();
    const nextRound = Math.max(1, maxOrder + 1);

    // 같은 회차 기존 데이터 삭제 후 재저장 (덮어쓰기)
    await deletePensionDrawnByRound(nextRound);
    await insertPensionDrawnBatch(nextRound, predictions);

    // 예측 옵션 저장 (테이블이 없으면 조용히 무시)
    if (body.options) {
      try {
        await upsertPensionRoundOptions({
          round: nextRound,
          selectedPatterns: body.options.selectedPatterns ?? [],
          selectedDuplicateDigits: body.options.selectedDuplicateDigits ?? [],
          limitToStdDev: body.options.limitToStdDev ?? false,
          useRecentTrend: body.options.useRecentTrend ?? false,
        });
      } catch {
        // pension_round_options 테이블이 없는 경우 등은 무시
      }
    }

    return NextResponse.json({
      success: true,
      message: `${nextRound}회차용 예측 번호 ${predictions.length}게임 저장됨`,
      round: nextRound,
      count: predictions.length,
    });
  } catch (e) {
    console.error("pension save-drawn error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
