import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password hashing + verification.
 *
 * Format: `scrypt$N$salt$hash` (hex-encoded).
 *
 *   - scrypt:   algorithm identifier (future-proof — easy to migrate to
 *               argon2id by adding a new branch in `verifyPassword`)
 *   - N:        scrypt cost parameter (CPU/memory). 2^14 (16384) is a
 *               reasonable default for an interactive login on modern
 *               hardware (~50ms per hash on a typical server)
 *   - salt:     16 random bytes, hex-encoded
 *   - hash:     64-byte derived key, hex-encoded
 *
 * Why scrypt and not bcrypt / argon2?
 *   - No extra dependency. Node's `crypto` module has it built in.
 *   - Argon2id is the modern recommendation but requires a native module
 *     (`argon2` or `@node-rs/argon2`) which complicates the install.
 *     When we add a native build step, we should switch to argon2id.
 *   - bcrypt is fine but not better than scrypt for our use case, and
 *     also requires a native module.
 *
 * All comparisons are constant-time (`timingSafeEqual`) to defeat
 * timing-based side-channel attacks.
 */

const KEY_LEN = 64;
const SALT_LEN = 16;
const DEFAULT_N = 16384; // 2^14
const ALGO = "scrypt";

export function hashPassword(plain: string): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LEN, { N: DEFAULT_N }).toString("hex");
  return `${ALGO}$${DEFAULT_N}$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== ALGO) return false;
  const n = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(n) || n < 1024 || n > 1_000_000) return false;
  const salt = parts[2];
  const expectedHex = parts[3];
  if (!salt || !expectedHex) return false;

  let actual: Buffer;
  let expected: Buffer;
  try {
    actual = scryptSync(plain, salt, KEY_LEN, { N: n });
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
