"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Campaign, CampaignType, CampaignStatus, AudienceRules } from "@/actions/communications/campaigns";
import { formatDate } from "@/lib/format-date";
import type { Template } from "@/actions/communications/templates";
import type { AudiencePreviewResult } from "@/actions/communications/send";
import { previewCampaignAudience, sendCampaign } from "@/actions/communications/send";
import { upsertCampaign, deleteCampaign } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import { getCommunicationSegments, type Segment } from "@/actions/communications/segments";

const BRAND_ID = process.env.NEXT_PUBLIC_TUXEDO_BRAND_ID ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "marketing", label: "Marketing" },
  { value: "transactional", label: "Transactional" },
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-zinc-950 text-zinc-300",
  scheduled: "bg-blue-900/40 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-green-900/40 text-green-400",
  canceled: "bg-red-900/40 text-red-400",
};

export default function CampaignListPanel({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filterType, setFilterType] = useState<CampaignType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "all">("all");

  const filtered = campaigns.filter((c) => {
    if (filterType !== "all" && c.campaign_type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Campaigns</h2>
          <p className="text-sm text-zinc-500">{filtered.length} campaign{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <a
          href="/admin/communications/campaigns/new"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Campaign
        </a>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          className="text-sm border border-zinc-600 rounded-lg px-3 py-2"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CampaignType | "all")}
        >
          <option value="all">All Types</option>
          {CAMPAIGN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          className="text-sm border border-zinc-600 rounded-lg px-3 py-2"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CampaignStatus | "all")}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sent">Sent</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No campaigns found</div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Created</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800 cursor-pointer" onClick={() => router.push(`/admin/communications/campaigns/${c.id}`)}>
                  <td className="px-4 py-3 font-medium text-zinc-100">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.campaign_type === "operational" ? "bg-purple-100 text-purple-700" :
                      c.campaign_type === "marketing" ? "bg-orange-100 text-orange-700" :
                      "bg-zinc-950 text-zinc-400"
                    }`}>
                      {c.campaign_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(new Date(c.created_at))}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.sent_at ? formatDate(new Date(c.sent_at)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Campaign Edit Panel ──────────────────────────────────────────────────────

export function CampaignEditPanel({
  campaign,
  templates,
  mode,
  brandId,
}: {
  campaign?: Campaign;
  templates: Template[];
  mode: "edit" | "new";
  brandId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(campaign?.name ?? "");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [bodyText, setBodyText] = useState(campaign?.body_text ?? "");
  const [bodyHtml, setBodyHtml] = useState(campaign?.body_html ?? "");
  const [templateId, setTemplateId] = useState(campaign?.template_id ?? "");
  const [campaignType, setCampaignType] = useState<CampaignType>(campaign?.campaign_type ?? "operational");
  const [audienceTarget, setAudienceTarget] = useState<string>(campaign?.audience_rules?.target ?? "stop");
  const [stopId, setStopId] = useState(campaign?.audience_rules?.stop_id ?? "");
  const [dateFrom, setDateFrom] = useState(campaign?.audience_rules?.date_from ?? "");
  const [dateTo, setDateTo] = useState(campaign?.audience_rules?.date_to ?? "");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">(
    campaign?.scheduled_at ? "later" : "now"
  );
  const [scheduledAt, setScheduledAt] = useState(
    campaign?.scheduled_at
      ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
      : ""
  );
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [preview, setPreview] = useState<AudiencePreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved segments
  useEffect(() => {
    getCommunicationSegments(brandId).then((result) => {
      if (result.success) setSegments(result.segments);
    });
  }, []);

  // When a segment is selected, populate audience fields
  function applySegment(segmentId: string) {
    setSelectedSegmentId(segmentId);
    if (!segmentId) return;
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;
    const rules = seg.rules;
    if (rules.target) setAudienceTarget(rules.target);
    if (rules.stop_id) setStopId(rules.stop_id);
    if (rules.date_from) setDateFrom(rules.date_from);
    if (rules.date_to) setDateTo(rules.date_to);
  }

  const loadPreview = async () => {
    setPreviewLoading(true);
    const rules: AudienceRules = {
      target: audienceTarget as AudienceRules["target"],
      stop_id: stopId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    const result = await previewCampaignAudience(brandId, rules);
    setPreview(result);
    setPreviewLoading(false);
  };

  const applyTemplate = (t: Template) => {
    setSubject(t.subject);
    setBodyText(t.body_text);
    setBodyHtml(t.body_html ?? "");
    setCampaignType((t.campaign_type as CampaignType) ?? "operational");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const rules: AudienceRules = {
      target: audienceTarget as AudienceRules["target"],
      stop_id: stopId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };
    const effectiveScheduledAt =
      scheduleMode === "later" && scheduledAt
        ? new Date(scheduledAt).toISOString()
        : null;
    const result = await upsertCampaign({
      id: campaign?.id,
      brand_id: brandId,
      name,
      subject,
      body_text: bodyText,
      body_html: bodyHtml || undefined,
      template_id: templateId || undefined,
      campaign_type: campaignType,
      status: scheduleMode === "later" ? "scheduled" : (campaign?.status ?? "draft"),
      audience_rules: rules,
      scheduled_at: effectiveScheduledAt ?? undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
      return;
    }
    router.push("/admin/communications");
    router.refresh();
  };

  const handleSend = async () => {
    setSending(true);
    setError("");
    if (!campaign?.id) {
      setError("Save as draft first");
      setSending(false);
      return;
    }
    const result = await sendCampaign(campaign.id, brandId);
    setSending(false);
    if (!result.success) {
      setError(result.error ?? "Failed to send");
      return;
    }
    router.push("/admin/communications");
    router.refresh();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">
          {mode === "new" ? "New Campaign" : "Edit Campaign"}
        </h2>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Tuxedo Stop 5/15 Reminder"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Campaign Type *</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Template</label>
              <select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  const t = templates.find((t) => t.id === e.target.value);
                  if (t) applyTemplate(t);
                }}
                className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.template_type})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audience builder */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Audience</h3>
            {segments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Saved segment:</span>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => applySegment(e.target.value)}
                  className="text-sm border border-zinc-600 rounded-lg px-3 py-1.5"
                >
                  <option value="">— None —</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Target By</label>
            <select
              value={audienceTarget}
              onChange={(e) => {
                setAudienceTarget(e.target.value);
                setSelectedSegmentId("");
              }}
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="stop">Stop / Date Range</option>
              <option value="zip_code">ZIP Code</option>
              <option value="customer_history">Customer History</option>
              <option value="all_customers">All Customers</option>
            </select>
          </div>
          {audienceTarget === "stop" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Stop ID</label>
                <input
                  type="text"
                  value={stopId}
                  onChange={(e) => setStopId(e.target.value)}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  placeholder="UUID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={loadPreview}
            disabled={previewLoading}
            className="text-sm text-blue-400 hover:text-blue-700 font-medium"
          >
            {previewLoading ? "Counting..." : "Preview audience count"}
          </button>
          {preview && (
            <div className="rounded-lg bg-blue-900/30 border border-blue-200 px-4 py-3 text-sm">
              <span className="font-semibold text-blue-700">{preview.count}</span> customers match this audience
              {preview.sample_customers.length > 0 && (
                <div className="mt-2 text-xs text-blue-400">
                  Sample: {preview.sample_customers.slice(0, 5).map((c) => c.email).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Message Content</h3>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Body (Plain Text)</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={6}
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              placeholder="Message content..."
            />
          </div>
        </div>

        {/* Scheduling */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Scheduling</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
                className="text-blue-400"
              />
              <span className="text-zinc-300">Send immediately</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scheduleMode === "later"}
                onChange={() => setScheduleMode("later")}
                className="text-blue-400"
              />
              <span className="text-zinc-300">Schedule for later</span>
            </label>
          </div>
          {scheduleMode === "later" && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Send date & time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name || (scheduleMode === "later" && !scheduledAt)}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : scheduleMode === "later" ? "Schedule Campaign" : "Save Draft"}
          </button>
          {campaign?.id && campaign.status === "draft" && scheduleMode === "now" && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Campaign"}
            </button>
          )}
          {campaign?.id && scheduleMode === "later" && (
            <span className="text-sm text-blue-400 font-medium">
              Scheduled for {scheduledAt ? new Date(scheduledAt).toLocaleString() : "—"}
            </span>
          )}
          <a href="/admin/communications" className="text-sm text-zinc-500 hover:text-zinc-300 ml-4">
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}