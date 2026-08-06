import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  serializeSession,
  type AuthUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST { name: string }
 * users 테이블에 동일한 이름이 있으면 세션 쿠키를 설정하고 사용자 정보를 반환합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name =
      typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "이름을 입력해 주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, organization")
      .eq("name", name)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("login users query error:", error);
      return NextResponse.json(
        { error: "로그인 확인 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "등록된 사용자가 아닙니다. 이름을 확인해 주세요." },
        { status: 401 }
      );
    }

    const user: AuthUser = {
      id: String(data.id),
      name: data.name,
      organization: data.organization ?? null,
    };

    const res = NextResponse.json({ user });
    res.cookies.set(AUTH_COOKIE_NAME, serializeSession(user), authCookieOptions());
    return res;
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json(
      { error: "로그인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
