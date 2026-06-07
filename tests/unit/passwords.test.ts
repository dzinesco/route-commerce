/**
 * Tests for the password helper. Exercises:
 *   - hash round-trip (verify(hashed) returns true for the same plaintext)
 *   - wrong password returns false
 *   - tampered/malformed stored values return false (no exception)
 *   - distinct passwords produce distinct hashes (salting works)
 *   - format is `scrypt$N$salt$hash` and self-describing
 */
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/passwords";

// `src/lib/passwords.ts` uses `import "server-only"`. Stub it so the test
// runner can import the module.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("hashPassword / verifyPassword", () => {
  it("round-trips: verify(hash(p)) is true for the same plaintext", () => {
    const h = hashPassword("admin");
    expect(verifyPassword("admin", h)).toBe(true);
  });

  it("returns false for the wrong password", () => {
    const h = hashPassword("admin");
    expect(verifyPassword("wrong", h)).toBe(false);
  });

  it("returns false for an empty password (without throwing)", () => {
    const h = hashPassword("admin");
    expect(verifyPassword("", h)).toBe(false);
  });

  it("returns false for a tampered stored value (no exception)", () => {
    expect(verifyPassword("admin", "not-a-real-hash")).toBe(false);
    expect(verifyPassword("admin", "scrypt$999$abc$def")).toBe(false);
    expect(verifyPassword("admin", "")).toBe(false);
  });

  it("uses a random salt — same password produces different hashes", () => {
    const a = hashPassword("admin");
    const b = hashPassword("admin");
    expect(a).not.toBe(b);
    expect(verifyPassword("admin", a)).toBe(true);
    expect(verifyPassword("admin", b)).toBe(true);
  });

  it("hashes in the self-describing `scrypt$N$salt$hash` format", () => {
    const h = hashPassword("admin");
    const parts = h.split("$");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("scrypt");
    expect(Number.parseInt(parts[1], 10)).toBeGreaterThan(0);
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
    expect(parts[3]).toMatch(/^[0-9a-f]+$/);
    expect(parts[3].length).toBe(128); // 64 bytes hex = 128 chars
  });

  it("handles long passwords", () => {
    const long = "x".repeat(1024);
    const h = hashPassword(long);
    expect(verifyPassword(long, h)).toBe(true);
    expect(verifyPassword(long + "x", h)).toBe(false);
  });

  it("handles unicode passwords", () => {
    const h = hashPassword("пароль密碼🔐");
    expect(verifyPassword("пароль密碼🔐", h)).toBe(true);
    expect(verifyPassword("пароль密碼", h)).toBe(false);
  });

  it("throws on empty input to hashPassword (caller bug, fail fast)", () => {
    expect(() => hashPassword("")).toThrow();
  });
});
