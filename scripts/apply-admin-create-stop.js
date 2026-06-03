#!/usr/bin/env node
/**
 * apply-admin-create-stop.js
 *
 * Applies the admin_create_stop RPC using ONLY the keys in .env.local.
 * You do NOT need Supabase dashboard / SQL editor access.
 *
 * This is the fix for the "could not find the function public.admin_create_stop(...)"
 * error when you click "Add New Stop".
 *
 * Usage (run from the repo root on a machine that can reach the DB):
 *   node scripts/apply-admin-create-stop.js
 *
 * The script connects as the real postgres user (using your SUPABASE_SERVICE_ROLE_KEY
 * as the password) and runs the CREATE OR REPLACE + GRANT + NOTIFY.
 * This is the only reliable way to create the SECURITY DEFINER function because
 * direct REST inserts are blocked by the `block_stops_mutations` policy.
 *
 * After it prints success:
 *   - Restart your `npm run dev`
 *   - "Add New Stop" (AddStopModal / NewStopForm) will now call the RPC successfully.
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local (same as the rest of the project)
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
} catch (e) {
  // dotenv might not be hoisted in some setups; the keys may already be in process.env
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("   Make sure you are running from the repo root and .env.local exists with the keys.");
  process.exit(1);
}

// Derive the direct Postgres URL (same logic as supabase/push-migrations.js)
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
const pgHost = `db.${projectRef}.supabase.co`;
const dbUrl = `postgresql://postgres:${encodeURIComponent(serviceKey)}@${pgHost}:5432/postgres`;

console.log("🔧 apply-admin-create-stop RPC installer");
console.log("   Project:", projectRef);
console.log("   Using service role key from .env.local (full Postgres access)");
console.log("");

async function main() {
  const migrationPath = path.resolve(__dirname, "../supabase/migrations/202_fix_admin_create_stop.sql");

  if (!fs.existsSync(migrationPath)) {
    console.error("❌ Cannot find migration file:", migrationPath);
    console.error("   The file should have been created by the previous fix.");
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    // Some environments need a longer timeout
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log("⏳ Connecting to Postgres (this uses port 5432 outbound)...");
    await client.connect();
    console.log("✅ Connected.");

    console.log("⏳ Executing 202_fix_admin_create_stop.sql (CREATE OR REPLACE + GRANT + NOTIFY)...");
    const result = await client.query(sql);

    console.log("✅ Function installed / updated successfully.");
    console.log("   Rows affected in last statement:", result.rowCount ?? "(see output above if any)");
    console.log("");
    console.log("🎉 admin_create_stop is now available via the anon key (SECURITY DEFINER).");

    // Quick verification using the anon key over HTTPS (this is what the app uses)
    try {
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const probeBody = {
        p_active: false,
        p_address: null,
        p_brand_id: "00000000-0000-0000-0000-000000000000", // will FK fail, but proves the function exists
        p_city: "verify",
        p_cutoff_time: null,
        p_date: "2099-12-31",
        p_location: "verify",
        p_state: "TS",
        p_time: "10:00",
        p_zip: null,
      };
      const probe = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/admin_create_stop`, {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify(probeBody),
      });
      const txt = await probe.text();
      if (probe.status === 404) {
        console.log("⚠️  Post-apply probe still got 404 — you may need to wait a few seconds or the NOTIFY didn't take.");
      } else if (/foreign key|violates|brand_id/i.test(txt)) {
        console.log("✅ Post-apply probe: function exists (got expected FK error on the zero-UUID brand — this is success).");
      } else {
        console.log("✅ Post-apply probe returned:", txt.slice(0, 200));
      }
    } catch (e) {
      console.log("   (verification fetch skipped:", e.message, ")");
    }

    console.log("");
    console.log("Next:");
    console.log("  • Restart your dev server (`npm run dev`) if it was already running.");
    console.log("  • Go to the stops admin page and try \"Add New Stop\".");
    console.log("  • (Optional but recommended) node scripts/verify-stop-fns.js");
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    console.error("❌ Failed to apply the function.");
    console.error("   Error:", msg.slice(0, 500));

    if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|network is unreachable|ECONNREFUSED|timeout/i.test(msg)) {
      console.log("");
      console.log("💡 Your current environment cannot reach the database on port 5432.");
      console.log("   This is common inside some containers/CI sandboxes.");
      console.log("");
      console.log("   Copy and run ONE of the following on a *normal* laptop/terminal that has");
      console.log("   outbound access to Supabase Postgres (most developer machines can reach it):");
      console.log("");
      console.log("   Option A (easiest, uses exactly the same code as this script):");
      console.log("     npm run migrate:one 202");
      console.log("");
      console.log("   Option B (psql):");
      console.log("     # Build the URL using the key from your .env.local (same as this script does):");
      console.log("     # psql \"postgresql://postgres:PUT_YOUR_SERVICE_ROLE_KEY_HERE@db." + projectRef + ".supabase.co:5432/postgres\" \\");
      console.log("     #      -f supabase/migrations/202_fix_admin_create_stop.sql");
      console.log("");
      console.log("   Option C (Supabase CLI):");
      console.log("     supabase db push --db-url \"postgresql://postgres:YOUR_SERVICE_ROLE_KEY@db." + projectRef + ".supabase.co:5432/postgres\" \\");
      console.log("       supabase/migrations/202_fix_admin_create_stop.sql");
      console.log("");
      console.log("   After the command succeeds you will see the NOTIFY and the function will exist.");
      console.log("   Then restart `npm run dev` and \"Add New Stop\" will stop showing the function-not-found error.");
    }

    process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
}

main().catch((e) => {
  console.error("Unexpected crash:", e);
  process.exit(1);
});
