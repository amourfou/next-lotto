import { NextRequest, NextResponse } from "next/server";
import { getMaxLottoRound, insertLottoRound } from "@/lib/lottoSupabaseUtils";

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
    }

    const maxRound = await getMaxLottoRound();
    const startRound = maxRound + 1;

    for (let i = 0; i < games.length; i++) {
      const sorted = [...games[i]].map((n) => Math.min(45, Math.max(1, Number(n)))).sort((a, b) => a - b);
      await insertLottoRound({
        round: startRound + i,
        n1: sorted[0],
        n2: sorted[1],
        n3: sorted[2],
        n4: sorted[3],
        n5: sorted[4],
        n6: sorted[5],
        bonus: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${games.length}개 회차 저장됨 (${startRound}회 ~ ${startRound + games.length - 1}회)`,
      startRound,
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
