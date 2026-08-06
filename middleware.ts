import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, parseSession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/~offline"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // API·정적 리소스는 미들웨어에서 페이지 보호만 담당 (API 자체는 기존 동작 유지)
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-") ||
    pathname.startsWith("/fallback-")
  ) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isLoggedIn = session !== null;

  // 로그인 페이지: 이미 로그인되어 있으면 메인으로
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/lotto", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 보호된 페이지: 미로그인 시 로그인으로
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 정적 파일·이미지 제외. 페이지 라우트와 필요한 경로만 검사.
     */
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|js|css|map|json|txt)$).*)",
  ],
};
