/**
 * HMAC-SHA256 서명 세션 토큰 (Web Crypto: Edge middleware와 Node 라우트 공용).
 * 비밀값은 SESSION_SECRET 환경변수에만 있고, 토큰에는 role을 넣지 않는다.
 */
export const AUTH_COOKIE_NAME = "lotto_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface SessionToken {
  /** users.id */
  uid: string;
  /** PIN 해시 지문: PIN을 바꾸면 기존 세션 무효 */
  pv: string;
  iat: number;
  exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array<ArrayBuffer> {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cachedKey: { raw: string; key: CryptoKey } | null = null;

async function hmacKey(): Promise<CryptoKey | null> {
  const raw = process.env.SESSION_SECRET || "";
  if (raw.length < 32) return null; // 비밀값이 없거나 너무 짧으면 세션 자체를 거부
  if (cachedKey?.raw === raw) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`next-lotto-session:${raw}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cachedKey = { raw, key };
  return key;
}

export async function signSession(uid: string, pv: string): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const token: SessionToken = { uid, pv, iat: now, exp: now + AUTH_COOKIE_MAX_AGE };
  const body = b64url(enc.encode(JSON.stringify(token)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** 서명·만료만 검사 (DB 확인은 lib/server/session.ts에서) */
export async function verifySession(raw: string | undefined | null): Promise<SessionToken | null> {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const key = await hmacKey();
  if (!key) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const t = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as Partial<SessionToken>;
    if (typeof t.uid !== "string" || !t.uid || typeof t.pv !== "string" || !t.pv) return null;
    if (typeof t.exp !== "number" || typeof t.iat !== "number") return null;
    if (t.exp < Math.floor(Date.now() / 1000)) return null;
    return t as SessionToken;
  } catch {
    return null;
  }
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
