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
} as const;

/** DB가 비어 있으면 public/PensionLottery.json을 읽어 DB에 저장. 시드한 경우 방금 넣은 데이터 반환 */
async function seedPensionFromFileIfEmpty(): Promise<number[][] | null> {
  let count: number;
  try {
    count = await getPensionRoundsCount();
  } catch (e) {
    console.warn("[pension] DB 조회 실패(테이블 없음 등), 파일에서 로드 시도:", e);
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

/** 연금복권 데이터 조회. PensionLottery.json과 동일한 형태(number[][])로 반환 */
export async function GET() {
  try {
    const seededData = await seedPensionFromFileIfEmpty();
    if (seededData && seededData.length > 0) {
      return NextResponse.json(seededData, { headers: NO_CACHE_HEADERS });
    }
    const data = await getAllPensionRoundsRaw();
    return NextResponse.json(data, { headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error("pension GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "연금복권 데이터 조회 중 오류가 발생했습니다." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
