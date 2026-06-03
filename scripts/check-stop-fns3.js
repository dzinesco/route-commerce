require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const { Client } = require("pg");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = url.replace("https://", "").split(".")[0];
const pw = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tries = [
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: `postgres.${projectRef}`, database: "postgres" },
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 5432, user: `postgres.${projectRef}`, database: "postgres" },
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, user: "postgres",            database: "postgres" },
];

(async () => {
  for (const cfg of tries) {
    const client = new Client({ ...cfg, password: pw, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const r = await client.query(`
        SELECT p.proname,
               pg_get_function_identity_arguments(p.oid) AS id_args,
               p.prosecdef AS secdef
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
        WHERE n.nspname='public' AND p.proname IN
          ('admin_create_stop','admin_create_stops_batch','delete_stop')
        ORDER BY p.proname;
      `);
      console.log(`\n✓ ${cfg.host}:${cfg.port} user=${cfg.user}`);
      console.log(JSON.stringify(r.rows, null, 2));

      // Also check if migration tracking table exists
      const trk = await client.query(`
        SELECT version, name FROM supabase_migrations.schema_migrations
        WHERE version >= 145 ORDER BY version;
      `).catch(() => ({ rows: [] }));
      console.log("Recent migrations applied:", trk.rows);
      await client.end();
      return;
    } catch (e) {
      console.log(`✗ ${cfg.host}:${cfg.port} user=${cfg.user} → ${e.message}`);
      try { await client.end(); } catch {}
    }
  }
})();
