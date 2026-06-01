"use client";

import { useState, useEffect } from "react";
import { getRecentWebhookActivity } from "@/actions/wholesale";

type WebhookLogEntry = {
  id: string;
  event_type: string;
  order_id: string | null;
  status: string;
  attempts: number;
  created_at: string;
  response: string | null;
};

type Props = {
  brandId: string;
};

const EVENT_LABELS: Record<string, string> = {
  order_created: "Order Created",
  order_fulfilled: "Order Fulfilled",
  deposit_recorded: "Deposit Recorded",
  order_paid: "Order Paid",
};

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-green-900/40 text-green-400",
  success: "bg-green-900/40 text-green-400",
  failed: "bg-red-900/40 text-red-400",
  pending: "bg-yellow-100 text-yellow-700",
  retrying: "bg-yellow-100 text-yellow-700",
};

export default function WebhookLogsSection({ brandId }: Props) {
  const [logs, setLogs] = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getRecentWebhookActivity(brandId, 25).then((entries) => {
      setLogs(entries);
      setLoading(false);
    });
  }, [brandId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-slate-50 p-4 text-sm text-zinc-500">
        Loading webhook logs…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-slate-50 p-4 text-sm text-zinc-500">
        No webhook events yet. Deposits, order updates, and fulfillments will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">
          Wholesale Webhook Events ({logs.length})
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="space-y-1.5">
        {(expanded ? logs : logs.slice(0, 5)).map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800">
                  {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[entry.status] ?? "bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {entry.status}
                </span>
                {entry.attempts > 1 && (
                  <span className="text-xs text-slate-400">
                    {entry.attempts} attempts
                  </span>
                )}
              </div>
              {entry.response && (
                <p className="mt-1 truncate text-xs text-zinc-500">{entry.response}</p>
              )}
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!expanded && logs.length > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Show {logs.length - 5} more…
        </button>
      )}
    </div>
  );
}
