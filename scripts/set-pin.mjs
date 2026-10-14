#!/usr/bin/env node
/**
 * 관리자용: 사용자 PIN 지정/초기화 (user_pins upsert, 잠금 해제).
 *   SUPABASE_URL(또는 NEXT_PUBLIC_SUPABASE_URL)과 SUPABASE_SERVICE_ROLE_KEY 환경변수 필요.
 *   사용: node scripts/set-pin.mjs "<이름>"   → PIN을 화면에 표시하지 않고 두 번 입력받음
 * PIN은 명령줄 인자로 받지 않는다(셸 기록·ps 노출 방지).
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const name = (process.argv[2] || "").trim();
if (!name) {
  console.error('사용법: node scripts/set-pin.mjs "<이름>"');
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

function promptHidden(label) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error("터미널(TTY)에서 실행해 주세요."));
    stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let buf = "";
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(buf);
        }
        if (c === "\u0003") {
          stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
        }
        if (c === "\u007f" || c === "\b") buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on("data", onData);
  });
}

function hashPin(pin) {
  const N = 16384;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

const pin = await promptHidden("새 PIN (숫자 6자리, 화면에 표시 안 됨): ");
if (!/^\d{6}$/.test(pin)) {
  console.error("PIN은 숫자 6자리여야 합니다.");
  process.exit(1);
}
if ((await promptHidden("한 번 더: ")) !== pin) {
  console.error("두 PIN이 다릅니다.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { data: users, error } = await db.from("users").select("id, name").eq("name", name);
if (error) {
  console.error("users 조회 실패:", error.code ?? error.message);
  process.exit(1);
}
if (!users?.length) {
  console.error(`'${name}' 사용자가 없습니다.`);
  process.exit(1);
}
if (users.length > 1) {
  console.error(`'${name}' 이름이 ${users.length}명입니다. 이름을 먼저 정리해 주세요.`);
  process.exit(1);
}
const { error: upErr } = await db.from("user_pins").upsert(
  {
    user_id: users[0].id,
    pin_hash: hashPin(pin),
    failed_count: 0,
    locked_until: null,
    must_change: false,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" }
);
if (upErr) {
  console.error("user_pins 저장 실패:", upErr.code ?? upErr.message);
  process.exit(1);
}
console.log(`'${name}' PIN을 설정했습니다. 이 사용자의 기존 세션은 모두 끊깁니다.`);
