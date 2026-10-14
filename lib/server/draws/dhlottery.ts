import "server-only";

/** 동행복권 홈페이지 내부 JSON (공식 공개 API 아님, 2026-01 개편 이후 주소) */
const BASE = "https://www.dhlottery.co.kr";
const TIMEOUT_MS = 10_000;

export interface LottoDraw {
  round: number;
  numbers: number[]; // 6개 오름차순
  bonus: number;
  date: string; // YYYYMMDD
}

export interface PensionDraw {
  round: number;
  jo: number;
  digits: number[]; // 6자리
  bonusDigits: number[]; // 6자리
  date: string; // YYYYMMDD
}

export class SourceError extends Error {}

async function getJson(path: string, referer: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE}${referer}`,
      },
    });
  } catch (e) {
    throw new SourceError(`동행복권 연결 실패: ${e instanceof Error ? e.name : "unknown"}`);
  }
  if (res.status !== 200) throw new SourceError(`동행복권 응답 ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) throw new SourceError(`동행복권 응답 형식이 JSON이 아님 (${ct.split(";")[0] || "없음"})`);
  try {
    return await res.json();
  } catch {
    throw new SourceError("동행복권 JSON 해석 실패");
  }
}

/** 로또 회차 1개. 아직 발표 전이면 null */
export async function fetchLottoRound(round: number): Promise<LottoDraw | null> {
  const j = (await getJson(`/lt645/selectPstLt645Info.do?srchLtEpsd=${round}`, "/lt645/result")) as {
    data?: { list?: Record<string, unknown>[] };
  };
  const list = j?.data?.list;
  if (!Array.isArray(list)) throw new SourceError("로또 응답 구조가 예상과 다름 (data.list 없음)");
  if (list.length === 0) return null;
  const r = list[0];
  const nums = [r.tm1WnNo, r.tm2WnNo, r.tm3WnNo, r.tm4WnNo, r.tm5WnNo, r.tm6WnNo].map(Number);
  return {
    round: Number(r.ltEpsd),
    numbers: nums.slice().sort((a, b) => a - b),
    bonus: Number(r.bnsWnNo),
    date: String(r.ltRflYmd ?? ""),
  };
}

/** 연금복권 전체 회차 목록 (1회~최신) */
export async function fetchPensionAll(): Promise<PensionDraw[]> {
  const j = (await getJson("/pt720/selectPstPt720WnList.do", "/pt720/result")) as {
    data?: { result?: Record<string, unknown>[] };
  };
  const list = j?.data?.result;
  if (!Array.isArray(list)) throw new SourceError("연금복권 응답 구조가 예상과 다름 (data.result 없음)");
  return list.map((r) => {
    const win = String(r.wnRnkVl ?? "");
    const bns = String(r.bnsRnkVl ?? "");
    return {
      round: Number(r.psltEpsd),
      jo: Number(r.wnBndNo),
      digits: /^\d{6}$/.test(win) ? win.split("").map(Number) : [],
      bonusDigits: /^\d{6}$/.test(bns) ? bns.split("").map(Number) : [],
      date: String(r.psltRflYmd ?? ""),
    };
  });
}

/** 교차 검증용 보조 출처 (개인 운영 GitHub Pages 미러). 없거나 실패하면 null */
export async function fetchLottoSecondary(round: number): Promise<{ numbers: number[]; bonus: number } | null> {
  try {
    const res = await fetch(`https://smok95.github.io/lotto/results/${round}.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { draw_no?: number; numbers?: number[]; bonus_no?: number };
    if (j.draw_no !== round || !Array.isArray(j.numbers)) return null;
    return { numbers: j.numbers.map(Number).sort((a, b) => a - b), bonus: Number(j.bonus_no) };
  } catch {
    return null;
  }
}
