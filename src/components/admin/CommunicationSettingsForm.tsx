"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommunicationSettings } from "@/actions/communications/settings";
import { upsertCommunicationSettings } from "@/actions/communications/settings";
import { AdminButton } from "@/components/admin/design-system";
import { AdminInput, AdminTextInput, AdminTextarea } from "@/components/admin/design-system/AdminFormElements";

// Mail icon for the header
const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

// Check icon for success
const CheckIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// Warning icon for provider notice
const WarningIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-dark,var(--admin-accent))] text-white shadow-lg shadow-[var(--admin-accent)]/20">
          <MailIcon />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Sender Settings</h2>
          <p className="text-xs text-[var(--admin-text-muted)]">Configure the default sender identity for this brand&apos;s email campaigns</p>
        </div>
      </div>

      {/* Provider notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
          <WarningIcon />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800">Email Provider</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Provider (Resend) is configured via environment variables — no credentials stored here.
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
        {/* Form header */}
        <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-gradient-to-r from-[var(--admin-card)] to-[var(--admin-bg)]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--admin-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Email Identity</h3>
          </div>
        </div>

        {/* Form fields */}
        <div className="p-5 space-y-5">
          <AdminInput label="Default Sender Email" helpText="The email address recipients will see as the sender">
            <AdminTextInput
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="orders@yourbrand.com"
            />
          </AdminInput>

          <AdminInput label="Default Sender Name" helpText="The name displayed as the sender">
            <AdminTextInput
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Route Commerce"
            />
          </AdminInput>

          <AdminInput label="Reply-To Email" helpText="Emails will be replied to this address">
            <AdminTextInput
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="support@yourbrand.com"
            />
          </AdminInput>

          <AdminInput label="Email Footer HTML (optional)" helpText="Add {unsubscribe_url} as placeholder for automatic unsubscribe links">
            <AdminTextarea
              value={footerHtml}
              onChange={(e) => setFooterHtml(e.target.value)}
              rows={4}
              placeholder={"<p>Unsubscribe: <a href='...'>link</a></p>"}
            />
          </AdminInput>
        </div>

        {/* Form footer with actions */}
        <div className="px-5 py-4 border-t border-[var(--admin-border)] bg-gradient-to-r from-[var(--admin-bg)] to-[var(--admin-card)] flex items-center justify-between">
          <div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckIcon />
                <span>Settings saved successfully</span>
              </div>
            )}
          </div>
          <AdminButton
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}