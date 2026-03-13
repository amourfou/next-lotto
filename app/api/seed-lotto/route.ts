import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { upsertLottoRounds } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

const LOTTO_FILE = path.join(process.cwd(), "LottoNumber.txt");

export async function POST() {
  try {
    if (!fs.existsSync(LOTTO_FILE)) {
      return NextResponse.json(
        { error: "LottoNumber.txt 파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(LOTTO_FILE, "utf-8");
    const lines = content.trim().split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "파일 형식이 올바르지 않습니다. (최소 2줄: 회차 + 데이터 1줄)" },
        { status: 400 }
      );
    }

    const totalRounds = parseInt(lines[0], 10);
    if (Number.isNaN(totalRounds) || totalRounds < 1) {
      return NextResponse.json(
        { error: "첫 줄은 회차 개수(숫자)여야 합니다." },
        { status: 400 }
      );
    }

    const rows: {
      round: number;
      n1: number;
      n2: number;
      n3: number;
      n4: number;
      n5: number;
      n6: number;
      bonus: number;
    }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const round = totalRounds - i + 1;
      if (round < 1) break;
      const parts = lines[i].trim().split(/\s+/).map((s) => parseInt(s, 10));
      if (parts.length < 7) continue;
      const nums = parts.slice(0, 6);
      const bonus = parts[6];
      if (nums.some((n) => Number.isNaN(n)) || Number.isNaN(bonus)) continue;
      rows.push({
        round,
        n1: nums[0],
        n2: nums[1],
        n3: nums[2],
        n4: nums[3],
        n5: nums[4],
        n6: nums[5],
        bonus,
      });
    }

    await upsertLottoRounds(rows);

    return NextResponse.json({
      success: true,
      message: `${rows.length}개 회차가 저장되었습니다.`,
      count: rows.length,
    });
  } catch (e) {
    console.error("seed-lotto error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
