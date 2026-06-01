/**
 * Safe service-headers for Vercel Edge Runtime.
 *
 * Supabase REST accepts `apikey` as a standalone auth header — no
 * Authorization: Bearer needed. This avoids all JWT header validation
 * issues on Vercel Edge Runtime where +, /, = cause "Headers.append:
 * ...is an invalid header value".
 *
 * The apikey header alone is sufficient for service-role access to
 * the Supabase REST API.
 */
export function svcHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
  };
}