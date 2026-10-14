import { NextResponse } from "next/server";
import { guarded } from "@/lib/server/session";
import { readStatuses } from "@/lib/server/draws/sync";

export const dynamic = "force-dynamic";

/** 마지막 자동 가져오기 결과 (로그인 사용자 누구나, 실패 표시용) */
async function GETHandler() {
  try {
    return NextResponse.json({ statuses: await readStatuses() });
  } catch {
    return NextResponse.json({ statuses: {} });
  }
}

export const GET = guarded("user", GETHandler);
