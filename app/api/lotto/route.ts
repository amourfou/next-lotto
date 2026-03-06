import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
    const round = searchParams.get("round");

    const db = getDb();

    if (round !== null && round !== undefined && round !== "") {
      const r = parseInt(round, 10);
      if (Number.isNaN(r)) {
        return NextResponse.json({ error: "회차는 숫자여야 합니다." }, { status: 400 });
      }
      const row = db.prepare(
        "SELECT round, n1, n2, n3, n4, n5, n6, bonus, created_at FROM lotto_rounds WHERE round = ?"
      ).get(r);
      if (!row) {
        return NextResponse.json({ error: "해당 회차가 없습니다." }, { status: 404 });
      }
      return NextResponse.json(row);
    }

    const rows = db.prepare(
      `SELECT round, n1, n2, n3, n4, n5, n6, bonus, created_at
       FROM lotto_rounds
       ORDER BY round DESC
       LIMIT ? OFFSET ?`
    ).all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) as count FROM lotto_rounds").get() as { count: number };

    return NextResponse.json({
      data: rows,
      total: total.count,
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
