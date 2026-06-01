"use client";

import { useState } from "react";
import { type CampaignAnalytics } from "@/actions/harvest-reach/campaigns";

type Props = {
  analytics: CampaignAnalytics[];
};

type Period = "30" | "90" | "all";

function RateBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-zinc-950 rounded-full h-1.5">
      <div
        className="bg-stone-900 h-1.5 rounded-full"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col gap-1.5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
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
    <div className="flex flex-col gap-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sent" value={totalSent.toLocaleString()} sub={`${analytics.length} campaign${analytics.length !== 1 ? "s" : ""}`} />
        <StatCard
          label="Delivered"
          value={totalSent > 0 ? `${Math.round((totalDelivered / totalSent) * 100)}%` : "—"}
          sub={totalDelivered > 0 ? `${totalDelivered.toLocaleString()} emails` : undefined}
        />
        <StatCard label="Avg. Open Rate" value={totalSent > 0 ? `${avgOpenRate.toFixed(1)}%` : "—"} sub="of delivered" />
        <StatCard label="Avg. Click Rate" value={totalSent > 0 ? `${avgClickRate.toFixed(1)}%` : "—"} sub="of delivered" />
      </div>

      {/* Campaign performance table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Campaign Performance</h3>
          <div className="flex rounded-lg border border-zinc-800 bg-slate-50 p-0.5">
            {(["30", "90", "all"] as const).map((val) => (
              <button
                key={val}
                onClick={() => setPeriod(val as Period)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === val ? "bg-stone-900 text-white" : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                {val === "30" ? "30 days" : val === "90" ? "90 days" : "All time"}
              </button>
            ))}
          </div>
        </div>

        {analytics.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-400">No campaign analytics yet.</p>
            <p className="text-xs text-slate-400 mt-1">Send a campaign to start tracking engagement.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-zinc-800">
              <tr>
                {["Campaign", "Sent", "Delivered", "Opened", "Clicked", "Bounced", "Engagement"].map((h) => (
                  <th key={h} className={`text-left px-6 py-3 font-medium text-zinc-400 ${h !== "Campaign" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.map((a) => (
                <tr key={a.campaign_id} className="hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{a.campaign_name}</span>
                      <span className="text-xs text-slate-400">
                        {a.sent_at ? new Date(a.sent_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right text-zinc-300">{a.total_sent.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-zinc-300">{a.total_delivered.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">({a.delivered_rate}%)</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-zinc-300">{a.total_opened.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">({a.open_rate}%)</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-zinc-300">{a.total_clicked.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">({a.click_rate}%)</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={a.total_bounced > 0 ? "text-red-400" : "text-slate-400"}>
                      {a.total_bounced.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">({a.bounce_rate}%)</span>
                  </td>
                  <td className="px-6 py-3.5 w-36">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Open</span>
                        <span className="font-medium text-zinc-300">{a.open_rate}%</span>
                      </div>
                      <RateBar value={Number(a.open_rate)} />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Click</span>
                        <span className="font-medium text-zinc-300">{a.click_rate}%</span>
                      </div>
                      <RateBar value={Number(a.click_rate)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}