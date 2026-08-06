import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 현재 로그인 세션 조회 */
export async function GET() {
  const cookieStore = cookies();
  const user = parseSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
