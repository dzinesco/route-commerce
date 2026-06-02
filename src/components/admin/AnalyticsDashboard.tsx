// Admin Analytics Dashboard - Real metrics and business insights

"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";
import { analytics } from "@/lib/analytics";
import { useToast } from "@/components/providers/ErrorBoundary";

// Mock data for demonstration - replace with real API calls
const mockMetrics = {
  revenue: {
    value: 45230,
    change: 12.5,
    trend: "up",
  },
  orders: {
    value: 847,
    change: 8.2,
    trend: "up",
  },
  customers: {
    value: 1254,
    change: 15.3,
    trend: "up",
  },
  conversionRate: {
    value: 3.4,
    change: 0.5,
    trend: "up",
  },
};

const mockChartData = [
  { date: "2024-01", revenue: 32000, orders: 580 },
  { date: "2024-02", revenue: 35000, orders: 620 },
  { date: "2024-03", revenue: 38000, orders: 680 },
  { date: "2024-04", revenue: 42000, orders: 750 },
  { date: "2024-05", revenue: 45230, orders: 847 },
];

const mockTopProducts = [
  { name: "Honeycrisp Apples", sales: 245, revenue: 978.55, trend: "up" },
  { name: "Valencia Oranges", sales: 198, revenue: 592.02, trend: "up" },
  { name: "Mixed Citrus Box", sales: 156, revenue: 8578.44, trend: "down" },
  { name: "Gala Apples", sales: 142, revenue: 495.58, trend: "up" },
  { name: "Navel Oranges", sales: 134, revenue: 440.86, trend: "stable" },
];

const mockRecentOrders = [
  { id: "ORD-001", customer: "John Smith", amount: 89.55, status: "completed", date: new Date() },
  { id: "ORD-002", customer: "Sarah Jones", amount: 156.78, status: "preparing", date: new Date() },
  { id: "ORD-003", customer: "Mike Wilson", amount: 45.32, status: "pending", date: new Date() },
  { id: "ORD-004", customer: "Emily Brown", amount: 234.50, status: "completed", date: new Date() },
];

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

function RevenueChart() {
  const [chartData, setChartData] = useState(mockChartData);
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg">7D</button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">30D</button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">90D</button>
          <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">1Y</button>
        </div>
      </div>
      <div className="h-64 flex items-end justify-between gap-4">
        {chartData.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-primary/20 to-primary rounded-t-lg transition-all hover:from-primary/30"
              style={{ height: `${(item.revenue / 50000) * 100}%` }}
            />
            <span className="text-xs text-gray-500 mt-2">{item.date}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-500">Total Revenue</span>
          <p className="text-xl font-bold text-gray-900">$192,230</p>
        </div>
        <div className="text-right">
          <span className="text-gray-500">Avg. Order</span>
          <p className="text-xl font-bold text-gray-900">$53.40</p>
        </div>
      </div>
    </div>
  );
}

function TopProductsTable() {
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
            {mockTopProducts.map((product, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🍎</span>
                    </div>
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                </td>
                <td className="py-4 text-right text-gray-600">{product.sales}</td>
                <td className="py-4 text-right font-medium text-gray-900">${product.revenue.toFixed(2)}</td>
                <td className="py-4 text-right">
                  <span className={`inline-flex items-center gap-1 text-sm ${
                    product.trend === "up" ? "text-green-600" : 
                    product.trend === "down" ? "text-red-600" : "text-gray-600"
                  }`}>
                    {product.trend === "up" ? "↑" : product.trend === "down" ? "↓" : "→"}
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

function RecentOrdersTable() {
  const { addToast } = useToast();
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        <button 
          onClick={() => addToast({ type: "info", message: "Navigating to orders..." })}
          className="text-sm text-primary hover:underline"
        >
          View all →
        </button>
      </div>
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
            {mockRecentOrders.map((order, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-4">
                  <span className="font-mono text-sm text-gray-600">{order.id}</span>
                </td>
                <td className="py-4 text-gray-900">{order.customer}</td>
                <td className="py-4 text-right font-medium text-gray-900">${order.amount.toFixed(2)}</td>
                <td className="py-4 text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    order.status === "completed" ? "bg-green-100 text-green-700" :
                    order.status === "preparing" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-4 text-right text-gray-500">{formatDate(order.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerGrowthChart() {
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
              strokeDasharray="352"
              strokeDashoffset="70"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">+15.3%</span>
            <span className="text-sm text-gray-500">vs last month</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">1,254</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">+156</p>
          <p className="text-sm text-gray-500">New</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-600">87%</p>
          <p className="text-sm text-gray-500">Retention</p>
        </div>
      </div>
    </div>
  );
}

function ConversionFunnel() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
      <div className="space-y-4">
        {[
          { stage: "Visitors", count: 24890, rate: 100 },
          { stage: "Product Views", count: 8920, rate: 35.8 },
          { stage: "Add to Cart", count: 3245, rate: 13.0 },
          { stage: "Checkout", count: 1245, rate: 5.0 },
          { stage: "Purchase", count: 847, rate: 3.4 },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-600">{step.stage}</div>
            <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-lg transition-all duration-500"
                style={{ width: `${step.rate}%` }}
              />
            </div>
            <div className="w-24 text-right">
              <span className="font-medium text-gray-900">{step.count.toLocaleString()}</span>
              <span className="text-sm text-gray-500 ml-1">({step.rate}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ brandId }: { brandId?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Track dashboard view
    analytics.featureUsed("analytics_dashboard", { brand_id: brandId });
    
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [brandId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90">
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${mockMetrics.revenue.value.toLocaleString()}`}
          change={mockMetrics.revenue.change}
          trend={mockMetrics.revenue.trend as "up" | "down" | "stable"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Orders"
          value={mockMetrics.orders.value.toLocaleString()}
          change={mockMetrics.orders.change}
          trend={mockMetrics.orders.trend as "up" | "down" | "stable"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <MetricCard
          title="Customers"
          value={mockMetrics.customers.value.toLocaleString()}
          change={mockMetrics.customers.change}
          trend={mockMetrics.customers.trend as "up" | "down" | "stable"}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Conversion Rate"
          value={`${mockMetrics.conversionRate.value}%`}
          change={mockMetrics.conversionRate.change}
          trend={mockMetrics.conversionRate.trend as "up" | "down" | "stable"}
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
          <RevenueChart />
        </div>
        <CustomerGrowthChart />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsTable />
        <RecentOrdersTable />
      </div>

      {/* Funnel */}
      <ConversionFunnel />
    </div>
  );
}