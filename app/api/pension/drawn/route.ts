import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getMaxPensionOrderNum,
  getPensionDrawnByRound,
  deletePensionDrawnByRound,
} from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const maxOrder = await getMaxPensionOrderNum();
    const nextRound = Math.max(1, maxOrder + 1);
    const drawn = await getPensionDrawnByRound(nextRound);

    return NextResponse.json({
      round: nextRound,
      predictions: drawn.map((d) => d.digits),
      count: drawn.length,
    });
  } catch (e) {
    console.error("pension drawn GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  noStore();
  try {
    const maxOrder = await getMaxPensionOrderNum();
    const nextRound = Math.max(1, maxOrder + 1);
    await deletePensionDrawnByRound(nextRound);
    return NextResponse.json({ success: true, round: nextRound });
  } catch (e) {
    console.error("pension drawn DELETE error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
