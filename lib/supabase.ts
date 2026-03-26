import { createClient } from "@supabase/supabase-js";

// Supabase 설정 (참고: HaanRiver 방식)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url: RequestInfo | URL, init?: RequestInit) =>
      fetch(url, { ...init, cache: "no-store" }),
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
