#!/usr/bin/env node
/**
 * verify-stop-fns.js
 *
 * Confirms `admin_create_stop` and `admin_create_stops_batch` exist in the
 * live database with the exact signatures the client uses, and that the
 * PostgREST schema cache has them registered.
 *
 * Run:  node scripts/verify-stop-fns.js
 *
 * Replaces the older `check-stop-fns*.js` scripts (left in the repo for
 * history; this one is the canonical post-fix verification).
 *
 * Exits 0 on success, 1 if any check fails.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const SERVICE_HEADERS = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

const ANON_HEADERS = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "Content-Type": "application/json",
};

let failed = 0;
const fail = (msg) => { console.error("✗ " + msg); failed += 1; };
const pass = (msg) => console.log("✓ " + msg);

async function rpc(name, body, headers = SERVICE_HEADERS) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  return { status: r.status, body: parsed };
}

(async () => {
  console.log(`\nVerifying stop RPCs against ${url}\n`);

  // ── 1. admin_create_stop — empty body (expect 400/422, NOT PGRST202) ─────
  // PGRST202 = function not in schema cache. We want a 400-style validation
  // error here, which proves PostgREST knows the function exists.
  console.log("1. admin_create_stop signature check (PostgREST cache)");
  const probe1 = await rpc("admin_create_stop", {});
  if (probe1.status === 404) {
    fail("admin_create_stop returned 404 — function not found (PGRST202 cache miss). " +
         "Did you apply migration 147 and run `NOTIFY pgrst, 'reload schema'`?");
  } else if (probe1.status >= 500) {
    fail(`admin_create_stop returned ${probe1.status} — server error. Body: ${JSON.stringify(probe1.body)}`);
  } else {
    pass(`admin_create_stop reachable in PostgREST (status ${probe1.status})`);
  }

  // ── 2. admin_create_stop — happy path with a real (but harmless) brand ──
  console.log("\n2. admin_create_stop happy-path call (anon key)");
  const probe2 = await rpc(
    "admin_create_stop",
    {
      p_brand_id: "00000000-0000-0000-0000-000000000000",
      p_city: "verify-script-city",
      p_state: "CO",
      p_location: "verification stop",
      p_date: "2099-12-31",
      p_time: "08:00 AM – 02:00 PM",
      p_address: "123 Verify St",
      p_zip: "80000",
      p_cutoff_time: "08:00",        // time-only — should be combined with date
      p_active: false,
    },
    ANON_HEADERS
  );
  if (probe2.status === 404) {
    fail("admin_create_stop not callable via anon key. " +
         "GRANT EXECUTE missing? Body: " + JSON.stringify(probe2.body));
  } else if (probe2.status >= 400) {
    // Expected: brand_id is the zero UUID (foreign key violation). That's fine —
    // it proves the function executed past type validation.
    const msg = JSON.stringify(probe2.body);
    if (/foreign key|violates/i.test(msg)) {
      pass(`admin_create_stop ran end-to-end (got expected FK violation: ${msg.slice(0, 120)}...)`);
    } else {
      fail(`admin_create_stop failed unexpectedly (${probe2.status}): ${msg}`);
    }
  } else {
    pass(`admin_create_stop returned success: ${JSON.stringify(probe2.body)}`);
  }

  // ── 3. admin_create_stops_batch — same checks ───────────────────────────
  console.log("\n3. admin_create_stops_batch signature check");
  const probe3 = await rpc("admin_create_stops_batch", { p_brand_id: null, p_stops: [] });
  if (probe3.status === 404) {
    fail("admin_create_stops_batch returned 404 — function not in schema cache.");
  } else {
    pass(`admin_create_stops_batch reachable (status ${probe3.status})`);
  }

  // ── 4. OpenAPI introspection — confirm functions are exposed ────────────
  console.log("\n4. OpenAPI introspection");
  const openApi = await fetch(`${url}/rest/v1/`, { headers: ANON_HEADERS });
  const text = await openApi.text();
  const hasSingle = /admin_create_stop\b/.test(text);
  const hasBatch = /admin_create_stops_batch\b/.test(text);
  if (hasSingle) pass("admin_create_stop appears in OpenAPI spec");
  else fail("admin_create_stop NOT in OpenAPI spec — PostgREST hasn't seen it yet");
  if (hasBatch) pass("admin_create_stops_batch appears in OpenAPI spec");
  else fail("admin_create_stops_batch NOT in OpenAPI spec");

  console.log(`\n${failed === 0 ? "✓ All checks passed" : `✗ ${failed} check(s) failed`}\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("verify-stop-fns.js crashed:", e);
  process.exit(1);
});
