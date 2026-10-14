import "server-only";
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt) as (p: string, s: Buffer, len: number, o: crypto.ScryptOptions) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };

/** scrypt$N$salt$hash (GenShin lib/server/password.ts, scripts/set-pin.mjs와 동일 형식) */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pin, salt, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function checkPin(pin: string, stored: string): Promise<boolean> {
  const [kind, n, salt, hash] = stored.split("$");
  const N = Number(n);
  if (kind !== "scrypt" || !salt || !hash || !Number.isInteger(N) || N < 1024 || N > 1 << 20) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(pin, Buffer.from(salt, "base64url"), expected.length, { ...PARAMS, N, maxmem: 256 * N * 8 * 2 });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** PIN 해시 지문 (세션 pv). PIN 변경 시 기존 세션 무효화 */
export function pinFingerprint(hash: string): string {
  return crypto.createHash("sha256").update(hash).digest("base64url").slice(0, 16);
}

/** 모든 사용자 공통: 숫자 6자리 */
export function validPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}
