"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommunicationSettings } from "@/actions/communications/settings";
import { upsertCommunicationSettings } from "@/actions/communications/settings";

const BRAND_ID = process.env.NEXT_PUBLIC_TUXEDO_BRAND_ID ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default function CommunicationSettingsForm({
  settings,
  brandId,
}: {
  settings: CommunicationSettings | null;
  brandId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [senderEmail, setSenderEmail] = useState(settings?.default_sender_email ?? "");
  const [senderName, setSenderName] = useState(settings?.default_sender_name ?? "");
  const [replyTo, setReplyTo] = useState(settings?.reply_to_email ?? "");
  const [footerHtml, setFooterHtml] = useState(settings?.email_footer_html ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    const result = await upsertCommunicationSettings({
      brand_id: brandId,
      sender_email: senderEmail,
      sender_name: senderName,
      reply_to_email: replyTo,
      provider: "resend",
      footer_html: footerHtml,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
      return;
    }
    setSuccess(true);
    router.refresh();
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">Sender Settings</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configure the default sender identity for this brand&apos;s email campaigns.
          Provider (Resend) is configured via environment variables — no credentials stored here.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-900/30 border border-green-200 px-4 py-3 text-sm text-green-400">
          Settings saved successfully.
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Default Sender Email</label>
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            placeholder="orders@tuxedocorn.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Default Sender Name</label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            placeholder="Route Commerce"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Reply-To Email</label>
          <input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            placeholder="support@tuxedocorn.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Email Footer HTML (optional)</label>
          <textarea
            value={footerHtml}
            onChange={(e) => setFooterHtml(e.target.value)}
            rows={3}
            className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm font-mono text-xs"
            placeholder="<p>Unsubscribe: <a href='...'>link</a></p>"
          />
          <p className="mt-1 text-xs text-slate-400">Include your unsubscribe link here. Add {`{unsubscribe_url}`} as placeholder.</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}