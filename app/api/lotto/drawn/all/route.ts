import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAllLottoDrawnGrouped } from "@/lib/lottoSupabaseUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const data = await getAllLottoDrawnGrouped();
    return NextResponse.json({ data });
  } catch (e) {
    console.error("lotto drawn/all GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
