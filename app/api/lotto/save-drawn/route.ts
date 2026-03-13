import { NextRequest, NextResponse } from "next/server";
import {
  getLastOfficialRound,
  getMaxLottoRound,
  deleteLottoDrawnByRound,
  insertLottoDrawnBatch,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { games?: number[][] };
    const games = body.games;
    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json(
        { error: "저장할 번호가 없습니다. 먼저 번호를 뽑아주세요." },
        { status: 400 }
      );
    }

    const normalized: number[][] = [];
    for (const row of games) {
      if (!Array.isArray(row) || row.length !== 6) {
        return NextResponse.json(
          { error: "각 게임은 번호 6개여야 합니다." },
          { status: 400 }
        );
      }
      const nums = row.map((n) => Math.min(45, Math.max(1, Number(n))));
      if (nums.some((n) => Number.isNaN(n))) {
        return NextResponse.json({ error: "유효하지 않은 번호가 있습니다." }, { status: 400 });
      }
      normalized.push([...nums].sort((a, b) => a - b));
    }

    const lastOfficial = await getLastOfficialRound();
    const nextRound = Math.max(
      1,
      lastOfficial > 0 ? lastOfficial + 1 : (await getMaxLottoRound()) + 1
    );

    await deleteLottoDrawnByRound(nextRound);
    await insertLottoDrawnBatch(nextRound, normalized);

    return NextResponse.json({
      success: true,
      message: `${nextRound}회차용 추출 번호 ${games.length}게임 저장됨`,
      nextRound,
      count: games.length,
    });
  } catch (e) {
    console.error("save-drawn error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
