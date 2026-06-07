// Auth.js v5 route handler — re-exports the GET/POST handlers from src/lib/auth.ts
// Mounted at /api/auth/* (signin, signout, callback, session, csrf, providers, etc.)
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
