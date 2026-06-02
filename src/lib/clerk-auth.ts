// Clerk Auth Helper Functions - Stub implementation
// Replace with actual Clerk auth implementation when Clerk is set up

export async function getClerkAuth() {
  return { userId: null, sessionId: null };
}

export async function requireAuth() {
  throw new Error("Unauthorized");
}

export function getUserId(): string | null {
  return null;
}

export async function getSession() {
  return { userId: null, sessionId: null };
}