import "server-only";
import { requireDb } from "@/lib/server/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 DB 클라이언트 (service role). 브라우저 번들에 포함되면 빌드가 실패한다(server-only).
 * 기존 호출부(`supabase.from(...)`) 호환을 위해 지연 생성 프록시로 내보낸다.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const db = requireDb() as unknown as Record<PropertyKey, unknown>;
    const v = db[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(db) : v;
  },
});

export interface SupabaseLottoRound {
  round: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  bonus: number;
  created_at?: string;
}

export interface SupabaseLottoAnalysis {
  id: number;
  data: string;
  created_at: string;
}

export interface SupabaseLottoDrawSettings {
  id: number;
  game_count: number;
  filter_states: string;
  group_counts: string;
  group_enabled: string;
  group_at_most: string;
  pattern_settings: string | null;
  created_at: string;
}
