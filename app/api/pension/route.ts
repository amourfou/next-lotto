import { NextResponse } from "next/server";
import { readPensionJsonFile } from "@/lib/pensionJsonFile";
import {
  getAllPensionRoundsRaw,
  getPensionRoundsCount,
  upsertPensionRoundsFromRaw,
} from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  /** Vercel Edge가 API 응답을 캐시하지 않도록 */
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
} as const;

/** 디버깅: Network 탭에서 서버가 조회한 행 수·최소·최대 회차 확인 (본문 JSON과 일치해야 함) */
function pensionStatsHeader(rows: number[][]): Record<string, string> {
  if (!rows.length) return { "X-Pension-Stats": "count=0" };
  const orders = rows.map((r) => Number(r[0])).filter((n) => !Number.isNaN(n));
  if (!orders.length) return { "X-Pension-Stats": `count=${rows.length};min=?;max=?` };
  const min = Math.min(...orders);
  const max = Math.max(...orders);
  return { "X-Pension-Stats": `count=${rows.length};min=${min};max=${max}` };
}

/**
 * DB가 비어 있으면 public/PensionLottery.json을 읽어 DB에 저장. 시드한 경우 방금 넣은 데이터 반환.
 * 주의: getPensionRoundsCount()만 실패하면 예전에는 곧바로 JSON 파일을 반환해,
 * DB에는 306만 있는데 배포된 파일에 307이 남아 있으면 X-Pension-Stats가 307로 나오는 불일치가 났음.
 * → count 실패 시에도 먼저 getAllPensionRoundsRaw()로 DB를 읽고, 행이 있으면 파일로 폴백하지 않음.
 */
async function seedPensionFromFileIfEmpty(): Promise<number[][] | null> {
  let count: number;
  try {
    count = await getPensionRoundsCount();
  } catch (e) {
    console.warn("[pension] getPensionRoundsCount 실패 — DB 전체 조회로 재시도:", e);
    try {
      const fromDb = await getAllPensionRoundsRaw();
      if (fromDb.length > 0) {
        return null;
      }
    } catch (e2) {
      console.warn("[pension] DB 전체 조회도 실패, 파일 폴백:", e2);
    }
    return readPensionJsonFile();
  }

  if (count > 0) return null;

  const rows = readPensionJsonFile();
  if (!rows || rows.length === 0) return null;

  try {
    const inserted = await upsertPensionRoundsFromRaw(rows);
    console.log(`[pension] DB 비어 있어 PensionLottery.json에서 ${inserted}회차 시드 완료`);
    return rows;
  } catch (e) {
    console.warn("[pension] DB 시드 실패, 파일 데이터로 응답:", e);
    return rows;
  }
}

/**
 * 조회(GET) 시에는 DB만 반환합니다. public/PensionLottery.json → DB 동기화는 하지 않습니다.
 * (이전에는 GET마다 파일이 DB보다 “최신”이면 upsert해서, DB에서 삭제한 회차가
 *  새로고침 때 JSON에 남아 있으면 다시 들어가는 문제가 있었습니다.)
 * JSON을 DB에 맞추려면 연금복권 화면의 「재분석」또는 POST /api/pension/reseed 를 사용하세요.
 */

/** 연금복권 데이터 조회. PensionLottery.json과 동일한 형태(number[][])로 반환 */
export async function GET() {
  try {
    const seededData = await seedPensionFromFileIfEmpty();
    if (seededData && seededData.length > 0) {
      return NextResponse.json(seededData, {
        headers: {
          ...NO_CACHE_HEADERS,
          ...pensionStatsHeader(seededData),
          "X-Pension-Source": "file-or-empty-db-seed",
        },
      });
    }
    const data = await getAllPensionRoundsRaw();
    return NextResponse.json(data, {
      headers: {
        ...NO_CACHE_HEADERS,
        ...pensionStatsHeader(data),
        "X-Pension-Source": "database",
      },
    });
  } catch (e) {
    console.error("pension GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "연금복권 데이터 조회 중 오류가 발생했습니다." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
