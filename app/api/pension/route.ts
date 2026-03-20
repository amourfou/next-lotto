import { NextResponse } from "next/server";
import { getAllPensionRoundsRaw } from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
} as const;

function pensionStatsHeader(rows: number[][]): Record<string, string> {
  if (!rows.length) return { "X-Pension-Stats": "count=0" };
  const orders = rows.map((r) => Number(r[0])).filter((n) => !Number.isNaN(n));
  if (!orders.length) return { "X-Pension-Stats": `count=${rows.length};min=?;max=?` };
  const min = Math.min(...orders);
  const max = Math.max(...orders);
  return { "X-Pension-Stats": `count=${rows.length};min=${min};max=${max}` };
}

/**
 * 연금복권 당첨 데이터 — Supabase `pension_lottery_rounds`만 사용.
 * public/PensionLottery.json 등 로컬 파일은 읽지 않습니다.
 */
export async function GET() {
  try {
    const data = await getAllPensionRoundsRaw();
    return NextResponse.json(data, {
      headers: {
        ...NO_CACHE_HEADERS,
        ...pensionStatsHeader(data),
        "X-Pension-Source": "database-only",
      },
    });
  } catch (e) {
    console.error("pension GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "연금복권 데이터 조회 중 오류가 발생했습니다." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
