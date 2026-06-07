#!/usr/bin/env node
/**
 * DESTRUCTIVE: drops and recreates the `route_commerce` database, then
 * applies all migrations and seeds.
 *
 * Usage:
 *   npm run db:reset
 *
 * Use only in dev. Requires sudo-less access to a postgres superuser.
 */
require("dotenv").config({ path: ".env.local" });
const { execSync } = require("node:child_process");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const m = url.match(/postgres(?:ql)?:\/\/([^:]+):[^@]+@([^:]+):(\d+)\/(.+)/);
if (!m) {
  console.error("❌ Could not parse DATABASE_URL");
  process.exit(1);
}
const [, user, host, port, db] = m;
const adminUrl = url.replace(/\/[^/]+$/, "/postgres");

console.log(`⚠️  DROPPING and recreating ${db} on ${host}:${port} as ${user}`);
try {
  execSync(
    `psql "${adminUrl}" -c "DROP DATABASE IF EXISTS ${db};" -c "CREATE DATABASE ${db} OWNER ${user};"`,
    { stdio: "inherit" },
  );
  console.log("✓ Database recreated");
} catch (err) {
  console.error("❌ Failed to drop/create database. Try with sudo:");
  console.error(
    `   sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${db};" -c "CREATE DATABASE ${db} OWNER ${user};"`,
  );
  process.exit(1);
}

execSync("npm run db:migrate", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
console.log("✅ Database reset, migrated, and seeded");
