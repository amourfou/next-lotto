import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySession } from "@/lib/sessionToken";

/** 로그인 없이 열리는 경로 */
const PUBLIC_PAGES = ["/login", "/~offline"];
const PUBLIC_APIS = ["/api/auth/login", "/api/auth/logout"];

function isStatic(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname.startsWith("/fallback-")
  );
}

/**
 * 1차 관문: 서명된 세션 쿠키가 있어야 페이지·/api/* 접근 가능.
 * (PIN 변경 반영과 role(관리자) 확인은 각 API 라우트에서 DB로 다시 검사)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isStatic(pathname)) return NextResponse.next();
  if (PUBLIC_APIS.includes(pathname)) return NextResponse.next();
  // 크론 라우트는 세션 대신 Authorization: Bearer CRON_SECRET 을 라우트에서 검사
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();

  const isLoggedIn = (await verifySession(request.cookies.get(AUTH_COOKIE_NAME)?.value)) !== null;

  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return isLoggedIn ? NextResponse.redirect(new URL("/lotto", request.url)) : NextResponse.next();
  }
  if (PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|js|css|map|json|txt)$).*)"],
};
