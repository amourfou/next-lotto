import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export type DrawSettingsPayload = {
  gameCount: number;
  filterStates: Record<number, string>;
  groupCounts: Record<number, number>;
  groupEnabled: Record<number, boolean>;
  groupAtMost: Record<number, boolean>;
  patternSettings?: { sumMin?: number | null; sumMax?: number | null; maxConsecutivePairs?: number | null };
};

function parseFilterStates(raw: string): Record<number, string> {
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    const out: Record<number, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = parseInt(k, 10);
      if (!Number.isNaN(n) && typeof v === "string") out[n] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT game_count, filter_states, group_counts, group_enabled, group_at_most, pattern_settings, created_at, id
         FROM lotto_draw_settings
         ORDER BY id DESC
         LIMIT 1`
      )
      .get() as
      | {
          game_count: number;
          filter_states: string;
          group_counts: string;
          group_enabled: string;
          group_at_most: string;
          pattern_settings: string | null;
          created_at: string;
          id: number;
        }
      | undefined;

    if (!row) {
      return NextResponse.json({ settings: null });
    }

    let patternSettings: { sumMin?: number | null; sumMax?: number | null; maxConsecutivePairs?: number | null } = {};
    try {
      if (row.pattern_settings) patternSettings = JSON.parse(row.pattern_settings);
    } catch {}

    return NextResponse.json({
      settings: {
        id: row.id,
        gameCount: row.game_count,
        filterStates: parseFilterStates(row.filter_states),
        groupCounts: JSON.parse(row.group_counts) as Record<number, number>,
        groupEnabled: JSON.parse(row.group_enabled) as Record<number, boolean>,
        groupAtMost: JSON.parse(row.group_at_most) as Record<number, boolean>,
        patternSettings,
        createdAt: row.created_at,
      },
    });
  } catch (e) {
    console.error("settings GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "설정 조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DrawSettingsPayload;
    const gameCount = Math.min(
      100,
      Math.max(1, Number(body.gameCount) || 10)
    );
    const filterStates =
      body.filterStates && typeof body.filterStates === "object"
        ? JSON.stringify(body.filterStates)
        : "{}";
    const groupCounts =
      body.groupCounts && typeof body.groupCounts === "object"
        ? JSON.stringify(body.groupCounts)
        : "{}";
    const groupEnabled =
      body.groupEnabled && typeof body.groupEnabled === "object"
        ? JSON.stringify(body.groupEnabled)
        : "{}";
    const groupAtMost =
      body.groupAtMost && typeof body.groupAtMost === "object"
        ? JSON.stringify(body.groupAtMost)
        : "{}";
    const patternSettings =
      body.patternSettings && typeof body.patternSettings === "object"
        ? JSON.stringify({
            sumMin: body.patternSettings.sumMin ?? null,
            sumMax: body.patternSettings.sumMax ?? null,
            maxConsecutivePairs: body.patternSettings.maxConsecutivePairs ?? null,
          })
        : "{}";

    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO lotto_draw_settings (game_count, filter_states, group_counts, group_enabled, group_at_most, pattern_settings)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(gameCount, filterStates, groupCounts, groupEnabled, groupAtMost, patternSettings);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
      message: "설정이 회차로 저장되었습니다.",
    });
  } catch (e) {
    console.error("settings POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "설정 저장 실패" },
      { status: 500 }
    );
  }
}
