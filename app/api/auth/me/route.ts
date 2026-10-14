import { NextResponse } from "next/server";
import { ApiError } from "@/lib/server/db";
import { currentUser, isAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** 현재 로그인 사용자 (role은 DB에서 매번 조회) */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: { id: user.id, name: user.name, organization: user.organization, isAdmin: isAdmin(user) },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return NextResponse.json({ user: null }, { status });
  }
}
