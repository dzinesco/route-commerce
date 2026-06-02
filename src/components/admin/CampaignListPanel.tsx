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

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "marketing", label: "Marketing" },
  { value: "transactional", label: "Transactional" },
];

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-stone-100 text-stone-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  sent: "bg-emerald-100 text-emerald-700",
  canceled: "bg-red-100 text-red-700",
};

const TYPE_COLORS: Record<CampaignType, string> = {
  operational: "bg-purple-100 text-purple-700",
  marketing: "bg-amber-100 text-amber-700",
  transactional: "bg-sky-100 text-sky-700",
};

// Icon components
const Icons = {
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
};

// New Campaign Modal
function NewCampaignModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  brandId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  brandId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState<CampaignType>("operational");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    setSaving(true);
    setError("");
    
    const result = await upsertCampaign({
      brand_id: brandId,
      name: name.trim(),
      subject: "",
      body_text: "",
      campaign_type: campaignType,
      status: "draft",
      audience_rules: { target: "all_customers" },
    });
    
    setSaving(false);
    
    if (!result.success) {
      setError(result.error ?? "Failed to create campaign");
      return;
    }
    
    setName("");
    setCampaignType("operational");
    onSuccess();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-[var(--admin-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              {Icons.mail("h-5 w-5 text-white")}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">New Campaign</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Create a new email campaign</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--admin-card-hover)] transition-colors"
          >
            {Icons.x("h-5 w-5 text-[var(--admin-text-muted)]")}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Campaign Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Weekly Pickup Reminder"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Campaign Type *
            </label>
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value as CampaignType)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--admin-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Campaign"}
            {!saving && Icons.arrowRight("h-4 w-4")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignListPanel({ initialCampaigns, brandId = "64294306-5f42-463d-a5e8-2ad6c81a96de" }: { initialCampaigns: Campaign[], brandId?: string }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [filterType, setFilterType] = useState<CampaignType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "all">("all");
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = campaigns.filter((c) => {
    if (filterType !== "all" && c.campaign_type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6">
      <NewCampaignModal 
        isOpen={showNewModal} 
        onClose={() => setShowNewModal(false)} 
        onSuccess={() => {
          setShowNewModal(false);
          router.refresh();
        }}
        brandId={brandId}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-text-primary)]">
            {Icons.mail("w-4 h-4 text-[var(--admin-bg)]")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Campaigns</h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">{filtered.length} campaign{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          {Icons.plus("h-3.5 w-3.5 sm:h-4 sm:w-4")}
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="text-xs sm:text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 bg-white text-[var(--admin-text-primary)]"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CampaignType | "all")}
        >
          <option value="all">All Types</option>
          {CAMPAIGN_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          className="text-xs sm:text-sm border border-[var(--admin-border)] rounded-lg px-3 py-2 bg-white text-[var(--admin-text-primary)]"
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--admin-text-muted)]">
          No campaigns found
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-[var(--admin-card)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Name</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Type</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Status</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Created</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Sent</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filtered.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-[var(--admin-card-hover)] cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/communications/campaigns/${c.id}`)}
                >
                  <td className="px-3 sm:px-4 py-3 font-medium text-[var(--admin-text-primary)]">{c.name}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${TYPE_COLORS[c.campaign_type]}`}>
                      {c.campaign_type}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)]">{formatDate(new Date(c.created_at))}</td>
                  <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)]">{c.sent_at ? formatDate(new Date(c.sent_at)) : "—"}</td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    {Icons.arrowRight("h-4 w-4 text-[var(--admin-text-muted)]")}
                  </td>
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
  }, [brandId]);

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
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-text-primary)]">
            {Icons.mail("w-4 h-4 text-[var(--admin-bg)]")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">
              {mode === "new" ? "New Campaign" : "Edit Campaign"}
            </h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
              {mode === "new" ? "Create a new email campaign" : "Update campaign settings"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {/* Basic info */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Basic Info</h3>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Campaign Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
              placeholder="e.g. Tuxedo Stop 5/15 Reminder"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Campaign Type *</label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Template</label>
              <select
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  const t = templates.find((t) => t.id === e.target.value);
                  if (t) applyTemplate(t);
                }}
                className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
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
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Audience</h3>
            {segments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Saved segment:</span>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => applySegment(e.target.value)}
                  className="text-xs sm:text-sm border border-[var(--admin-border)] rounded-lg px-3 py-1.5 bg-white"
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
            <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Target By</label>
            <select
              value={audienceTarget}
              onChange={(e) => {
                setAudienceTarget(e.target.value);
                setSelectedSegmentId("");
              }}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
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
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Stop ID</label>
                <input
                  type="text"
                  value={stopId}
                  onChange={(e) => setStopId(e.target.value)}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                  placeholder="UUID"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={loadPreview}
            disabled={previewLoading}
            className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            {previewLoading ? "Counting..." : "Preview audience count"}
          </button>
          {preview && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm">
              <span className="font-semibold text-emerald-700">{preview.count}</span> customers match this audience
              {preview.sample_customers.length > 0 && (
                <div className="mt-2 text-xs text-emerald-600">
                  Sample: {preview.sample_customers.slice(0, 5).map((c) => c.email).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Message Content</h3>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Body (Plain Text)</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={6}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
              placeholder="Message content..."
            />
          </div>
        </div>

        {/* Scheduling */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Scheduling</h3>
          <div className="flex items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="radio"
                checked={scheduleMode === "now"}
                onChange={() => setScheduleMode("now")}
                className="text-emerald-600"
              />
              <span className="text-[var(--admin-text-primary)]">Send immediately</span>
            </label>
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              <input
                type="radio"
                checked={scheduleMode === "later"}
                onChange={() => setScheduleMode("later")}
                className="text-emerald-600"
              />
              <span className="text-[var(--admin-text-primary)]">Schedule for later</span>
            </label>
          </div>
          {scheduleMode === "later" && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Send date & time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
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
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : scheduleMode === "later" ? "Schedule Campaign" : "Save Draft"}
          </button>
          {campaign?.id && campaign.status === "draft" && scheduleMode === "now" && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center rounded-lg bg-emerald-700 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Send Campaign"}
            </button>
          )}
          {campaign?.id && scheduleMode === "later" && (
            <span className="text-xs sm:text-sm text-emerald-600 font-medium">
              Scheduled for {scheduledAt ? new Date(scheduledAt).toLocaleString() : "—"}
            </span>
          )}
          <a href="/admin/communications" className="text-xs sm:text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] ml-4">
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}