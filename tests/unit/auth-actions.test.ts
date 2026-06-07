/**
 * Unit tests for the auth server actions in src/actions/auth-actions.ts.
 *
 * Mocks `@/lib/auth` to test the action wrappers in isolation from the
 * network and the Auth.js runtime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const signInMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

// `server-only` is a runtime guard that throws if imported outside a
// server context. Vitest is a Node env, so the guard fires — stub it.
vi.mock("server-only", () => ({}));

// Import after mocks.
const { signInWithGoogle, signOutAction } = await import(
  "@/actions/auth-actions"
);

beforeEach(() => {
  signInMock.mockReset();
  signOutMock.mockReset();
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
