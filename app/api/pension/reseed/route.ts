import { NextResponse } from "next/server";
import { readPensionJsonFile } from "@/lib/pensionJsonFile";
import { upsertPensionRoundsFromRaw } from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

/**
 * public/PensionLottery.json을 다시 읽어 DB에 upsert.
 * 클라이언트는 이후 GET /api/pension으로 데이터를 받아 통계·분석을 갱신하면 됨.
 */
export async function POST() {
  try {
    const rows = readPensionJsonFile();
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "PensionLottery.json을 읽을 수 없거나 비어 있습니다." },
        { status: 400 }
      );
    }
    const count = await upsertPensionRoundsFromRaw(rows);
    return NextResponse.json({
      success: true,
      count,
      message: `PensionLottery.json ${count}건을 DB에 반영했습니다. 페이지를 새로고침하거나 재분석 후 데이터가 갱신됩니다.`,
    });
  } catch (e) {
    console.error("pension reseed POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "DB 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
