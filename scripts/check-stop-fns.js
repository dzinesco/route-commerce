require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function rpc(name, body = {}) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  return { status: r.status, text: (await r.text()).slice(0, 500) };
}

(async () => {
  // 1. Try calling admin_create_stop with service role
  console.log("=== 1. Call admin_create_stop (service role) ===");
  console.log(await rpc("admin_create_stop", { p_brand_id: null }));

  // 2. Try with body
  console.log("\n=== 2. Call admin_create_stop with stub body ===");
  console.log(await rpc("admin_create_stop", {
    p_brand_id: "00000000-0000-0000-0000-000000000000",
    p_city: "test", p_state: "CO", p_location: "x", p_date: "2025-01-01", p_time: "08:00"
  }));

  // 3. Try with a name that obviously doesn't exist to see the error format
  console.log("\n=== 3. Call a non-existent function (control) ===");
  console.log(await rpc("definitely_does_not_exist_xyz", {}));

  // 4. Use the PostgREST introspection — query information_schema via rpc
  // PostgREST exposes pg_proc through /rest/v1/ for system tables is not allowed
  // But we can use the OpenAPI spec endpoint
  console.log("\n=== 4. OpenAPI spec — looking for admin_create_stop ===");
  const openApi = await fetch(`${url}/rest/v1/`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  const text = await openApi.text();
  const matches = text.match(/admin_create_stop[a-z_]*/g) || [];
  console.log("Matches in OpenAPI:", matches);

  // 5. Get all function names from OpenAPI
  const funcMatches = [...text.matchAll(/"([a-z][a-z0-9_]*)\s*\{/g)].map(m => m[1]);
  const stopFns = funcMatches.filter(n => n.includes("stop"));
  console.log("\nStop-related functions in OpenAPI:", stopFns);
})();
