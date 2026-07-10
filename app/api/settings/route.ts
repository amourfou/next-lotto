import { NextRequest, NextResponse } from "next/server";
import {
  getLatestLottoDrawSettings,
  insertLottoDrawSettings,
} from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export type DrawSettingsPayload = {
  gameCount: number;
  filterStates: Record<number, string>;
  /** 그룹별 {min,max} 또는 구버전 number */
  groupCounts: Record<number, number | { min: number; max: number }>;
  groupEnabled: Record<number, boolean>;
  /** 구버전 지정/이하. 범위 저장 시 빈 객체 가능 */
  groupAtMost?: Record<number, boolean>;
  patternSettings?: {
    sumMin?: number | null;
    sumMax?: number | null;
    maxConsecutivePairs?: number | null;
    group9_45Keys?: string[];
    oddEvenKeys?: string[];
    prevRoundKeys?: number[];
  };
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
    const row = await getLatestLottoDrawSettings();

    if (!row) {
      return NextResponse.json({ settings: null });
    }

    let patternSettings: {
      sumMin?: number | null;
      sumMax?: number | null;
      maxConsecutivePairs?: number | null;
      group9_45Keys?: string[];
      oddEvenKeys?: string[];
      prevRoundKeys?: number[];
    } = {};
    try {
      if (row.pattern_settings) patternSettings = JSON.parse(row.pattern_settings);
    } catch {}

    return NextResponse.json({
      settings: {
        id: row.id,
        gameCount: row.game_count,
        filterStates: parseFilterStates(row.filter_states),
        groupCounts: JSON.parse(row.group_counts) as Record<number, number | { min: number; max: number }>,
        groupEnabled: JSON.parse(row.group_enabled) as Record<number, boolean>,
        groupAtMost: JSON.parse(row.group_at_most || "{}") as Record<number, boolean>,
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
            group9_45Keys: Array.isArray(body.patternSettings.group9_45Keys) ? body.patternSettings.group9_45Keys : [],
            oddEvenKeys: Array.isArray(body.patternSettings.oddEvenKeys) ? body.patternSettings.oddEvenKeys : [],
            prevRoundKeys: Array.isArray(body.patternSettings.prevRoundKeys) ? body.patternSettings.prevRoundKeys : [],
          })
        : "{}";

    const id = await insertLottoDrawSettings({
      game_count: gameCount,
      filter_states: filterStates,
      group_counts: groupCounts,
      group_enabled: groupEnabled,
      group_at_most: groupAtMost,
      pattern_settings: patternSettings,
    });

    return NextResponse.json({
      success: true,
      id,
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
