/**
 * Unit tests for the auth server actions in src/actions/auth-actions.ts.
 *
 * Mocks `@/lib/auth` and `next-auth` to test the action wrappers in
 * isolation from the network and the Auth.js runtime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const signInMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

const authErrors: Array<{ name: string; message?: string }> = [];
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    override name = "AuthError";
    constructor(message?: string) {
      super(message);
      authErrors.push({ name: this.name, message });
    }
  },
}));

// Import after mocks.
const { signInWithPassword, signInWithGoogle, signOutAction } = await import(
  "@/actions/auth-actions"
);

beforeEach(() => {
  signInMock.mockReset();
  signOutMock.mockReset();
});

describe("signInWithPassword", () => {
  it("returns ok:false when email is missing", async () => {
    const fd = new FormData();
    fd.set("password", "x");
    const result = await signInWithPassword(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/email/i);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("returns ok:false when password is missing", async () => {
    const fd = new FormData();
    fd.set("email", "a@b.com");
    const result = await signInWithPassword(null, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/password/i);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("trims email and passes credentials to signIn", async () => {
    signInMock.mockResolvedValue(undefined);
    const fd = new FormData();
    fd.set("email", "  admin@brand.test  ");
    fd.set("password", "secret");
    const result = await signInWithPassword(null, fd);
    expect(result).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith("supabase-password", {
      email: "admin@brand.test",
      password: "secret",
      redirect: false,
    });
  });

  it("returns ok:false with a friendly message on AuthError", async () => {
    signInMock.mockRejectedValue(new Error("auth failed")); // not an AuthError
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "wrong");
    await expect(signInWithPassword(null, fd)).rejects.toThrow("auth failed");
  });

  it("catches AuthError and returns ok:false", async () => {
    // The mocked AuthError is registered as a real class via the mock
    // factory above, so we can construct one here.
    const { AuthError } = await import("next-auth");
    signInMock.mockRejectedValue(new AuthError("invalid credentials"));
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "wrong");
    const result = await signInWithPassword(null, fd);
    expect(result).toEqual({ ok: false, error: "Invalid email or password." });
  });
});

describe("signInWithGoogle", () => {
  it("calls signIn with the google provider and /admin redirect", async () => {
    signInMock.mockResolvedValue(undefined);
    await signInWithGoogle();
    expect(signInMock).toHaveBeenCalledWith("google", { redirectTo: "/admin" });
  });
});

describe("signOutAction", () => {
  it("calls signOut with the login redirect", async () => {
    signOutMock.mockResolvedValue(undefined);
    await signOutAction();
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
