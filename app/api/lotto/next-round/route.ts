import { NextResponse } from "next/server";
import { getLastOfficialRound } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/** 추출 번호의 대상 회차 = 최신 당첨 회차 + 1 */
export async function GET() {
  try {
    const lastOfficial = await getLastOfficialRound();
    const nextRound = lastOfficial + 1;
    return NextResponse.json({ nextRound });
  } catch (e) {
    console.error("lotto next-round GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
