"use client";

import { useState } from "react";
import { type CampaignAnalytics } from "@/actions/harvest-reach/campaigns";

type Props = {
  analytics: CampaignAnalytics[];
};

type Period = "30" | "90" | "all";

function RateBar({ value, color = "bg-emerald-500" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-stone-100 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-[var(--admin-text-primary)] mt-1.5">{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard({ analytics }: Props) {
  const [period, setPeriod] = useState<Period>("30");

  const totalSent = analytics.reduce((s, a) => s + a.total_sent, 0);
  const totalDelivered = analytics.reduce((s, a) => s + a.total_delivered, 0);
  const totalOpened = analytics.reduce((s, a) => s + a.total_opened, 0);
  const totalClicked = analytics.reduce((s, a) => s + a.total_clicked, 0);

  const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Campaign Analytics</h2>
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Track your campaign performance</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Sent" value={totalSent.toLocaleString()} sub={`${analytics.length} campaign${analytics.length !== 1 ? "s" : ""}`} />
        <StatCard
          label="Delivered"
          value={totalSent > 0 ? `${Math.round((totalDelivered / totalSent) * 100)}%` : "—"}
          sub={totalDelivered > 0 ? `${totalDelivered.toLocaleString()} messages` : undefined}
        />
        <StatCard label="Avg. Open Rate" value={totalSent > 0 ? `${avgOpenRate.toFixed(1)}%` : "—"} sub="of delivered" />
        <StatCard label="Avg. Click Rate" value={totalSent > 0 ? `${avgClickRate.toFixed(1)}%` : "—"} sub="of delivered" />
      </div>

      {/* Campaign performance table */}
      <div className="bg-white rounded-xl border border-[var(--admin-border)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--admin-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Campaign Performance</h3>
          <div className="flex rounded-lg border border-[var(--admin-border)] bg-stone-50 p-0.5">
            {(["30", "90", "all"] as const).map((val) => (
              <button
                key={val}
                onClick={() => setPeriod(val as Period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === val ? "bg-emerald-600 text-white" : "text-stone-500 hover:bg-white"
                }`}
              >
                {val === "30" ? "30 days" : val === "90" ? "90 days" : "All time"}
              </button>
            ))}
          </div>
        </div>

        {analytics.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-stone-100 mb-4">
              <svg className="h-8 w-8 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-stone-600">No campaign analytics yet</p>
            <p className="text-xs text-stone-400 mt-1">Send a campaign to start tracking engagement</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-[var(--admin-border)]">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Campaign</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Sent</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Delivered</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Opened</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Clicked</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Bounced</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {analytics.map((a) => (
                  <tr key={a.campaign_id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--admin-text-primary)]">{a.campaign_name}</span>
                        <span className="text-xs text-stone-400">
                          {a.sent_at ? new Date(a.sent_at).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right text-[var(--admin-text-primary)]">{a.total_sent.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <span className="text-[var(--admin-text-primary)]">{a.total_delivered.toLocaleString()}</span>
                      <span className="text-xs text-stone-400 ml-1">({a.delivered_rate}%)</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <span className="text-[var(--admin-text-primary)]">{a.total_opened.toLocaleString()}</span>
                      <span className="text-xs text-stone-400 ml-1">({a.open_rate}%)</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <span className="text-[var(--admin-text-primary)]">{a.total_clicked.toLocaleString()}</span>
                      <span className="text-xs text-stone-400 ml-1">({a.click_rate}%)</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-right">
                      <span className={a.total_bounced > 0 ? "text-red-600" : "text-stone-400"}>
                        {a.total_bounced.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-400 ml-1">({a.bounce_rate}%)</span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 w-36">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">Open</span>
                          <span className="font-medium text-[var(--admin-text-primary)]">{a.open_rate}%</span>
                        </div>
                        <RateBar value={Number(a.open_rate)} />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">Click</span>
                          <span className="font-medium text-[var(--admin-text-primary)]">{a.click_rate}%</span>
                        </div>
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
    </div>
  );
}