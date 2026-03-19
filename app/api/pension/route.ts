import { NextResponse } from "next/server";
import { readPensionJsonFile } from "@/lib/pensionJsonFile";
import {
  getAllPensionRoundsRaw,
  getMaxPensionOrderNum,
  getPensionRoundsCount,
  upsertPensionRoundsFromRaw,
} from "@/lib/pensionSupabaseUtils";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  /** Vercel Edge가 API 응답을 캐시하지 않도록 */
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
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

/**
 * 배포된 public/PensionLottery.json이 DB보다 최신이면 upsert.
 * (Vercel 등: Git에 올린 JSON은 빌드에 포함되지만, GET은 기본적으로 DB만 보고 있어서
 *  새 회차가 반영되지 않던 문제를 막음.)
 */
async function syncPensionFileToDbIfNewer(): Promise<void> {
  const rows = readPensionJsonFile();
  if (!rows || rows.length === 0) return;
  let dbMax = 0;
  let dbCount = 0;
  try {
    dbMax = await getMaxPensionOrderNum();
    dbCount = await getPensionRoundsCount();
  } catch {
    return;
  }
  const fileMax = Math.max(...rows.map((r) => Number(Array.isArray(r) ? r[0] : 0) || 0));
  const fileCount = rows.length;
  if (fileMax > dbMax || fileCount > dbCount) {
    await upsertPensionRoundsFromRaw(rows);
    console.log(
      `[pension] PensionLottery.json 동기화: fileMax=${fileMax} dbMax=${dbMax}, fileCount=${fileCount} dbCount=${dbCount} → upsert ${fileCount}건`
    );
  }
}

/** 연금복권 데이터 조회. PensionLottery.json과 동일한 형태(number[][])로 반환 */
export async function GET() {
  try {
    const seededData = await seedPensionFromFileIfEmpty();
    if (seededData && seededData.length > 0) {
      return NextResponse.json(seededData, { headers: NO_CACHE_HEADERS });
    }
    await syncPensionFileToDbIfNewer();
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
