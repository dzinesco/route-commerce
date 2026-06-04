"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// ── Helper ────────────────────────────────────────────────────────────────────

async function brandScopedFetch<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");

  let url = `${supabaseUrl}/rest/v1${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      ...svcHeaders(supabaseKey),
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Dashboard fetch failed: ${err}`);
  }

  return response.json() as Promise<T>;
}

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

    // Get start of week (7 days ago) - kept for potential weekly comparison
    const _weekStart = new Date(startOfDay);
    _weekStart.setDate(_weekStart.getDate() - 6);

    // Fetch today's orders
    let todayOrdersQuery = `${supabaseUrl}/rest/v1/orders?select=id,subtotal,status`;
    todayOrdersQuery += `&created_at=gte.${startOfDay.toISOString()}`;
    todayOrdersQuery += `&created_at=lt.${endOfDay.toISOString()}`;
    if (brandId) {
      todayOrdersQuery += `&brand_id=eq.${brandId}`;
    }

    const todayOrdersRes = await fetch(todayOrdersQuery, {
      headers: svcHeaders(supabaseKey),
    });
    const todayOrders = await todayOrdersRes.json();

    // Calculate today's revenue and orders
    const validOrders = (todayOrders as Array<{subtotal: number; status: string}>)
      .filter(o => o.status !== "cancelled");
    const todayRevenue = validOrders
      .reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const todayOrderCount = validOrders.length;

    // Fetch pending stops (stops where date >= today and status is scheduled/upcoming)
    let stopsQuery = `${supabaseUrl}/rest/v1/stops?select=id`;
    stopsQuery += `&date=gte.${startOfDay.toISOString().split("T")[0]}`;
    stopsQuery += `&status=eq.scheduled`;
    if (brandId) {
      stopsQuery += `&brand_id=eq.${brandId}`;
    }
    stopsQuery += `&limit=100`;

    const stopsRes = await fetch(stopsQuery, {
      headers: svcHeaders(supabaseKey),
    });
    const pendingStopsData = await stopsRes.json();
    const pendingStops = Array.isArray(pendingStopsData) ? pendingStopsData.length : 0;

    // Fetch active products
    let productsQuery = `${supabaseUrl}/rest/v1/products?select=id`;
    productsQuery += `&active=eq.true`;
    if (brandId) {
      productsQuery += `&brand_id=eq.${brandId}`;
    }
    productsQuery += `&limit=1000`;

    const productsRes = await fetch(productsQuery, {
      headers: svcHeaders(supabaseKey),
    });
    const productsData = await productsRes.json();
    const activeProducts = Array.isArray(productsData) ? productsData.length : 0;

    // Fetch weekly orders for chart (last 7 days)
    const weeklyOrders: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(startOfDay);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      let dayQuery = `${supabaseUrl}/rest/v1/orders?select=id,status`;
      dayQuery += `&created_at=gte.${dayStart.toISOString()}`;
      dayQuery += `&created_at=lt.${dayEnd.toISOString()}`;
      if (brandId) {
        dayQuery += `&brand_id=eq.${brandId}`;
      }
      dayQuery += `&limit=1`;

      const dayRes = await fetch(dayQuery, {
        headers: svcHeaders(supabaseKey),
      });
      // Use X-Total-Count header or count from response
      const count = dayRes.headers.get("X-Total-Count");
      weeklyOrders.push(count ? parseInt(count) : 0);
    }

    // Fetch recent orders (last 10)
    let recentQuery = `${supabaseUrl}/rest/v1/orders?select=id,customer_name,subtotal,status,created_at`;
    recentQuery += `&order=created_at.desc`;
    recentQuery += `&limit=10`;
    if (brandId) {
      recentQuery += `&brand_id=eq.${brandId}`;
    }

    const recentRes = await fetch(recentQuery, {
      headers: {
        ...svcHeaders(supabaseKey),
        Prefer: "count=exact",
      },
    });
    const recentOrdersData = await recentRes.json();

    const recentOrders = (Array.isArray(recentOrdersData) ? recentOrdersData : [])
      .filter((o: {status: string}) => o.status !== "cancelled")
      .map((o: {id: string; customer_name: string; subtotal: number; status: string; created_at: string}) => ({
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
    // Return zeros on error
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

    // Get gross sales from reports RPC
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_reports_summary`, {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_start_date: thirtyDaysAgo.toISOString().split("T")[0],
        p_end_date: new Date().toISOString().split("T")[0],
      }),
    });

    let total_revenue = 0;
    let total_orders = 0;

    if (rpcRes.ok) {
      const data = await rpcRes.json();
      total_revenue = data?.gross_sales ?? 0;
      total_orders = data?.total_orders ?? 0;
    }

    // Get active stops count
    let stopsQuery = `${supabaseUrl}/rest/v1/stops?select=id`;
    stopsQuery += `&date=gte.${new Date().toISOString().split("T")[0]}`;
    stopsQuery += `&status=eq.scheduled`;
    if (brandId) {
      stopsQuery += `&brand_id=eq.${brandId}`;
    }

    const stopsRes = await fetch(stopsQuery, {
      headers: {
        ...svcHeaders(supabaseKey),
        Prefer: "count=exact",
      },
    });
    const activeStops = parseInt(stopsRes.headers.get("X-Total-Count") || "0");

    // Get active products count
    let productsQuery = `${supabaseUrl}/rest/v1/products?select=id&active=eq.true`;
    if (brandId) {
      productsQuery += `&brand_id=eq.${brandId}`;
    }

    const productsRes = await fetch(productsQuery, {
      headers: {
        ...svcHeaders(supabaseKey),
        Prefer: "count=exact",
      },
    });
    const activeProducts = parseInt(productsRes.headers.get("X-Total-Count") || "0");

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