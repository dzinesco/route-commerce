"use client";

import { useState } from "react";
import { type CampaignAnalytics } from "@/actions/harvest-reach/campaigns";
import { AdminEmptyState } from "@/components/admin/design-system";

type Props = {
  analytics: CampaignAnalytics[];
};

type Period = "7" | "30" | "90" | "all";

// Rate bar visualization
function RateBar({ value, color = "bg-emerald-500", label }: { value: number; color?: string; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500">{label}</span>
          <span className="font-semibold text-[var(--admin-text-primary)]">{value.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  trendUp
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4 sm:p-5 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full" />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] sm:text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--admin-text-primary)] mt-1.5">{value}</p>
          {sub && <p className="text-[10px] sm:text-xs text-stone-400 mt-1">{sub}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              trendUp ? "text-emerald-600" : "text-red-500"
            }`}>
              <svg className={`w-3 h-3 ${trendUp ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {trend}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent-light)] text-[var(--admin-accent)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Mini sparkline visualization
function MiniSparkline({ data, color = "var(--admin-accent)" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="w-full h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Engagement badge
function EngagementBadge({ rate }: { rate: number }) {
  let color = "bg-stone-100 text-stone-500";
  let label = "Low";
  
  if (rate >= 40) {
    color = "bg-emerald-100 text-emerald-700";
    label = "High";
  } else if (rate >= 20) {
    color = "bg-amber-100 text-amber-700";
    label = "Medium";
  }
  
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// Date formatter
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Icon components
const Icons = {
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  send: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  click: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
    </svg>
  ),
  eye: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  alert: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  calendar: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

export default function AnalyticsDashboard({ analytics }: Props) {
  const [period, setPeriod] = useState<Period>("30");

  // Filter analytics by period
  const filteredAnalytics = analytics.filter((a) => {
    if (period === "all") return true;
    const days = parseInt(period);
    if (!a.sent_at) return true;
    const sentDate = new Date(a.sent_at);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return sentDate >= cutoff;
  });

  // Calculate totals
  const totalSent = filteredAnalytics.reduce((s, a) => s + a.total_sent, 0);
  const totalDelivered = filteredAnalytics.reduce((s, a) => s + a.total_delivered, 0);
  const totalOpened = filteredAnalytics.reduce((s, a) => s + a.total_opened, 0);
  const totalClicked = filteredAnalytics.reduce((s, a) => s + a.total_clicked, 0);
  const totalBounced = filteredAnalytics.reduce((s, a) => s + a.total_bounced, 0);

  // Calculate rates
  const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
  const avgBounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

  // Generate sparkline data from analytics
  const openRateSparkline = filteredAnalytics.map((a) => Number(a.open_rate));
  const clickRateSparkline = filteredAnalytics.map((a) => Number(a.click_rate));

  // Campaign count
  const campaignCount = filteredAnalytics.length;

  // Best performing campaign
  const bestCampaign = [...filteredAnalytics].sort((a, b) => Number(b.open_rate) - Number(a.open_rate))[0];

  const emptyStateIcon = Icons.chart("w-10 h-10");

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            {Icons.chart("h-6 w-6 text-white")}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--admin-text-primary)]">Campaign Analytics</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">Track your email performance and engagement</p>
          </div>
        </div>
        
        {/* Period selector */}
        <div className="flex rounded-xl border border-[var(--admin-border)] bg-stone-50 p-1">
          {(["7", "30", "90", "all"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setPeriod(val as Period)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                period === val
                  ? "bg-white text-[var(--admin-text-primary)] shadow-sm"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]"
              }`}
            >
              {val === "all" ? "All time" : `${val} days`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Sent"
          value={totalSent.toLocaleString()}
          sub={`${campaignCount} campaign${campaignCount !== 1 ? "s" : ""}`}
          icon={Icons.send("w-5 h-5")}
          trend={campaignCount > 0 ? `${campaignCount}` : undefined}
          trendUp={true}
        />
        <StatCard
          label="Delivered"
          value={totalSent > 0 ? `${Math.round((totalDelivered / totalSent) * 100)}%` : "—"}
          sub={totalDelivered > 0 ? `${totalDelivered.toLocaleString()} messages` : undefined}
          icon={Icons.mail("w-5 h-5")}
        />
        <StatCard
          label="Avg. Open Rate"
          value={totalSent > 0 ? `${avgOpenRate.toFixed(1)}%` : "—"}
          sub={bestCampaign ? `Best: ${bestCampaign.campaign_name}` : "Industry avg: 21%"}
          icon={Icons.eye("w-5 h-5")}
        />
        <StatCard
          label="Avg. Click Rate"
          value={totalSent > 0 ? `${avgClickRate.toFixed(1)}%` : "—"}
          sub={totalClicked > 0 ? `${totalClicked.toLocaleString()} clicks` : undefined}
          icon={Icons.click("w-5 h-5")}
        />
      </div>

      {/* Performance trends (if we have multiple campaigns) */}
      {filteredAnalytics.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Open Rate Trend</h3>
              <span className="text-xs font-semibold text-emerald-600">{avgOpenRate.toFixed(1)}% avg</span>
            </div>
            <MiniSparkline data={openRateSparkline} color="#10b981" />
          </div>
          <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Click Rate Trend</h3>
              <span className="text-xs font-semibold text-amber-600">{avgClickRate.toFixed(1)}% avg</span>
            </div>
            <MiniSparkline data={clickRateSparkline} color="#f59e0b" />
          </div>
        </div>
      )}

      {/* Campaign performance table */}
      <div className="bg-white rounded-xl border border-[var(--admin-border)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Campaign Performance</h3>
            {filteredAnalytics.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                {filteredAnalytics.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Open rate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Click rate
            </span>
          </div>
        </div>

        {filteredAnalytics.length === 0 ? (
          <AdminEmptyState
            icon={emptyStateIcon}
            title="No campaign analytics yet"
            description="Send a campaign to start tracking your email engagement and performance metrics."
            action={
              <div className="flex items-center gap-2 text-sm text-stone-500">
                {Icons.calendar("w-4 h-4")}
                <span>Analytics will appear after your first campaign is sent</span>
              </div>
            }
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-[var(--admin-border)]">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Campaign</th>
                  <th className="text-right px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Sent</th>
                  <th className="text-right px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Delivered</th>
                  <th className="text-right px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Opened</th>
                  <th className="text-right px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Clicked</th>
                  <th className="text-right px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Bounced</th>
                  <th className="text-left px-4 sm:px-6 py-3.5 font-semibold text-[var(--admin-text-muted)] text-xs uppercase tracking-wider">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {filteredAnalytics.map((a) => (
                  <tr key={a.campaign_id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--admin-text-primary)]">{a.campaign_name}</span>
                        <span className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                          {Icons.calendar("w-3 h-3")}
                          {formatDate(a.sent_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <span className="font-semibold text-[var(--admin-text-primary)]">{a.total_sent.toLocaleString()}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-[var(--admin-text-primary)]">{a.total_delivered.toLocaleString()}</span>
                        <span className="text-xs text-stone-400">({a.delivered_rate}%)</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-[var(--admin-text-primary)]">{a.total_opened.toLocaleString()}</span>
                        <span className="text-xs text-emerald-600 font-medium">{a.open_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-[var(--admin-text-primary)]">{a.total_clicked.toLocaleString()}</span>
                        <span className="text-xs text-amber-600 font-medium">{a.click_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-semibold ${a.total_bounced > 0 ? "text-red-500" : "text-stone-400"}`}>
                          {a.total_bounced.toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-400">({a.bounce_rate}%)</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 w-40">
                      <div className="flex flex-col gap-2.5">
                        <RateBar value={Number(a.open_rate)} color="bg-emerald-500" />
                        <RateBar value={Number(a.click_rate)} color="bg-amber-500" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary footer */}
      {filteredAnalytics.length > 0 && (
        <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-[var(--admin-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[var(--admin-text-muted)]">Overall bounce rate:</span>
              <span className={`font-semibold ${avgBounceRate > 2 ? "text-red-500" : "text-emerald-600"}`}>
                {avgBounceRate.toFixed(2)}%
              </span>
            </div>
            {avgBounceRate > 2 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                {Icons.alert("w-4 h-4")}
                <span className="text-xs">High bounce rate - consider cleaning your list</span>
              </div>
            )}
          </div>
          <div className="text-xs text-stone-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
}