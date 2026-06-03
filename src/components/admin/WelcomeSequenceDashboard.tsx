"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useCallback, useEffect } from "react";
import { getWelcomeSequence, resendWelcomeEmail, type WelcomeSequenceEntry } from "@/actions/email-automation/welcome-sequence";

type Props = { brandId: string };

const STATUS_LABELS: Record<string, { en: string; color: string }> = {
  active: { en: "Active", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { en: "Completed", color: "bg-green-50 text-green-700 border border-green-200" },
  unsubscribed: { en: "Unsubscribed", color: "bg-red-50 text-red-700 border border-red-200" },
  bounced: { en: "Bounced", color: "bg-amber-50 text-amber-700 border border-amber-200" },
};

const STEP_LABELS: Record<number, string> = {
  0: "Enrolled",
  1: "Welcome (1h)",
  2: "How it works (24h)",
  3: "First order (48h)",
  4: "Final (72h)",
};

export default function WelcomeSequenceDashboard({ brandId }: Props) {
  const [entries, setEntries] = useState<WelcomeSequenceEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [resending, setResending] = useState<string | null>(null);

  const handleResend = async (entryId: string) => {
    setResending(entryId);
    await resendWelcomeEmail(entryId, brandId);
    await load();
    setResending(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getWelcomeSequence(brandId);
    if (result.success) {
      setEntries(result.entries);
      setStats(result.stats);
    }
    setLoading(false);
  }, [brandId]);

  useEffect(() => { setPage(0); }, [filter]);

  const filtered = entries.filter(e => {
    if (filter === "active") return e.status === "active";
    if (filter === "completed") return e.status === "completed";
    return true;
  });

  const paginatedEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-[var(--admin-text-primary)]" },
          { label: "Active", value: stats.active, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Unsubscribed", value: stats.unsubscribed, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--admin-border)] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh + pagination */}
      <div className="flex items-center gap-3">
        <button onClick={load} disabled={loading}
          className="text-xs font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent)]/80 transition-colors">
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
        <div className="flex gap-2 ml-auto">
          {(["all", "active", "completed"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-[var(--admin-accent)] text-white" : "bg-stone-100 text-[var(--admin-text-secondary)] hover:bg-stone-200"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-[var(--admin-text-muted)] px-1">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[var(--admin-border)] rounded-2xl py-16 text-center">
          <p className="text-[var(--admin-text-muted)] text-sm">No entries{filter !== "all" ? ` (${filter})` : ""}</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--admin-border)] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--admin-text-muted)] uppercase tracking-widest border-b border-[var(--admin-border)]">
                <th className="text-left px-5 py-3 font-medium">Contact</th>
                <th className="text-left px-5 py-3 font-medium">Language</th>
                <th className="text-left px-5 py-3 font-medium">Step</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Enrolled</th>
                <th className="text-left px-5 py-3 font-medium">Last Email</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map(e => {
                const meta = STATUS_LABELS[e.status] ?? { en: e.status, color: "bg-stone-100 text-stone-500 border border-stone-200" };
                return (
                  <tr key={e.id} className="border-t border-[var(--admin-border)] hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-[var(--admin-text-primary)] font-medium text-sm">{e.contact_name ?? "—"}</p>
                        <p className="text-[var(--admin-text-muted)] text-xs">{e.contact_email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-[var(--admin-text-muted)] uppercase">{e.locale}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--admin-text-muted)]">
                      {STEP_LABELS[e.sequence_step] ?? e.sequence_step}
                      {e.next_email_at && e.status === "active" && (
                        <span className="block text-[var(--admin-text-muted)] text-[10px]">Next: {new Date(e.next_email_at).toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                        {meta.en}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--admin-text-muted)] text-xs">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-[var(--admin-text-muted)] text-xs">
                      {e.last_email_sent_at ? new Date(e.last_email_sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {e.status !== "unsubscribed" && (
                        <button onClick={() => handleResend(e.id)} disabled={resending === e.id}
                          className="text-xs text-[var(--admin-accent)] hover:text-[var(--admin-accent)]/80 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">
                          {resending === e.id ? "..." : "Resend"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}