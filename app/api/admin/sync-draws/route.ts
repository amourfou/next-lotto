import { NextRequest, NextResponse } from "next/server";
import { guarded } from "@/lib/server/session";
import { parseGames, runSync } from "@/lib/server/draws/sync";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 60;

/** 관리자 '지금 가져오기': POST /api/admin/sync-draws?game=lotto|pension|all[&dryRun=1] */
async function POSTHandler(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const games = parseGames(sp.get("game"));
  if (!games) return NextResponse.json({ error: "game은 lotto, pension, all 중 하나" }, { status: 400 });
  const results = await runSync(games, sp.get("dryRun") === "1");
  return NextResponse.json({ region: process.env.VERCEL_REGION ?? "local", results });
}

export const POST = guarded("admin", POSTHandler);
