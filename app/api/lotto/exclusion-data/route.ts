import { NextResponse } from "next/server";
import { getExclusionSets } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { winningSets, drawnSets } = await getExclusionSets();
    return NextResponse.json({
      winningSets,
      drawnSets,
    });
  } catch (e) {
    console.error("lotto exclusion-data GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
