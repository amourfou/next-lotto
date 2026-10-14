import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null | undefined;

/** Service-role client. 서버(API 라우트)에서만 사용. */
export function adminDb(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  admin = url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
        },
      })
    : null;
  return admin;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function requireDb(): SupabaseClient {
  const db = adminDb();
  if (!db) throw new ApiError(503, "서버에 저장소 키(SUPABASE_SERVICE_ROLE_KEY)가 없어 연결하지 못했습니다.");
  return db;
}
