/**
 * Seed script. Idempotent — safe to re-run. Uses `ON CONFLICT (col) DO UPDATE`
 * (with a target) for tables that have a unique constraint; uses
 * `WHERE NOT EXISTS` for tables that don't.
 *
 *   npm run db:seed
 *
 * Populates:
 *   - 3 plans (Starter / Farm / Enterprise)
 *   - 6 add-ons
 *   - 2 tenants (Tuxedo, Indian River Direct)
 *   - 1 platform-admin user + 1 brand_admin per tenant
 *   - brand_settings per tenant
 *   - sample products, stops, customers per tenant
 *   - sample email templates + a draft campaign
 */
import "dotenv/config";
import { Pool } from "pg";

// Seed needs elevated privileges (inserts into plans, add_ons, tenants —
// tables that are intentionally not RLS-scoped but the runtime app user
// can't create rows in without setting up GUCs we don't want to bother
// with here). Use DATABASE_ADMIN_URL (the superuser) for the seed.
const pool = new Pool({
  connectionString:
    process.env.DATABASE_ADMIN_URL ??
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/route_commerce",
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Plans ────────────────────────────────────────────────────────────
    const planRows = [
      { code: "starter", name: "Starter", price: 4900, maxUsers: 1, maxProducts: 25, maxStopsMonthly: 10, features: ["products", "stops", "orders", "basic_pickup"] },
      { code: "farm", name: "Farm", price: 14900, maxUsers: 5, maxProducts: 9999, maxStopsMonthly: 9999, features: ["products", "stops", "orders", "basic_pickup", "wholesale_portal", "harvest_reach", "priority_support"] },
      { code: "enterprise", name: "Enterprise", price: 39900, maxUsers: 9999, maxProducts: 9999, maxStopsMonthly: 9999, features: ["products", "stops", "orders", "basic_pickup", "wholesale_portal", "harvest_reach", "priority_support", "ai_intelligence", "sms_campaigns", "square_sync", "water_log", "custom_development", "dedicated_sla"] },
    ];
    for (const p of planRows) {
      await client.query(
        `INSERT INTO plans (code, name, monthly_price_cents, max_users, max_products, max_stops_monthly, features)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           monthly_price_cents = EXCLUDED.monthly_price_cents,
           max_users = EXCLUDED.max_users,
           max_products = EXCLUDED.max_products,
           max_stops_monthly = EXCLUDED.max_stops_monthly,
           features = EXCLUDED.features`,
        [p.code, p.name, p.price, p.maxUsers, p.maxProducts, p.maxStopsMonthly, JSON.stringify(p.features)],
      );
    }
    console.log(`Seeded ${planRows.length} plans`);

    // ── Add-ons ──────────────────────────────────────────────────────────
    const addOnRows = [
      { code: "wholesale_portal", name: "Wholesale Portal", price: 9900, description: "Self-serve wholesale storefront with order approval." },
      { code: "harvest_reach", name: "Harvest Reach", price: 7900, description: "Email + SMS campaigns and automations." },
      { code: "ai_tools", name: "AI Intelligence Pack", price: 5900, description: "Smart pricing, product descriptions, and demand forecasting." },
      { code: "water_log", name: "Water Log", price: 3900, description: "Irrigation tracking and reporting." },
      { code: "square_sync", name: "Square Sync", price: 3900, description: "Sync inventory and sales to Square POS." },
      { code: "sms_campaigns", name: "SMS Campaigns", price: 2900, description: "Send SMS blasts and automations." },
    ];
    for (const a of addOnRows) {
      await client.query(
        `INSERT INTO add_ons (code, name, monthly_price_cents, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           monthly_price_cents = EXCLUDED.monthly_price_cents,
           description = EXCLUDED.description`,
        [a.code, a.name, a.price, a.description],
      );
    }
    console.log(`Seeded ${addOnRows.length} add-ons`);

    // ── Tenants + users + content ────────────────────────────────────────
    const tenantsData = [
      {
        slug: "tuxedo",
        name: "Tuxedo Citrus",
        brandName: "Tuxedo Citrus Co.",
        tagline: "Sun-ripened citrus, delivered.",
        aboutHtml:
          "<p>Family-run citrus grove in the Indian River region. We grow, pack, and ship premium grapefruit, oranges, and specialty varieties to wholesale buyers across the country.</p>",
        primaryColor: "#F59E0B",
        contactEmail: "hello@tuxedocitrus.example",
        contactPhone: "(555) 010-2200",
        planCode: "farm",
        addOns: ["wholesale_portal", "harvest_reach"],
      },
      {
        slug: "indian-river-direct",
        name: "Indian River Direct",
        brandName: "Indian River Direct",
        tagline: "From our groves to your store.",
        aboutHtml:
          "<p>Direct-from-grove wholesale produce. Family farms, fair pricing, fast delivery.</p>",
        primaryColor: "#0F766E",
        contactEmail: "orders@indianriverdirect.example",
        contactPhone: "(555) 010-3300",
        planCode: "starter",
        addOns: ["wholesale_portal"],
      },
    ];

    for (const t of tenantsData) {
      // Upsert tenant
      const tenantRes = await client.query<{ id: string }>(
        `INSERT INTO tenants (name, slug, status, trial_ends_at)
         VALUES ($1, $2, 'active', now() + interval '30 days')
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [t.name, t.slug],
      );
      const tenantId = tenantRes.rows[0].id;

      // Plan + subscription
      const planRes = await client.query<{ id: string }>(
        `SELECT id FROM plans WHERE code = $1`,
        [t.planCode],
      );
      const planId = planRes.rows[0].id;
      await client.query(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, current_period_end)
         VALUES ($1, $2, 'active', now() + interval '30 days')
         ON CONFLICT (tenant_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           status = EXCLUDED.status,
           current_period_end = EXCLUDED.current_period_end`,
        [tenantId, planId],
      );

      // Add-ons (composite PK — ON CONFLICT has a target)
      for (const code of t.addOns) {
        const addOnRes = await client.query<{ id: string }>(
          `SELECT id FROM add_ons WHERE code = $1`,
          [code],
        );
        if (!addOnRes.rows[0]) continue;
        const addOnId = addOnRes.rows[0].id;
        await client.query(
          `INSERT INTO tenant_add_ons (tenant_id, add_on_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (tenant_id, add_on_id) DO NOTHING`,
          [tenantId, addOnId],
        );
      }

      // Brand settings (PK is tenant_id)
      await client.query(
        `INSERT INTO brand_settings
           (tenant_id, brand_name, tagline, about_html, primary_color, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id) DO UPDATE SET
           brand_name = EXCLUDED.brand_name,
           tagline = EXCLUDED.tagline,
           about_html = EXCLUDED.about_html,
           primary_color = EXCLUDED.primary_color,
           contact_email = EXCLUDED.contact_email,
           contact_phone = EXCLUDED.contact_phone`,
        [
          tenantId, t.brandName, t.tagline, t.aboutHtml,
          t.primaryColor, t.contactEmail, t.contactPhone,
        ],
      );

      // Brand admin user
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (email, name, auth_provider, auth_subject)
         VALUES ($1, $2, 'dev', $3)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [`admin@${t.slug}.example`, `${t.brandName} Admin`, `dev-${t.slug}-admin`],
      );
      const userId = userRes.rows[0].id;
      await client.query(
        `INSERT INTO tenant_users (tenant_id, user_id, role)
         VALUES ($1, $2, 'brand_admin')
         ON CONFLICT (tenant_id, user_id) DO NOTHING`,
        [tenantId, userId],
      );

      // Sample products — use WHERE NOT EXISTS (no good unique target other than id)
      const products = [
        { name: "Ruby Red Grapefruit", price: 2400, unit: "40 lb case", desc: "Sweet, juicy, seedless." },
        { name: "Navel Oranges", price: 2200, unit: "40 lb case", desc: "Classic eating orange, easy-peel." },
        { name: "Honeybells", price: 3200, unit: "20 lb case", desc: "Limited season — bell-shaped, super sweet." },
        { name: "Tangelos", price: 2800, unit: "40 lb case", desc: "Tangerine-grapefruit hybrid." },
      ];
      for (const p of products) {
        await client.query(
          `INSERT INTO products (tenant_id, name, description, price_cents, inventory, unit, active)
           SELECT $1, $2, $3, $4, 100, $5, true
           WHERE NOT EXISTS (
             SELECT 1 FROM products WHERE tenant_id = $1 AND name = $2
           )`,
          [tenantId, p.name, p.desc, p.price, p.unit],
        );
      }

      // Sample stops
      const stops = [
        { name: "Downtown Farmers Market", address: "100 Main St", schedule: [{ day: "Saturday", time: "08:00" }] },
        { name: "Eastside Pickup Hub", address: "555 Oak Ave", schedule: [{ day: "Wednesday", time: "16:00" }] },
      ];
      for (const s of stops) {
        await client.query(
          `INSERT INTO stops (tenant_id, name, address, schedule, status)
           SELECT $1, $2, $3, $4::jsonb, 'active'
           WHERE NOT EXISTS (
             SELECT 1 FROM stops WHERE tenant_id = $1 AND name = $2
           )`,
          [tenantId, s.name, s.address, JSON.stringify(s.schedule)],
        );
      }

      // Sample customers (email has a unique index per tenant)
      const customers = [
        { name: "Green Grocer Co.", email: "buyer@greengrocer.example", phone: "555-010-0010" },
        { name: "Sunset Cafe", email: "orders@sunsetcafe.example", phone: "555-010-0020" },
        { name: "Northside Co-op", email: "produce@northsidecoop.example", phone: "555-010-0030" },
      ];
      for (const c of customers) {
        await client.query(
          `INSERT INTO customers (tenant_id, name, email, phone, sms_opt_in, email_opt_in)
           SELECT $1, $2, $3, $4, true, true
           WHERE NOT EXISTS (
             SELECT 1 FROM customers WHERE tenant_id = $1 AND email = $3
           )`,
          [tenantId, c.name, c.email, c.phone],
        );
      }

      // Sample email template (id-based, use WHERE NOT EXISTS)
      const tmplRes = await client.query<{ id: string }>(
        `INSERT INTO email_templates (tenant_id, name, subject, body_html)
         SELECT $1, 'Weekly Availability', 'This week at the grove', '<h1>Fresh this week</h1><p>Hi {{name}}, our harvest is in. Reply to reserve.</p>'
         WHERE NOT EXISTS (
           SELECT 1 FROM email_templates WHERE tenant_id = $1 AND name = 'Weekly Availability'
         )
         RETURNING id`,
        [tenantId],
      );
      if (tmplRes.rows[0]) {
        await client.query(
          `INSERT INTO campaigns (tenant_id, template_id, name, status)
           SELECT $1, $2, 'Welcome series — week 1', 'draft'
           WHERE NOT EXISTS (
             SELECT 1 FROM campaigns WHERE tenant_id = $1 AND name = 'Welcome series — week 1'
           )`,
          [tenantId, tmplRes.rows[0].id],
        );
      }
    }
    console.log(`Seeded ${tenantsData.length} tenants with sample data`);

    // ── Platform admin user (not tied to any single tenant) ──────────────
    await client.query(
      `INSERT INTO users (email, name, auth_provider, auth_subject)
       VALUES ('platform@route-commerce.example', 'Platform Admin', 'dev', 'dev-platform-admin')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
    );
    console.log("Seeded platform admin user");

    await client.query("COMMIT");
    console.log("✅ Seed complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    pool.end();
    process.exit(1);
  });
