import "server-only";
import { requireDb } from "@/lib/server/db";
import { fetchLottoRound, fetchLottoSecondary, fetchPensionAll, SourceError, type PensionDraw } from "./dhlottery";
import { checkLotto, checkPension, expectedLottoRound, expectedPensionRound } from "./validate";

export type Game = "lotto" | "pension";
export type SyncStatus = "ok" | "pending" | "error";

export interface SyncResult {
  game: Game;
  status: SyncStatus;
  dryRun: boolean;
  expectedRound: number;
  /** 새로 저장한(dry-run이면 저장했을) 회차 */
  saved: number[];
  /** 이미 DB와 같은 값이라 건너뛴 회차 */
  unchanged: number[];
  /** 아직 발표 전인 회차 */
  pending: number[];
  problems: string[];
  notes: string[];
  /** dry-run일 때만: 가져온 값 */
  preview?: unknown[];
  at: string;
}

const WINDOW = 60; // 최근 몇 회차 범위에서 빠진 회차를 찾을지
const MAX_FETCH = 10; // 한 번 실행에 동행복권에 묻는 로또 회차 수 상한
const LATE_MS = 6 * 3_600_000; // 추첨 후 6시간이 지나도 미발표면 실패로 표시
const STATUS_KEY = (g: Game) => `sync_status_${g}`;

// 마지막 예정 추첨 시각(UTC ms)
const LOTTO_FIRST_MS = Date.UTC(2002, 11, 7, 11, 35);
const PENSION_FIRST_MS = Date.UTC(2020, 4, 7, 10, 5);
const drawAt = (first: number, round: number) => first + (round - 1) * 7 * 86_400_000;

function base(game: Game, dryRun: boolean, expectedRound: number): SyncResult {
  return { game, status: "ok", dryRun, expectedRound, saved: [], unchanged: [], pending: [], problems: [], notes: [], at: new Date().toISOString() };
}

async function saveStatus(r: SyncResult) {
  if (r.dryRun) return;
  const { preview: _omit, ...rest } = r;
  void _omit;
  const { error } = await requireDb()
    .from("lotto_meta")
    .upsert({ key: STATUS_KEY(r.game), value: JSON.stringify(rest) }, { onConflict: "key" });
  if (error) console.error("sync status save failed", error.code ?? "");
}

function finish(r: SyncResult, firstMs: number): SyncResult {
  if (r.problems.length > 0) r.status = "error";
  else if (r.pending.length > 0) {
    const late = Date.now() - drawAt(firstMs, Math.min(...r.pending)) > LATE_MS;
    r.status = late ? "error" : "pending";
    if (late) r.problems.push(`${Math.min(...r.pending)}회가 추첨 후 6시간이 지나도 발표되지 않음`);
  }
  console.log(
    `[sync-draws] game=${r.game} status=${r.status} dryRun=${r.dryRun} expected=${r.expectedRound} saved=${r.saved.join(",") || "-"} pending=${r.pending.join(",") || "-"} problems=${r.problems.length} region=${process.env.VERCEL_REGION ?? "local"}`
  );
  for (const p of r.problems) console.error(`[sync-draws] ${r.game} problem: ${p}`);
  return r;
}

// ---------------- 로또 6/45 ----------------
export async function syncLotto(dryRun: boolean): Promise<SyncResult> {
  const db = requireDb();
  const expectedRound = expectedLottoRound();
  const r = base("lotto", dryRun, expectedRound);
  try {
    const from = Math.max(1, expectedRound - WINDOW);
    const [{ data: rows, error }, { data: meta, error: me }] = await Promise.all([
      db.from("lotto_rounds").select("round,n1,n2,n3,n4,n5,n6,bonus").gte("round", from).order("round"),
      db.from("lotto_meta").select("value").eq("key", "last_official_round").maybeSingle(),
    ]);
    if (error || me) throw new Error(`DB 조회 실패 ${error?.code ?? me?.code ?? ""}`);
    const lastOfficial = parseInt(meta?.value ?? "0", 10) || 0;
    const existing = new Map((rows ?? []).map((x) => [x.round as number, x]));

    // 빠진 회차 + 아직 공식 확정 표시가 안 된 회차(last_official_round 이후)
    const targets: number[] = [];
    for (let n = from; n <= expectedRound; n++) if (!existing.has(n) || n > lastOfficial) targets.push(n);
    if (targets.length > MAX_FETCH) r.notes.push(`대상 ${targets.length}개 중 앞쪽 ${MAX_FETCH}개만 처리 (다음 실행에서 이어서)`);

    const toSave: { round: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number; bonus: number }[] = [];
    const preview: unknown[] = [];
    for (const n of targets.slice(0, MAX_FETCH)) {
      const d = await fetchLottoRound(n);
      if (!d) {
        r.pending.push(n);
        break; // 뒤 회차도 아직
      }
      const issues = checkLotto(d, n);
      const sec = await fetchLottoSecondary(n);
      if (!sec) r.notes.push(`${n}회 보조 출처 확인 불가 (공식 값만 사용)`);
      else if (sec.bonus !== d.bonus || sec.numbers.join() !== d.numbers.join()) issues.push(`${n}회 보조 출처와 값이 다름`);
      if (issues.length) {
        r.problems.push(...issues.map((i) => `${n}회: ${i}`));
        break;
      }
      const row = { round: n, n1: d.numbers[0], n2: d.numbers[1], n3: d.numbers[2], n4: d.numbers[3], n5: d.numbers[4], n6: d.numbers[5], bonus: d.bonus };
      preview.push({ ...row, date: d.date, secondary: sec ? "일치" : "확인 불가" });
      const old = existing.get(n);
      if (old) {
        const same = ["n1", "n2", "n3", "n4", "n5", "n6"].map((k) => old[k as keyof typeof old]).sort((a, b) => Number(a) - Number(b)).join() === d.numbers.join() && old.bonus === d.bonus;
        if (!same) {
          r.problems.push(`${n}회: DB에 저장된 값과 공식 값이 다름 (덮어쓰지 않음, 직접 확인 필요)`);
          break;
        }
        r.unchanged.push(n);
      } else {
        toSave.push(row);
      }
    }
    if (dryRun) r.preview = preview;

    const confirmed = [...r.unchanged, ...toSave.map((x) => x.round)];
    if (!dryRun && toSave.length) {
      const { error: ue } = await db.from("lotto_rounds").upsert(toSave, { onConflict: "round" });
      if (ue) throw new Error(`lotto_rounds 저장 실패 ${ue.code ?? ""}`);
    }
    r.saved = toSave.map((x) => x.round);
    // last_official_round는 lastOfficial부터 끊김 없이 확인된 회차까지만 올림
    let top = lastOfficial;
    const ok = new Set(confirmed);
    while (ok.has(top + 1)) top++;
    if (top > lastOfficial) {
      if (!dryRun) {
        const { error: se } = await db.from("lotto_meta").upsert({ key: "last_official_round", value: String(top) }, { onConflict: "key" });
        if (se) throw new Error(`last_official_round 갱신 실패 ${se.code ?? ""}`);
      }
      r.notes.push(`last_official_round ${lastOfficial} → ${top}${dryRun ? " (dry-run, 미반영)" : ""}`);
    }
  } catch (e) {
    r.problems.push(e instanceof SourceError || e instanceof Error ? e.message : "알 수 없는 오류");
  }
  finish(r, LOTTO_FIRST_MS);
  await saveStatus(r);
  return r;
}

// ---------------- 연금복권720+ ----------------
type PensionRow = { order_num: number; jo: number; d1: number; d2: number; d3: number; d4: number; d5: number; d6: number; b1: number; b2: number; b3: number; b4: number; b5: number; b6: number };

const toRow = (d: PensionDraw): PensionRow => ({
  order_num: d.round, jo: d.jo,
  d1: d.digits[0], d2: d.digits[1], d3: d.digits[2], d4: d.digits[3], d5: d.digits[4], d6: d.digits[5],
  b1: d.bonusDigits[0], b2: d.bonusDigits[1], b3: d.bonusDigits[2], b4: d.bonusDigits[3], b5: d.bonusDigits[4], b6: d.bonusDigits[5],
});
const rowKey = (x: PensionRow) => [x.jo, x.d1, x.d2, x.d3, x.d4, x.d5, x.d6, x.b1, x.b2, x.b3, x.b4, x.b5, x.b6].join();

export async function syncPension(dryRun: boolean): Promise<SyncResult> {
  const db = requireDb();
  const expectedRound = expectedPensionRound();
  const r = base("pension", dryRun, expectedRound);
  try {
    const from = Math.max(1, expectedRound - WINDOW);
    const [source, { data: rows, error }] = await Promise.all([
      fetchPensionAll(),
      db.from("pension_lottery_rounds").select("order_num,jo,d1,d2,d3,d4,d5,d6,b1,b2,b3,b4,b5,b6").gte("order_num", from),
    ]);
    if (error) throw new Error(`DB 조회 실패 ${error.code ?? ""}`);
    const existing = new Map((rows ?? []).map((x) => [x.order_num as number, x as PensionRow]));
    const byRound = new Map(source.map((d) => [d.round, d]));

    const toSave: PensionRow[] = [];
    const preview: unknown[] = [];
    for (let n = from; n <= expectedRound; n++) {
      const d = byRound.get(n);
      if (!d) {
        if (!existing.has(n)) r.pending.push(n);
        continue;
      }
      const issues = checkPension(d);
      if (issues.length) {
        r.problems.push(...issues.map((i) => `${n}회: ${i}`));
        continue;
      }
      const row = toRow(d);
      const old = existing.get(n);
      if (old) {
        if (rowKey(old) !== rowKey(row)) {
          // 이미 저장된 과거 회차의 불일치는 덮어쓰지 않고 경고만 남김 (새 회차 저장은 계속)
          const show = (x: PensionRow) => `${x.jo}조 ${[x.d1, x.d2, x.d3, x.d4, x.d5, x.d6].join("")} 보너스 ${[x.b1, x.b2, x.b3, x.b4, x.b5, x.b6].join("")}`;
          r.notes.push(`경고: ${n}회 DB(${show(old)})와 공식(${show(row)}) 값이 다름, 덮어쓰지 않음`);
        }
        else r.unchanged.push(n);
      } else {
        toSave.push(row);
        preview.push({ round: n, jo: d.jo, win: d.digits.join(""), bonus: d.bonusDigits.join(""), date: d.date });
      }
    }
    if (dryRun) r.preview = preview;
    if (!dryRun && toSave.length) {
      const { error: ue } = await db.from("pension_lottery_rounds").upsert(toSave, { onConflict: "order_num" });
      if (ue) throw new Error(`pension_lottery_rounds 저장 실패 ${ue.code ?? ""}`);
    }
    r.saved = toSave.map((x) => x.order_num);
    r.unchanged = r.unchanged.slice(-3); // 응답 간결화
  } catch (e) {
    r.problems.push(e instanceof Error ? e.message : "알 수 없는 오류");
  }
  finish(r, PENSION_FIRST_MS);
  await saveStatus(r);
  return r;
}

export function parseGames(q: string | null): Game[] | null {
  if (q === "lotto") return ["lotto"];
  if (q === "pension") return ["pension"];
  if (q === "all" || q === null) return ["lotto", "pension"];
  return null;
}

export async function runSync(games: Game[], dryRun: boolean): Promise<SyncResult[]> {
  const out: SyncResult[] = [];
  for (const g of games) out.push(g === "lotto" ? await syncLotto(dryRun) : await syncPension(dryRun));
  return out;
}

export async function readStatuses(): Promise<Partial<Record<Game, Omit<SyncResult, "preview">>>> {
  const { data, error } = await requireDb().from("lotto_meta").select("key,value").in("key", [STATUS_KEY("lotto"), STATUS_KEY("pension")]);
  if (error) throw new Error("상태 조회 실패");
  const out: Partial<Record<Game, Omit<SyncResult, "preview">>> = {};
  for (const row of data ?? []) {
    try {
      const v = JSON.parse(row.value as string);
      out[v.game as Game] = v;
    } catch {
      /* ignore */
    }
  }
  return out;
}
