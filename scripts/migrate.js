#!/usr/bin/env node
/**
 * Apply Postgres migrations from `db/migrations/*.sql` in lexical order.
 * Wraps the whole thing in a transaction; tracks applied files in
 * `_migrations` so re-runs are safe.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Replaces the old `supabase/push-migrations.js` — that script was
 * hardcoded to a Supabase URL. This one reads `DATABASE_URL` directly.
 */
require("dotenv").config({ path: ".env.local" });

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

async function main() {
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL (or DATABASE_ADMIN_URL) is not set in .env.local");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found in db/migrations/");
      return;
    }

    const { rows: applied } = await client.query(
      `SELECT filename FROM _migrations`,
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    let appliedNow = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`✓ ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`→ Applying ${file}...`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [
          file,
        ]);
        await client.query("COMMIT");
        appliedNow += 1;
        console.log(`✓ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`✗ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log(
      `\n✅ Done. ${appliedNow} new migration(s) applied. ${
        files.length - appliedNow
      } already current.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
