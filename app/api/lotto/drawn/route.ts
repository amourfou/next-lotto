import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getMaxLottoRound,
  getLottoDrawnByRound,
  deleteLottoDrawnByRound,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const maxRound = await getMaxLottoRound();
    const nextRound = Math.max(1, maxRound + 1);
    const games = await getLottoDrawnByRound(nextRound);

    return NextResponse.json({
      round: nextRound,
      games,
      count: games.length,
    });
  } catch (e) {
    console.error("lotto drawn GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  noStore();
  try {
    const maxRound = await getMaxLottoRound();
    const nextRound = Math.max(1, maxRound + 1);
    await deleteLottoDrawnByRound(nextRound);
    return NextResponse.json({ success: true, round: nextRound });
  } catch (e) {
    console.error("lotto drawn DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
