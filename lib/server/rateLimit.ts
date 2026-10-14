import "server-only";
import { requireDb } from "./db";

const APP = "next-lotto";
const WINDOW_MS = 10 * 60 * 1000;
export const USER_MAX_FAILS = 5;
export const LOCK_MS = 10 * 60 * 1000;
const IP_MAX = 20;

export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "unknown").trim();
}

/** IP 단위: 10분에 20회 초과면 true (auth_attempts) */
export async function ipLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await requireDb()
    .from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", `ip:${ip}`)
    .gte("created_at", since);
  if (error) {
    console.error("auth_attempts count failed", error.code ?? "");
    return false;
  }
  return (count ?? 0) >= IP_MAX;
}

export async function recordAttempt(ip: string, ok: boolean, userId?: string): Promise<void> {
  const rows = [{ key: `ip:${ip}`, app: APP, ok }];
  if (userId) rows.push({ key: `user:${userId}`, app: APP, ok });
  const { error } = await requireDb().from("auth_attempts").insert(rows);
  if (error) console.error("auth_attempts insert failed", error.code ?? "");
}
