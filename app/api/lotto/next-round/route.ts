import { NextResponse } from "next/server";
import { getLastOfficialRound, getMaxLottoRound } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/** 추출 번호의 대상 회차 = 최신 당첨 회차 + 1. meta 없으면 lotto_rounds 최대 회차+1 사용 */
export async function GET() {
  try {
    const lastOfficial = await getLastOfficialRound();
    const nextRound =
      lastOfficial > 0 ? lastOfficial + 1 : (await getMaxLottoRound()) + 1;
    return NextResponse.json({ nextRound: Math.max(1, nextRound) });
  } catch (e) {
    console.error("lotto next-round GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
