import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions, signSession, verifySession } from "@/lib/sessionToken";
import { ApiError, requireDb } from "./db";
import { pinFingerprint } from "./pin";

export interface SessionUser {
  id: string;
  name: string;
  organization: string | null;
  role: string | null;
}

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function isAdmin(user: SessionUser | null): boolean {
  return !!user?.role && ADMIN_ROLES.has(user.role);
}

export async function setSessionCookie(res: NextResponse, userId: string, pinHash: string): Promise<void> {
  const token = await signSession(userId, pinFingerprint(pinHash));
  if (!token) throw new ApiError(503, "서버에 세션 키(SESSION_SECRET)가 없어 로그인할 수 없습니다.");
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(0), maxAge: 0 });
}

/** 서명 검증 + 현재 PIN 지문 일치 확인 + users에서 role을 매 요청 다시 읽음 */
export async function currentUser(): Promise<SessionUser | null> {
  const token = await verifySession(cookies().get(AUTH_COOKIE_NAME)?.value);
  if (!token) return null;
  const db = requireDb();
  const [{ data: pin, error: e1 }, { data: user, error: e2 }] = await Promise.all([
    db.from("user_pins").select("pin_hash").eq("user_id", token.uid).maybeSingle(),
    db.from("users").select("id, name, organization, role").eq("id", token.uid).maybeSingle(),
  ]);
  if (e1 || e2) {
    console.error("session lookup failed", e1?.code ?? "", e2?.code ?? "");
    throw new ApiError(500, "세션 확인 중 오류가 발생했습니다.");
  }
  if (!pin?.pin_hash || !user || pinFingerprint(pin.pin_hash) !== token.pv) return null;
  return {
    id: String(user.id),
    name: user.name,
    organization: user.organization ?? null,
    role: user.role ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new ApiError(401, "다시 로그인해 주세요.");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!isAdmin(u)) throw new ApiError(403, "관리자만 사용할 수 있습니다.");
  return u;
}

/** 라우트 핸들러 래퍼: 인증 실패/ApiError를 JSON 응답으로 변환 */
export function guarded<A extends unknown[]>(
  level: "user" | "admin",
  handler: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      if (level === "admin") await requireAdmin();
      else await requireUser();
      return await handler(...args);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      throw e;
    }
  };
}
