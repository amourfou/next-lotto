import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** 세션 쿠키 삭제 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
