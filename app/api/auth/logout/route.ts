import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 세션 쿠키 삭제 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions(0),
    maxAge: 0,
  });
  return res;
}
