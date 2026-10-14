import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireDb } from "@/lib/server/db";
import { checkPin, validPinFormat } from "@/lib/server/pin";
import { setSessionCookie } from "@/lib/server/session";
import { clientIp, ipLimited, LOCK_MS, recordAttempt, USER_MAX_FAILS } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

const GENERIC = "이름이나 PIN이 달라요.";

/**
 * POST { name, pin }
 * PIN이 없는 이름은 로그인 불가 (관리자가 scripts/set-pin.mjs로 지정). 처음 온 사람이 정하는 방식 없음.
 * 연속 5회 실패 시 10분 잠금, IP당 10분 20회 제한.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const pin = body?.pin;
    if (!name || !validPinFormat(pin)) {
      return NextResponse.json({ error: "이름과 PIN(숫자 6자리)을 입력해 주세요." }, { status: 400 });
    }

    const ip = clientIp(request.headers);
    if (await ipLimited(ip)) {
      return NextResponse.json({ error: "시도가 너무 많아요. 10분 뒤 다시 해 주세요." }, { status: 429 });
    }

    const db = requireDb();
    const { data: user, error } = await db.from("users").select("id").eq("name", name).limit(1).maybeSingle();
    if (error) throw new ApiError(500, "로그인 확인 중 오류가 발생했습니다.");
    if (!user) {
      await recordAttempt(ip, false);
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }
    const userId = String(user.id);

    const { data: row, error: pe } = await db
      .from("user_pins")
      .select("pin_hash, failed_count, locked_until")
      .eq("user_id", userId)
      .maybeSingle();
    if (pe) throw new ApiError(500, "로그인 확인 중 오류가 발생했습니다.");
    if (!row?.pin_hash) {
      await recordAttempt(ip, false, userId);
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      return NextResponse.json({ error: "여러 번 틀려서 잠겼어요. 10분 뒤 다시 해 주세요." }, { status: 423 });
    }

    const ok = await checkPin(pin, row.pin_hash);
    await recordAttempt(ip, ok, userId);
    if (!ok) {
      const fails = (row.failed_count ?? 0) + 1;
      const lock = fails >= USER_MAX_FAILS;
      await db
        .from("user_pins")
        .update({
          failed_count: lock ? 0 : fails,
          locked_until: lock ? new Date(Date.now() + LOCK_MS).toISOString() : row.locked_until,
        })
        .eq("user_id", userId);
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    if ((row.failed_count ?? 0) !== 0 || row.locked_until) {
      await db.from("user_pins").update({ failed_count: 0, locked_until: null }).eq("user_id", userId);
    }

    const res = NextResponse.json({ ok: true });
    await setSessionCookie(res, userId, row.pin_hash);
    return res;
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("login error");
    return NextResponse.json({ error: "로그인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
