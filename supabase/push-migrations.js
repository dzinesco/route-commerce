#!/usr/bin/env node
/**
 * push-migrations.js
 *
 * Pushes migration files to the linked Supabase project.
 * Uses the Supabase CLI if available (supabase db push),
 * otherwise falls back to direct PostgreSQL connection via `pg`.
 *
 * Usage:
 *   node supabase/push-migrations.js                    # push all pending migrations
 *   node supabase/push-migrations.js 082               # push only migration 082
 *
 * Prerequisites for CLI mode:
 *   brew install supabase/tap/supabase   # install CLI
 *   supabase link --project-ref <ref>   # link project once
 *
 * Prerequisites for direct PG mode:
 *   npm install                        # pg and dotenv already in devDependencies
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load .env.local for direct PG mode
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
} catch {
  // dotenv not available — CLI mode only
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function pushWithCli(files) {
  console.log("Using Supabase CLI (supabase db push)...\n");
  const joined = files.map((f) => `supabase/migrations/${f}`).join(" ");
  try {
    execSync(
      `supabase db push --db-url "postgresql://postgres:${serviceRoleKey}@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres" ${joined}`,
      { stdio: "inherit", cwd: path.resolve(__dirname, "..") }
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function pushWithPg(sql, migrationFile) {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    return false;
  }

  // Derive direct PG host from Supabase URL
  const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
  const pgHost = `db.${projectRef}.supabase.co`;

  const client = new Client({
    host: pgHost,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: serviceRoleKey,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`  ✓ Applied: ${migrationFile}`);
    return true;
  } catch (err) {
    const cleanMsg = err.message.replace(/\x1b\[[0-9;]*m/g, "");
    console.error(`  ERROR: ${cleanMsg.slice(0, 300)}`);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  const targetMigration = process.argv[2];

  let files = fs.readdirSync(path.resolve(__dirname, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (targetMigration) {
    files = files.filter((f) => f.startsWith(targetMigration + "_"));
    if (files.length === 0) {
      console.error(`No migration found matching: ${targetMigration}_*`);
      process.exit(1);
    }
  }

  console.log(`Found ${files.length} migration file(s) to push:`);
  for (const f of files) console.log(`  ${f}`);
  console.log("");

  let ok = false;

  // Try CLI first if supabase is linked (has .supabase/config.toml)
  let hasSupabaseCli = false;
  try {
    hasSupabaseCli = !!execSync("which supabase", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    hasSupabaseCli = false;
  }
  const isLinked = fs.existsSync(path.resolve(__dirname, "../.supabase/config.toml"));

  if (hasSupabaseCli && isLinked) {
    console.log("Supabase CLI detected and project is linked.\n");
    ok = await pushWithCli(files);
    if (ok) {
      console.log(`\nDone. ${files.length} migration(s) pushed via Supabase CLI.`);
      return;
    }
    console.log("CLI mode failed, falling back to direct PG connection...\n");
  }

  // Direct PG fallback
  for (const file of files) {
    const sql = fs.readFileSync(path.resolve(__dirname, "migrations", file), "utf8");
    process.stdout.write(`Pushing ${file}... `);
    const fileOk = await pushWithPg(sql, file);
    if (!fileOk) {
      console.error(`\nMigration failed: ${file}`);
      process.exit(1);
    }
  }

  console.log(`\nDone. ${files.length} migration(s) pushed via direct PG.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});