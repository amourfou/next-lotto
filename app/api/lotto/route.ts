import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getLottoRoundByRound,
  getLottoRounds,
  getLottoRoundsCount,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  noStore();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
    const round = searchParams.get("round");

    if (round !== null && round !== undefined && round !== "") {
      const r = parseInt(round, 10);
      if (Number.isNaN(r)) {
        return NextResponse.json({ error: "회차는 숫자여야 합니다." }, { status: 400 });
      }
      const row = await getLottoRoundByRound(r);
      if (!row) {
        return NextResponse.json({ error: "해당 회차가 없습니다." }, { status: 404 });
      }
      return NextResponse.json(row);
    }

    const rows = await getLottoRounds(limit, offset);
    const total = await getLottoRoundsCount();

    return NextResponse.json({
      data: rows,
      total,
      limit,
      offset,
    });
  } catch (e) {
    console.error("lotto GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
