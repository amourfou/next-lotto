import { NextRequest, NextResponse } from "next/server";
import { hasCronBearer } from "@/lib/server/cronAuth";
import { parseGames, runSync } from "@/lib/server/draws/sync";

export const dynamic = "force-dynamic";
/** 동행복권이 해외 IP를 막을 수 있어 서울 리전에서 실행 */
export const preferredRegion = "icn1";
export const maxDuration = 60;

/**
 * Vercel Cron 전용: GET /api/cron/sync-draws?game=lotto|pension|all[&dryRun=1]
 * 인증: Authorization: Bearer CRON_SECRET (middleware는 /api/cron/ 을 통과시키고 여기서 검사)
 */
export async function GET(request: NextRequest) {
  if (!hasCronBearer(request.headers)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  const sp = request.nextUrl.searchParams;
  const games = parseGames(sp.get("game"));
  if (!games) return NextResponse.json({ error: "game은 lotto, pension, all 중 하나" }, { status: 400 });
  const dryRun = sp.get("dryRun") === "1";
  const results = await runSync(games, dryRun);
  const failed = results.some((r) => r.status === "error");
  return NextResponse.json({ region: process.env.VERCEL_REGION ?? "local", results }, { status: failed ? 500 : 200 });
}
