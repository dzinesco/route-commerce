"use client";

import { useState } from "react";

type Customer = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_complete: boolean;
};

type StopMessagingFormProps = {
  stopId: string;
};

const quickMessages = [
  { label: "Truck running late", value: "Heads up — the truck is running about 15 minutes behind schedule. Thanks for your patience!" },
  { label: "Stop moved", value: "Attention — today's stop location has changed to a new address. Please check the updated details." },
  { label: "Weather delay", value: "Due to weather conditions, today's stop may be delayed. We'll send updates as the day progresses." },
  { label: "Sold out", value: "This stop has sold out of several items. Check our website or next stop for availability." },
  { label: "Preorder cutoff reminder", value: "Friendly reminder — the preorder cutoff for our next stop is tonight at midnight. Order online to guarantee your pickup!" },
  { label: "Pickup reminder", value: "Reminder — you have an order ready for pickup today. See you soon!" },
];

export default function StopMessagingForm({ stopId }: StopMessagingFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email" | "both">("sms");
  const [message, setMessage] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function loadCustomers() {
    setLoading(true);
    setError(null);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?stop_id=eq.${stopId}&pickup_complete=eq.false&pickup_complete=eq.false&select=customer_name,customer_email,customer_phone,pickup_complete`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      setError(data.message);
    } else {
      setCustomers(data);
      setLoaded(true);
    }
    setLoading(false);
  }

  function useQuickMessage(msg: string) {
    setMessage(msg);
    setCustomMessage(msg);
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);

    const recipients = customers.filter((c) => {
      if (channel === "sms") return c.customer_phone;
      if (channel === "email") return c.customer_email;
      return c.customer_phone || c.customer_email;
    });

    // Call Supabase Edge Function to send messages
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-messages`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          message,
          recipients: recipients.map((r) => ({
            phone: r.customer_phone,
            email: r.customer_email,
            name: r.customer_name,
          })),
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      setError(err.message ?? "Failed to send messages");
      setSending(false);
      return;
    }

    setSent(recipients.length);
    setSending(false);
  }

  const recipients = customers.filter((c) => {
    if (channel === "sms") return c.customer_phone;
    if (channel === "email") return c.customer_email;
    return c.customer_phone || c.customer_email;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">
          Send Message
        </h2>
        <p className="mt-1 text-zinc-400">
          Notify all customers with pending pickups at this stop.
        </p>
      </div>

      {!loaded ? (
        <button
          onClick={loadCustomers}
          disabled={loading}
          className="w-full rounded-xl border-2 border-dashed border-zinc-600 px-6 py-4 text-lg font-medium text-zinc-500 disabled:opacity-50"
        >
          {loading ? "Loading customers..." : "Load Pending Customers"}
        </button>
      ) : (
        <>
          {customers.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-zinc-500">
              No pending orders for this stop yet.
            </div>
          ) : (
            <div className="rounded-xl bg-green-900/30 p-4 text-sm text-green-400">
              {customers.length} pending order{customers.length !== 1 ? "s" : ""} found
              {recipients.length !== customers.length && (
                <span> — {recipients.length} with contact info</span>
              )}
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Send via
            </label>
            <div className="flex gap-3">
              {(["sms", "email", "both"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
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

          {/* Quick messages */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Quick messages
            </label>
            <div className="flex flex-wrap gap-2">
              {quickMessages.map((qm) => (
                <button
                  key={qm.label}
                  onClick={() => useQuickMessage(qm.value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    message === qm.value
                      ? "bg-slate-900 text-white"
                      : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
                  }`}
                >
                  {qm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message preview */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setCustomMessage(e.target.value);
              }}
              rows={4}
              className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-base outline-none focus:border-slate-900"
              placeholder="Type your message..."
            />
            <p className="mt-1 text-xs text-slate-400">
              {message.length} characters
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-900/30 p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {sent > 0 && (
            <div className="rounded-xl bg-green-900/30 p-4 text-green-400 text-sm">
              Message sent to {sent} customer{sent !== 1 ? "s" : ""}!
            </div>
          )}

          {/* Recipients */}
          {recipients.length > 0 && message && (
            <div className="rounded-xl border border-zinc-800 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-300">
                Recipients ({recipients.length}):
              </p>
              <div className="space-y-2">
                {recipients.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{c.customer_name}</span>
                    <span className="text-slate-400">
                      {c.customer_phone ?? c.customer_email ?? "no contact"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!message || recipients.length === 0 || sending}
            className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {sending
              ? "Sending..."
              : `Send to ${recipients.length} customer${recipients.length !== 1 ? "s" : ""}`}
          </button>
        </>
      )}
    </div>
  );
}