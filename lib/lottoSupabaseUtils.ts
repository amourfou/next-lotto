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
  /** .single()은 0행/다중행에서 예외가 나기 쉬워 limit(1) + 첫 행만 사용 */
  const { data, error } = await supabase
    .from("lotto_rounds")
    .select("round")
    .order("round", { ascending: false })
    .limit(1);

  if (error) throw error;
  const raw = data?.[0]?.round;
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isNaN(n) ? 0 : n;
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

/** 당첨 회차만 조회 (round <= last_official_round). 분석용 */
export async function getWinningRoundsForAnalysis(): Promise<
  { n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[]
> {
  const lastOfficial = await getLastOfficialRound();
  const all: { n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[] = [];
  let offset = 0;
  while (true) {
    let q = supabase
      .from("lotto_rounds")
      .select("n1, n2, n3, n4, n5, n6, bonus")
      .order("round", { ascending: true });
    if (lastOfficial > 0) q = q.lte("round", lastOfficial);
    const { data, error } = await q.range(offset, offset + SUPABASE_DEFAULT_MAX_ROWS - 1);
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

// --- lotto_drawn (다음 회차용 추출 번호, 회차당 여러 게임) ---

/** 해당 회차의 기존 추출 번호 삭제 (같은 회차로 다시 저장할 때 덮어쓰기) */
export async function deleteLottoDrawnByRound(round: number): Promise<void> {
  const { error } = await supabase.from("lotto_drawn").delete().eq("round", round);
  if (error) {
    if (error.code === "42P01") return; // table does not exist
    throw error;
  }
}

export async function insertLottoDrawnBatch(round: number, games: number[][]): Promise<void> {
  if (games.length === 0) return;
  const rows = games.map((nums, gameIndex) => ({
    round,
    game_index: gameIndex,
    n1: nums[0],
    n2: nums[1],
    n3: nums[2],
    n4: nums[3],
    n5: nums[4],
    n6: nums[5],
  }));
  const { error } = await supabase.from("lotto_drawn").insert(rows);
  if (error) throw error;
}

/** lotto_drawn 테이블에 저장된 모든 추출 번호 세트 (6개 번호 배열 목록) */
export async function getAllLottoDrawnSets(): Promise<number[][]> {
  const sets: number[][] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("lotto_drawn")
      .select("n1, n2, n3, n4, n5, n6")
      .order("round", { ascending: true })
      .order("game_index", { ascending: true })
      .range(offset, offset + SUPABASE_DEFAULT_MAX_ROWS - 1);
    if (error) {
      if (error.code === "42P01") return []; // table does not exist
      throw error;
    }
    const chunk = data ?? [];
    for (const r of chunk) {
      sets.push([r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].sort((a, b) => a - b));
    }
    if (chunk.length < SUPABASE_DEFAULT_MAX_ROWS) break;
    offset += SUPABASE_DEFAULT_MAX_ROWS;
  }
  return sets;
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

// --- lotto_meta (당첨/과거추출 구분) ---

export async function getLottoMeta(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("lotto_meta")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function setLottoMeta(key: string, value: string): Promise<void> {
  const { error } = await supabase.from("lotto_meta").upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}

export async function getLastOfficialRound(): Promise<number> {
  const v = await getLottoMeta("last_official_round");
  if (v == null || v === "") return 0;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** 당첨 내역·추출 내역의 6개 번호 세트 목록 → 뽑은 세트가 이 목록에 있으면 재추출 */
export async function getExclusionSets(): Promise<{
  winningSets: number[][];
  drawnSets: number[][];
}> {
  const lastOfficial = await getLastOfficialRound();
  const maxRound = await getMaxLottoRound();
  const winningSets: number[][] = [];
  const drawnSets: number[][] = [];

  if (maxRound < 1) {
    const fromDrawn = await getAllLottoDrawnSets().catch(() => []);
    return { winningSets, drawnSets: fromDrawn };
  }

  const officialCap = lastOfficial > 0 ? lastOfficial : maxRound;
  let offset = 0;
  while (true) {
    const { data: winningRows, error: e1 } = await supabase
      .from("lotto_rounds")
      .select("n1, n2, n3, n4, n5, n6")
      .lte("round", officialCap)
      .order("round", { ascending: true })
      .range(offset, offset + SUPABASE_DEFAULT_MAX_ROWS - 1);
    if (e1) break;
    const chunk = winningRows ?? [];
    for (const r of chunk) {
      winningSets.push([r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].sort((a, b) => a - b));
    }
    if (chunk.length < SUPABASE_DEFAULT_MAX_ROWS) break;
    offset += SUPABASE_DEFAULT_MAX_ROWS;
  }

  // 추출 번호: 기존 lotto_rounds(round > lastOfficial) + lotto_drawn 전부
  if (lastOfficial > 0) {
    offset = 0;
    while (true) {
      const { data: drawnRows, error: e2 } = await supabase
        .from("lotto_rounds")
        .select("n1, n2, n3, n4, n5, n6")
        .gt("round", lastOfficial)
        .order("round", { ascending: true })
        .range(offset, offset + SUPABASE_DEFAULT_MAX_ROWS - 1);
      if (e2) break;
      const chunk = drawnRows ?? [];
      for (const r of chunk) {
        drawnSets.push([r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].sort((a, b) => a - b));
      }
      if (chunk.length < SUPABASE_DEFAULT_MAX_ROWS) break;
      offset += SUPABASE_DEFAULT_MAX_ROWS;
    }
  }
  const fromLottoDrawn = await getAllLottoDrawnSets().catch(() => []);
  for (const s of fromLottoDrawn) drawnSets.push(s);

  return { winningSets, drawnSets };
}
