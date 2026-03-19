import fs from "fs";
import path from "path";

export const PENSION_JSON_PATH = path.join(process.cwd(), "public", "PensionLottery.json");

/** UTF-8 BOM 등 앞쪽 보이지 않는 문자 제거 */
export function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) return content.slice(1);
  return content;
}

/** public/PensionLottery.json 읽어서 파싱 (실패 시 null) */
export function readPensionJsonFile(): number[][] | null {
  if (!fs.existsSync(PENSION_JSON_PATH)) {
    console.warn("[pension] 파일 없음", PENSION_JSON_PATH);
    return null;
  }
  try {
    let content = fs.readFileSync(PENSION_JSON_PATH, "utf-8");
    content = stripBom(content).trim();
    const rows = JSON.parse(content);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn("[pension] 유효한 배열이 아님 또는 비어 있음");
      return null;
    }
    return rows;
  } catch (e) {
    console.warn("[pension] 파일 파싱 실패", e);
    return null;
  }
}
