import { handlers } from "@/lib/auth";

/**
 * Auth.js v5 catch-all route handler. Exposes:
 *   GET  /api/auth/signin
 *   GET  /api/auth/signout
 *   GET  /api/auth/session
 *   GET  /api/auth/csrf
 *   GET  /api/auth/providers
 *   POST /api/auth/callback/:provider
 *   POST /api/auth/signin/:provider
 *   POST /api/auth/signout
 *
 * The actual OAuth + session logic is in `src/lib/auth.ts`.
 */
export const { GET, POST } = handlers;
