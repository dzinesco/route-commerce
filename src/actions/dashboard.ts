"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type DashboardStats = {
  todayOrders: number;
  todayRevenue: number;
  pendingStops: number;
  activeProducts: number;
  weeklyOrders: number[];
  recentOrders: Array<{
    id: string;
    customer_name: string;
    total: number;
    status: string;
    created_at: string;
  }>;
};

export type DashboardSummary = {
  total_revenue: number;
  total_orders: number;
  active_stops: number;
  active_products: number;
};

// ── Dashboard Stats Actions ─────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) throw new Error("Not authenticated");

    const brandId = await getActiveBrandId(adminUser);

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Fetch today's orders. `orders` and `stops` use the legacy schema
    // (column names like `subtotal`, `brand_id`, `date`); the new-schema
    // Drizzle `orders` table doesn't have these. Raw SQL via the shared
    // pg pool.
    const todayOrdersRes = brandId
      ? await pool.query<{ subtotal: number; status: string }>(
          `SELECT subtotal, status
             FROM orders
            WHERE created_at >= $1
              AND created_at <  $2
              AND brand_id = $3`,
          [startOfDay.toISOString(), endOfDay.toISOString(), brandId],
        )
      : await pool.query<{ subtotal: number; status: string }>(
          `SELECT subtotal, status
             FROM orders
            WHERE created_at >= $1
              AND created_at <  $2`,
          [startOfDay.toISOString(), endOfDay.toISOString()],
        );
    const todayOrders = todayOrdersRes.rows;

    // Calculate today's revenue and orders
    const validOrders = todayOrders.filter((o) => o.status !== "cancelled");
    const todayRevenue = validOrders.reduce(
      (sum, o) => sum + (o.subtotal || 0),
      0,
    );
    const todayOrderCount = validOrders.length;

    // Fetch pending stops (stops where date >= today and status is scheduled)
    const stopsRes = brandId
      ? await pool.query<{ id: string }>(
          `SELECT id FROM stops
            WHERE date >= $1
              AND status = 'scheduled'
              AND brand_id = $2
            LIMIT 100`,
          [startOfDay.toISOString().split("T")[0], brandId],
        )
      : await pool.query<{ id: string }>(
          `SELECT id FROM stops
            WHERE date >= $1
              AND status = 'scheduled'
            LIMIT 100`,
          [startOfDay.toISOString().split("T")[0]],
        );
    const pendingStops = stopsRes.rows.length;

    // Fetch active products
    const productsRes = brandId
      ? await pool.query<{ id: string }>(
          `SELECT id FROM products
            WHERE active = true AND brand_id = $1
            LIMIT 1000`,
          [brandId],
        )
      : await pool.query<{ id: string }>(
          `SELECT id FROM products
            WHERE active = true
            LIMIT 1000`,
        );
    const activeProducts = productsRes.rows.length;

    // Fetch weekly orders for chart (last 7 days)
    const weeklyOrders: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(startOfDay);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayRes = brandId
        ? await pool.query<{ id: string }>(
            `SELECT id FROM orders
              WHERE created_at >= $1
                AND created_at <  $2
                AND brand_id = $3
              LIMIT 1`,
            [dayStart.toISOString(), dayEnd.toISOString(), brandId],
          )
        : await pool.query<{ id: string }>(
            `SELECT id FROM orders
              WHERE created_at >= $1
                AND created_at <  $2
              LIMIT 1`,
            [dayStart.toISOString(), dayEnd.toISOString()],
          );
      weeklyOrders.push(dayRes.rows.length > 0 ? 1 : 0);
    }

    // Fetch recent orders (last 10)
    const recentRes = brandId
      ? await pool.query<{
          id: string;
          customer_name: string;
          subtotal: number;
          status: string;
          created_at: string;
        }>(
          `SELECT id, customer_name, subtotal, status, created_at
             FROM orders
            WHERE brand_id = $1
            ORDER BY created_at DESC
            LIMIT 10`,
          [brandId],
        )
      : await pool.query<{
          id: string;
          customer_name: string;
          subtotal: number;
          status: string;
          created_at: string;
        }>(
          `SELECT id, customer_name, subtotal, status, created_at
             FROM orders
            ORDER BY created_at DESC
            LIMIT 10`,
        );

    const recentOrders = recentRes.rows
      .filter((o) => o.status !== "cancelled")
      .map((o) => ({
        id: o.id || "",
        customer_name: o.customer_name || "Guest",
        total: o.subtotal || 0,
        status: o.status || "unknown",
        created_at: formatTimeAgo(o.created_at),
      }));

    return {
      todayOrders: todayOrderCount,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      pendingStops,
      activeProducts,
      weeklyOrders,
      recentOrders,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      todayOrders: 0,
      todayRevenue: 0,
      pendingStops: 0,
      activeProducts: 0,
      weeklyOrders: [0, 0, 0, 0, 0, 0, 0],
      recentOrders: [],
    };
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) throw new Error("Not authenticated");

    const brandId = await getActiveBrandId(adminUser);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // `get_reports_summary` is a SECURITY DEFINER RPC that returns the
    // gross sales + total order counts. Migration 031.
    let total_revenue = 0;
    let total_orders = 0;
    try {
      const { rows } = await pool.query<{
        gross_sales: number;
        total_orders: number;
      }>(
        "SELECT * FROM get_reports_summary($1, $2, $3)",
        [
          brandId,
          thirtyDaysAgo.toISOString().split("T")[0],
          new Date().toISOString().split("T")[0],
        ],
      );
      const data = rows[0];
      total_revenue = data?.gross_sales ?? 0;
      total_orders = data?.total_orders ?? 0;
    } catch {
      // Fall through with zeros if the RPC is missing.
    }

    // Get active stops count
    const stopsRes = brandId
      ? await pool.query<{ id: string }>(
          `SELECT id FROM stops
            WHERE date >= $1 AND status = 'scheduled' AND brand_id = $2`,
          [new Date().toISOString().split("T")[0], brandId],
        )
      : await pool.query<{ id: string }>(
          `SELECT id FROM stops
            WHERE date >= $1 AND status = 'scheduled'`,
          [new Date().toISOString().split("T")[0]],
        );
    const activeStops = stopsRes.rows.length;

    // Get active products count
    const productsRes = brandId
      ? await pool.query<{ id: string }>(
          `SELECT id FROM products WHERE active = true AND brand_id = $1`,
          [brandId],
        )
      : await pool.query<{ id: string }>(
          `SELECT id FROM products WHERE active = true`,
        );
    const activeProducts = productsRes.rows.length;

    return {
      total_revenue,
      total_orders,
      active_stops: activeStops,
      active_products: activeProducts,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return {
      total_revenue: 0,
      total_orders: 0,
      active_stops: 0,
      active_products: 0,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
