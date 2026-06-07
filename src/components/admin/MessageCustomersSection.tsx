"use client";

import { useState, useEffect } from "react";
import { sendStopBlast } from "@/actions/communications/stop-blast";
import {
  getStopMessagingData,
  type StopOrder,
  type StopBlastMessage,
} from "@/actions/communications/stop-messaging";

type MessageCustomersSectionProps = {
  stopId: string;
  brandId?: string;
};

export default function MessageCustomersSection({
  stopId,
  brandId,
}: MessageCustomersSectionProps) {
  const [orders, setOrders] = useState<StopOrder[]>([]);
  const [messages, setMessages] = useState<StopBlastMessage[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const [audience, setAudience] = useState<"all" | "pending" | "picked_up">("pending");
  const [channel, setChannel] = useState<"sms" | "email" | "both">("sms");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStopMessagingData({ stopId, brandId })
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setOrders(res.orders);
          setMessages(res.messages);
        } else {
          setError(res.error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOrders(false);
          setLoadingMessages(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stopId, brandId]);

  const allOrders = orders;
  const pendingOrders = orders.filter((o) => !o.pickup_complete);
  const pickedUpOrders = orders.filter((o) => o.pickup_complete);

  const filteredOrders = (() => {
    if (audience === "pending") return pendingOrders;
    if (audience === "picked_up") return pickedUpOrders;
    return allOrders;
  })();

  const recipients = filteredOrders.filter((o) => {
    if (channel === "sms") return o.customer_phone;
    if (channel === "email") return o.customer_email;
    return o.customer_phone || o.customer_email;
  });

  const showSubject = channel === "email" || channel === "both";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (showSubject && !subject.trim()) {
      setError("Subject is required for email or both.");
      return;
    }
    if (!brandId) {
      setError("Brand ID not available.");
      return;
    }

    setSending(true);
    setError(null);
    setConfirm(null);

    const result = await sendStopBlast({
      stopId,
      brandId,
      channel,
      subject: showSubject ? subject : undefined,
      body,
      audience,
    });

    setSending(false);
    if (!result.success) {
      setError(result.error ?? "Failed to send blast");
      return;
    }
    setConfirm(`Blast sent — ${result.messages_logged} message${result.messages_logged !== 1 ? "s" : ""} logged via campaign.`);
    setBody("");
    setSubject("");

    // Refresh the message log
    setLoadingMessages(true);
    const res = await getStopMessagingData({ stopId, brandId });
    setLoadingMessages(false);
    if (res.success) setMessages(res.messages);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {confirm && (
        <div className="rounded-xl bg-green-900/30 p-4 text-sm text-green-400">
          {confirm}
        </div>
      )}

      {loadingOrders ? (
        <p className="text-sm text-zinc-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-zinc-500">No orders for this stop yet.</p>
      ) : (
        <>
          {/* Audience selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Audience —{" "}
              <span className="text-zinc-500">
                {recipients.length} with contact info
              </span>
            </label>
            <div className="flex gap-2">
              {(["all", "pending", "picked_up"] as const).map((a) => {
                const count =
                  a === "all"
                    ? allOrders.length
                    : a === "pending"
                    ? pendingOrders.length
                    : pickedUpOrders.length;
                return (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      audience === a
                        ? "bg-slate-900 text-white"
                        : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
                    }`}
                  >
                    {a.replace("_", " ")} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Channel
            </label>
            <div className="flex gap-2">
              {(["sms", "email", "both"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    channel === ch
                      ? "bg-slate-900 text-white"
                      : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
                  }`}
                >
                  {ch === "sms" ? "📱 SMS" : ch === "email" ? "✉️ Email" : "📱+✉️ Both"}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {showSubject && (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Important update about your pickup"
                  className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
                placeholder="Type your message here..."
              />
              <p className="mt-1 text-xs text-slate-400">{body.length} characters</p>
            </div>

            <button
              type="submit"
              disabled={!body.trim() || recipients.length === 0 || sending}
              className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
            >
              {sending
                ? "Sending..."
                : `Send to ${recipients.length} customer${recipients.length !== 1 ? "s" : ""}`}
            </button>
          </form>
        </>
      )}

      {/* Recent message history */}
      {!loadingMessages && messages.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium text-zinc-300">
            Recent Messages
          </p>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl border border-zinc-800 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-100">
                      {msg.type.toUpperCase()}{" "}
                      {msg.subject && <span className="text-zinc-500">— {msg.subject}</span>}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-400">{msg.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(msg.created_at).toLocaleString()} ·{" "}
                      {msg.message_recipients?.length ?? 0} recipients
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
