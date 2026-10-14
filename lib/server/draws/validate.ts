/** 추첨 일정 계산과 값 검사 (순수 함수) */

const DAY = 86_400_000;
// 로또 1회: 2002-12-07(토) 20:35 KST, 연금복권720+ 1회: 2020-05-07(목) 19:05 KST
const LOTTO_FIRST_MS = Date.UTC(2002, 11, 7, 11, 35);
const PENSION_FIRST_MS = Date.UTC(2020, 4, 7, 10, 5);

function expected(firstMs: number, now: number): number {
  return Math.max(0, Math.floor((now - firstMs) / (7 * DAY)) + 1);
}

/** 지금 시각 기준 이미 추첨이 끝났어야 하는 최신 회차 */
export const expectedLottoRound = (now = Date.now()) => expected(LOTTO_FIRST_MS, now);
export const expectedPensionRound = (now = Date.now()) => expected(PENSION_FIRST_MS, now);

/** 회차의 예정 추첨일 (YYYYMMDD, KST) */
function drawDate(firstMs: number, round: number): string {
  const d = new Date(firstMs + (round - 1) * 7 * DAY + 9 * 3_600_000);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
export const lottoDrawDate = (round: number) => drawDate(LOTTO_FIRST_MS, round);
export const pensionDrawDate = (round: number) => drawDate(PENSION_FIRST_MS, round);

function weekdayKst(yyyymmdd: string): number | null {
  if (!/^\d{8}$/.test(yyyymmdd)) return null;
  const t = Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8));
  return Number.isNaN(t) ? null : new Date(t).getUTCDay();
}

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** 문제 목록을 돌려줌 (빈 배열이면 통과) */
export function checkLotto(d: { round: number; numbers: number[]; bonus: number; date: string }, wantRound: number): string[] {
  const p: string[] = [];
  if (d.round !== wantRound) p.push(`회차 불일치 (요청 ${wantRound}, 응답 ${d.round})`);
  if (d.numbers.length !== 6 || !d.numbers.every((n) => isInt(n) && n >= 1 && n <= 45)) p.push("당첨번호는 1~45 정수 6개여야 함");
  if (new Set(d.numbers).size !== 6) p.push("당첨번호 중복");
  if (!isInt(d.bonus) || d.bonus < 1 || d.bonus > 45) p.push("보너스는 1~45");
  else if (d.numbers.includes(d.bonus)) p.push("보너스가 당첨번호와 겹침");
  const wd = weekdayKst(d.date);
  if (wd === null) p.push(`추첨일 형식 오류 (${d.date})`);
  else {
    if (wd !== 6) p.push(`추첨일이 토요일이 아님 (${d.date})`);
    if (d.date !== lottoDrawDate(wantRound)) p.push(`추첨일이 예정일(${lottoDrawDate(wantRound)})과 다름 (${d.date})`);
  }
  return p;
}

export function checkPension(
  d: { round: number; jo: number; digits: number[]; bonusDigits: number[]; date: string }
): string[] {
  const p: string[] = [];
  if (!isInt(d.round) || d.round < 1) p.push("회차 오류");
  if (!isInt(d.jo) || d.jo < 1 || d.jo > 5) p.push("조는 1~5");
  const six = (a: number[]) => a.length === 6 && a.every((n) => isInt(n) && n >= 0 && n <= 9);
  if (!six(d.digits)) p.push("1등 번호는 6자리 숫자");
  if (!six(d.bonusDigits)) p.push("보너스 번호는 6자리 숫자");
  const wd = weekdayKst(d.date);
  if (wd === null) p.push(`추첨일 형식 오류 (${d.date})`);
  else {
    if (wd !== 4) p.push(`추첨일이 목요일이 아님 (${d.date})`);
    if (d.date !== pensionDrawDate(d.round)) p.push(`추첨일이 예정일(${pensionDrawDate(d.round)})과 다름 (${d.date})`);
  }
  return p;
}
