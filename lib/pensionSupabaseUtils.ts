import { supabase } from "./supabase";

/** PostgREST/Supabase 한 번에 가져오는 최대 행 (설정이 1000 미만이어도 누락 없이 전부 조회) */
const PENSION_PAGE_SIZE = 1000;

/** DB 행 → 연금복권 원시 배열 [회차, 조, d1..d6, b1..b6] (14개) */
export function rowToRawRow(row: {
  order_num: number;
  jo: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  d6: number;
  b1: number;
  b2: number;
  b3: number;
  b4: number;
  b5: number;
  b6: number;
}): number[] {
  return [
    row.order_num,
    row.jo,
    row.d1, row.d2, row.d3, row.d4, row.d5, row.d6,
    row.b1, row.b2, row.b3, row.b4, row.b5, row.b6,
  ];
}

/** 연금복권 전체 조회 (최신 회차 우선), PensionLottery.json과 동일한 number[][] 형태. 페이지 반복으로 행 제한 누락 방지 */
export async function getAllPensionRoundsRaw(): Promise<number[][]> {
  const all: number[][] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("pension_lottery_rounds")
      .select("order_num, jo, d1, d2, d3, d4, d5, d6, b1, b2, b3, b4, b5, b6")
      .order("order_num", { ascending: false })
      .range(offset, offset + PENSION_PAGE_SIZE - 1);

    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      all.push(rowToRawRow(row));
    }
    if (chunk.length < PENSION_PAGE_SIZE) break;
    offset += PENSION_PAGE_SIZE;
  }
  return all;
}

export async function getPensionRoundsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("pension_lottery_rounds")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** DB에 저장된 최대 회차(order_num). 비어 있으면 0 */
export async function getMaxPensionOrderNum(): Promise<number> {
  const { data, error } = await supabase
    .from("pension_lottery_rounds")
    .select("order_num")
    .order("order_num", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.order_num ?? 0;
}

/** 해당 회차 존재 여부 */
export async function pensionOrderExists(orderNum: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("pension_lottery_rounds")
    .select("order_num")
    .eq("order_num", orderNum)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data != null;
}

/** 연금복권 회차 1건 저장. newData: [회차, 조, d1..d6, b1..b6] (14개) */
export async function insertPensionRound(newData: number[]): Promise<void> {
  if (newData.length !== 14) throw new Error("데이터는 14개의 숫자 배열이어야 합니다.");
  const [order_num, jo, d1, d2, d3, d4, d5, d6, b1, b2, b3, b4, b5, b6] = newData;

  const { error } = await supabase.from("pension_lottery_rounds").insert([
    {
      order_num,
      jo,
      d1, d2, d3, d4, d5, d6,
      b1, b2, b3, b4, b5, b6,
    },
  ]);

  if (error) throw error;
}

/** raw 행 배열을 DB 행 배열로 변환 (문자열 숫자도 Number로 보정) */
function rawRowsToDbRows(rows: unknown[]): { order_num: number; jo: number; d1: number; d2: number; d3: number; d4: number; d5: number; d6: number; b1: number; b2: number; b3: number; b4: number; b5: number; b6: number }[] {
  return rows
    .filter((row): row is number[] => Array.isArray(row) && row.length === 14)
    .map((row) => {
      const nums = row.map((n) => (typeof n === "number" ? n : Number(n)));
      const [order_num, jo, d1, d2, d3, d4, d5, d6, b1, b2, b3, b4, b5, b6] = nums;
      return {
        order_num: Number(order_num),
        jo: Number(jo),
        d1: Number(d1), d2: Number(d2), d3: Number(d3), d4: Number(d4), d5: Number(d5), d6: Number(d6),
        b1: Number(b1), b2: Number(b2), b3: Number(b3), b4: Number(b4), b5: Number(b5), b6: Number(b6),
      };
    })
    .filter((r) => !Number.isNaN(r.order_num));
}

/** 연금복권 여러 회차 한 번에 저장 (PensionLottery.json 형식의 number[][]). 중복 시 upsert */
export async function upsertPensionRoundsFromRaw(rows: unknown[]): Promise<number> {
  const dbRows = rawRowsToDbRows(rows);
  if (dbRows.length === 0) return 0;
  const CHUNK = 100;
  for (let i = 0; i < dbRows.length; i += CHUNK) {
    const chunk = dbRows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("pension_lottery_rounds")
      .upsert(chunk, { onConflict: "order_num" });
    if (error) throw error;
  }
  return dbRows.length;
}
