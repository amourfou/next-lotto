import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  getMaxLottoRound,
  upsertLottoRounds,
  setLottoMeta,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

/** UI에 표시할 다음 저장 회차 = 현재 DB 최대 회차 + 1 */
export async function GET() {
  noStore();
  try {
    const max = await getMaxLottoRound();
    const nextRound = Math.max(1, max + 1);
    return NextResponse.json({ nextRound });
  } catch (e) {
    console.error("add-winning GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 당첨 6개 + 보너스 1개를 lotto_rounds에 저장 (회차는 서버에서 max+1).
 * last_official_round 메타를 해당 회차로 갱신합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { numbers?: unknown; bonus?: unknown };
    const raw = body.numbers;
    if (!Array.isArray(raw) || raw.length !== 6) {
      return NextResponse.json(
        { error: "당첨 번호 6개를 배열로 보내 주세요. (numbers: number[])" },
        { status: 400 }
      );
    }

    const main: number[] = [];
    for (const n of raw) {
      const v = Math.min(45, Math.max(1, Math.floor(Number(n))));
      if (Number.isNaN(v)) {
        return NextResponse.json({ error: "당첨 번호에 유효하지 않은 값이 있습니다." }, { status: 400 });
      }
      main.push(v);
    }

    const uniq = new Set(main);
    if (uniq.size !== 6) {
      return NextResponse.json({ error: "당첨 번호 6개는 서로 달라야 합니다." }, { status: 400 });
    }

    const bonusRaw = body.bonus;
    const bonus = Math.min(45, Math.max(1, Math.floor(Number(bonusRaw))));
    if (Number.isNaN(bonus)) {
      return NextResponse.json({ error: "보너스 번호는 1~45 숫자여야 합니다." }, { status: 400 });
    }
    if (main.includes(bonus)) {
      return NextResponse.json({ error: "보너스 번호는 당첨 6개와 겹칠 수 없습니다." }, { status: 400 });
    }

    const sorted = [...main].sort((a, b) => a - b);
    const maxRound = await getMaxLottoRound();
    const round = Math.max(1, maxRound + 1);

    const row = {
      round,
      n1: sorted[0],
      n2: sorted[1],
      n3: sorted[2],
      n4: sorted[3],
      n5: sorted[4],
      n6: sorted[5],
      bonus,
    };

    await upsertLottoRounds([row]);

    try {
      await setLottoMeta("last_official_round", String(round));
    } catch {
      // lotto_meta 없으면 무시
    }

    return NextResponse.json({
      success: true,
      round,
      message: `${round}회차 당첨 번호가 저장되었습니다.`,
    });
  } catch (e) {
    console.error("add-winning POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
