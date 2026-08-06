/** 이름 기반 로그인 세션 (httpOnly 쿠키) */

export const AUTH_COOKIE_NAME = "lotto_session";

/** 세션 유지 기간 (30일) */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  name: string;
  organization?: string | null;
}

export function serializeSession(user: AuthUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

export function parseSession(raw: string | undefined | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<AuthUser>;
    if (
      typeof parsed.id === "string" &&
      parsed.id.length > 0 &&
      typeof parsed.name === "string" &&
      parsed.name.length > 0
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        organization:
          typeof parsed.organization === "string" ? parsed.organization : null,
      };
    }
  } catch {
    // invalid cookie
  }
  return null;
}

export function authCookieOptions(maxAge = AUTH_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
