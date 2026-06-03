require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const { Client } = require("pg");
const dns = require("dns");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = url.replace("https://", "").split(".")[0];
const candidates = [
  `db.${projectRef}.supabase.co`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
];

(async () => {
  for (const host of candidates) {
    try {
      const ip = await new Promise((resolve, reject) => {
        dns.resolve4(host, (err, addrs) => err ? reject(err) : resolve(addrs));
      });
      console.log(`${host} -> ${ip.join(", ")}`);
    } catch (e) {
      console.log(`${host} -> DNS FAIL: ${e.code}`);
    }
  }

  // Try direct DB with port 6543 (pooler) using supabase format
  // Username pattern: postgres.<project-ref>
  const client = new Client({
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 6543, database: "postgres",
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
  });
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
    console.log("\nFUNCTIONS IN DB:");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error("POOLER ERR:", e.message);
  } finally {
    try { await client.end(); } catch {}
  }
})();
