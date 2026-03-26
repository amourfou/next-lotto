import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getMaxLottoRound } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/**
 * 추출/클립보드용 “다음 회차” = lotto_rounds에 저장된 최대 회차 + 1.
 * (last_official_round 메타만 쓰면 메타가 DB보다 뒤처진 경우 최근 당첨 회차와 같은 숫자가 나올 수 있음)
 */
export async function GET() {
  noStore();
  try {
    const maxRound = await getMaxLottoRound();
    const nextRound = Math.max(1, maxRound + 1);
    return NextResponse.json({ nextRound, maxRound });
  } catch (e) {
    console.error("lotto next-round GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
