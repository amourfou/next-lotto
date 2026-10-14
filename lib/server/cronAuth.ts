import "server-only";
import crypto from "crypto";

/** Vercel Cron이 보내는 `Authorization: Bearer <CRON_SECRET>`만 허용 (쿼리스트링 비밀값은 받지 않음) */
export function hasCronBearer(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return false;
  const got = headers.get("authorization") || "";
  const want = `Bearer ${secret}`;
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}
