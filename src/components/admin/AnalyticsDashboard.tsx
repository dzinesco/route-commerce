// Admin Analytics Dashboard - Real metrics and business insights
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { analytics } from "@/lib/analytics";
import {
  getAnalyticsMetrics,
  getRevenueChart,
  getTopProducts,
  getRecentOrders,
  getCustomerGrowth,
  getConversionFunnel,
  type AnalyticsMetrics,
  type RevenueDataPoint,
  type ProductPerformance,
  type RecentOrder,
  type CustomerGrowth,
  type ConversionFunnel,
} from "@/actions/analytics";

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "stable";
  icon: React.ReactNode;
}

function MetricCard({ title, value, change, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-medium ${
          trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"
        }`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </span>
        <span className="text-sm text-gray-500">
          {change > 0 ? "+" : ""}{change}% vs last period
        </span>
      </div>
    </div>
  );
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  totalRevenue: number;
  avgOrder: number;
}

function RevenueChart({ data, totalRevenue, avgOrder }: RevenueChartProps) {
  const [period, setPeriod] = useState<"7" | "30" | "90" | "365">("30");
  
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
        <div className="flex gap-2">
          <button 
            className={`px-3 py-1 text-sm rounded-lg ${period === "7" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setPeriod("7")}
          >
            7D
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-lg ${period === "30" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setPeriod("30")}
          >
            30D
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-lg ${period === "90" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setPeriod("90")}
          >
            90D
          </button>
          <button 
            className={`px-3 py-1 text-sm rounded-lg ${period === "365" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setPeriod("365")}
          >
            1Y
          </button>
        </div>
      </div>
      {data.length > 0 ? (
        <>
          <div className="h-64 flex items-end justify-between gap-4">
            {data.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-lg transition-all hover:from-primary/30"
                  style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 5)}%` }}
                />
                <span className="text-xs text-gray-500 mt-2">
                  {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Total Revenue</span>
              <p className="text-xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Avg. Order</span>
              <p className="text-xl font-bold text-gray-900">${avgOrder.toFixed(2)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <p>No revenue data available yet</p>
        </div>
      )}
    </div>
  );
}

interface TopProductsTableProps {
  products: ProductPerformance[];
}

function TopProductsTable({ products }: TopProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
        <p className="text-gray-400 text-center py-8">No product data available yet</p>
      </div>
    );
  }

  const getTrend = (avgPrice: number) => {
    if (avgPrice > 10) return "up";
    if (avgPrice < 5) return "down";
    return "stable";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 text-sm font-medium text-gray-500">Product</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500">Sales</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500">Revenue</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500">Trend</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <span className="font-medium text-gray-900">{product.product_name}</span>
                  </div>
                </td>
                <td className="py-4 text-right text-gray-600">{product.units_sold}</td>
                <td className="py-4 text-right font-medium text-gray-900">${product.revenue.toFixed(2)}</td>
                <td className="py-4 text-right">
                  <span className={`inline-flex items-center gap-1 text-sm ${
                    getTrend(product.avg_price) === "up" ? "text-green-600" : 
                    getTrend(product.avg_price) === "down" ? "text-red-600" : "text-gray-600"
                  }`}>
                    {getTrend(product.avg_price) === "up" ? "↑" : getTrend(product.avg_price) === "down" ? "↓" : "→"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        <Link href="/admin/orders" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      {orders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Order</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Customer</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-4">
                    <span className="font-mono text-sm text-gray-600">{order.id.slice(0, 8)}</span>
                  </td>
                  <td className="py-4 text-gray-900">{order.customer_name || "Guest"}</td>
                  <td className="py-4 text-right font-medium text-gray-900">${order.subtotal.toFixed(2)}</td>
                  <td className="py-4 text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === "completed" ? "bg-green-100 text-green-700" :
                      order.status === "preparing" ? "bg-yellow-100 text-yellow-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-gray-500">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400 text-center py-8">No orders yet</p>
      )}
    </div>
  );
}

interface CustomerGrowthChartProps {
  data: CustomerGrowth;
}

function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  const growthPercent = data.growth_rate || 0;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (Math.abs(growthPercent) / 100) * circumference;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Growth</h2>
      <div className="h-48 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle 
              cx="64" cy="64" r="56" fill="none" 
              stroke="#10b981" strokeWidth="12" 
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {growthPercent > 0 ? "+" : ""}{growthPercent}%
            </span>
            <span className="text-sm text-gray-500">vs last month</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{data.total_customers}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">+{data.new_this_month}</p>
          <p className="text-sm text-gray-500">New</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-600">{data.retention_rate}%</p>
          <p className="text-sm text-gray-500">Retention</p>
        </div>
      </div>
    </div>
  );
}

interface ConversionFunnelProps {
  data: ConversionFunnel[];
}

function ConversionFunnel({ data }: ConversionFunnelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
      {data.length > 0 ? (
        <div className="space-y-4">
          {data.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600">{step.stage}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-lg transition-all duration-500"
                  style={{ width: `${Math.max(step.rate, 2)}%` }}
                />
              </div>
              <div className="w-24 text-right">
                <span className="font-medium text-gray-900">{step.count.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-1">({step.rate}%)</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-8">No funnel data available</p>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({ brandId }: { brandId?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    total_revenue: 0,
    revenue_change: 0,
    total_orders: 0,
    orders_change: 0,
    active_customers: 0,
    customers_change: 0,
    avg_order_value: 0,
    aov_change: 0,
  });
  
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowth>({
    total_customers: 0,
    new_this_month: 0,
    retention_rate: 0,
    growth_rate: 0,
  });
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        metricsData,
        revenueChartData,
        productsData,
        ordersData,
        growthData,
        funnelData,
      ] = await Promise.all([
        getAnalyticsMetrics(30),
        getRevenueChart(30),
        getTopProducts(5),
        getRecentOrders(10),
        getCustomerGrowth(),
        getConversionFunnel(),
      ]);

      setMetrics(metricsData);
      setRevenueData(revenueChartData);
      setTopProducts(productsData);
      setRecentOrders(ordersData);
      setCustomerGrowth(growthData);
      setConversionFunnel(funnelData);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    analytics.featureUsed("analytics_dashboard", { brand_id: brandId });
    // Wrap in requestAnimationFrame to avoid sync setState
    requestAnimationFrame(() => {
      fetchAllData();
    });
  }, [brandId, fetchAllData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Track your business performance and growth</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllData}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${metrics.total_revenue.toLocaleString()}`}
          change={metrics.revenue_change}
          trend={metrics.revenue_change >= 0 ? "up" : "down"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Orders"
          value={metrics.total_orders.toLocaleString()}
          change={metrics.orders_change}
          trend={metrics.orders_change >= 0 ? "up" : "down"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <MetricCard
          title="Customers"
          value={metrics.active_customers.toLocaleString()}
          change={metrics.customers_change}
          trend={metrics.customers_change >= 0 ? "up" : "down"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg. Order Value"
          value={`$${metrics.avg_order_value.toFixed(2)}`}
          change={metrics.aov_change}
          trend={metrics.aov_change >= 0 ? "up" : "down"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart
            data={revenueData}
            totalRevenue={metrics.total_revenue}
            avgOrder={metrics.avg_order_value}
          />
        </div>
        <CustomerGrowthChart data={customerGrowth} />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsTable products={topProducts} />
        <RecentOrdersTable orders={recentOrders} />
      </div>

      {/* Funnel */}
      <ConversionFunnel data={conversionFunnel} />
    </div>
  );
}