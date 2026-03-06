import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";

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

    const latestRound = parseInt(lines[0], 10);
    if (Number.isNaN(latestRound) || latestRound < 1) {
      return NextResponse.json(
        { error: "첫 줄은 최신 회차 번호(숫자)여야 합니다." },
        { status: 400 }
      );
    }

    const db = getDb();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO lotto_rounds (round, n1, n2, n3, n4, n5, n6, bonus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows: { round: number; nums: number[]; bonus: number }[]) => {
      for (const { round, nums, bonus } of rows) {
        if (nums.length !== 6) continue;
        insert.run(round, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5], bonus);
      }
    });

    const rows: { round: number; nums: number[]; bonus: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const round = latestRound - i + 1;
      if (round < 1) break;
      const parts = lines[i].split(/\t/).map((s) => parseInt(s.trim(), 10));
      if (parts.length < 7) continue;
      const nums = parts.slice(0, 6);
      const bonus = parts[6];
      if (nums.some((n) => Number.isNaN(n)) || Number.isNaN(bonus)) continue;
      rows.push({ round, nums, bonus });
    }

    insertMany(rows);

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
