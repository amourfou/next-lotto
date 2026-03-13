import { supabase } from "./supabase";

// --- lotto_rounds ---

export async function getLottoRounds(limit: number, offset: number) {
  const { data, error } = await supabase
    .from("lotto_rounds")
    .select("round, n1, n2, n3, n4, n5, n6, bonus, created_at")
    .order("round", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function getLottoRoundByRound(round: number) {
  const { data, error } = await supabase
    .from("lotto_rounds")
    .select("round, n1, n2, n3, n4, n5, n6, bonus, created_at")
    .eq("round", round)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }
  return data;
}

export async function getLottoRoundsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("lotto_rounds")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getMaxLottoRound(): Promise<number> {
  const { data, error } = await supabase
    .from("lotto_rounds")
    .select("round")
    .order("round", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data?.round ?? 0;
}

const SUPABASE_DEFAULT_MAX_ROWS = 1000;

export async function getAllLottoRoundsForAnalysis(): Promise<
  { n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]
> {
  const all: { n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("lotto_rounds")
      .select("n1, n2, n3, n4, n5, n6, bonus")
      .order("round", { ascending: true })
      .range(offset, offset + SUPABASE_DEFAULT_MAX_ROWS - 1);

    if (error) throw error;
    const chunk = data ?? [];
    all.push(...chunk);
    if (chunk.length < SUPABASE_DEFAULT_MAX_ROWS) break;
    offset += SUPABASE_DEFAULT_MAX_ROWS;
  }

  return all;
}

export async function insertLottoRound(row: {
  round: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  bonus: number;
}) {
  const { error } = await supabase.from("lotto_rounds").insert([row]);
  if (error) throw error;
}

export async function upsertLottoRounds(
  rows: {
    round: number;
    n1: number;
    n2: number;
    n3: number;
    n4: number;
    n5: number;
    n6: number;
    bonus: number;
  }[]
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("lotto_rounds").upsert(rows, {
    onConflict: "round",
  });
  if (error) throw error;
}

// --- lotto_analysis ---

export async function getLottoAnalysisRow() {
  const { data, error } = await supabase
    .from("lotto_analysis")
    .select("data, created_at")
    .eq("id", 1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function upsertLottoAnalysis(data: string) {
  const { error } = await supabase.from("lotto_analysis").upsert(
    { id: 1, data, created_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) throw error;
}

// --- lotto_draw_settings ---

export async function getLatestLottoDrawSettings() {
  const { data, error } = await supabase
    .from("lotto_draw_settings")
    .select("id, game_count, filter_states, group_counts, group_enabled, group_at_most, pattern_settings, created_at")
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function insertLottoDrawSettings(row: {
  game_count: number;
  filter_states: string;
  group_counts: string;
  group_enabled: string;
  group_at_most: string;
  pattern_settings: string;
}) {
  const { data, error } = await supabase
    .from("lotto_draw_settings")
    .insert([row])
    .select("id")
    .single();

  if (error) throw error;
  return data?.id as number;
}
