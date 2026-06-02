"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Template, TemplateType, CampaignType } from "@/actions/communications/templates";
import { formatDate } from "@/lib/format-date";
import { upsertTemplate } from "@/actions/communications/templates";
import {
  BUILT_IN_TEMPLATES,
  renderTemplate,
  TEMPLATE_VARIABLES,
  type EmailTemplate,
} from "@/lib/email-templates";

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: "email_template", label: "Email" },
  { value: "sms_template", label: "SMS" },
  { value: "internal_note", label: "Internal Note" },
];

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: "operational", label: "Operational" },
  { value: "marketing", label: "Marketing" },
  { value: "transactional", label: "Transactional" },
];

const TYPE_COLORS: Record<string, string> = {
  email_template: "bg-blue-100 text-blue-700",
  sms_template: "bg-emerald-100 text-emerald-700",
  internal_note: "bg-stone-100 text-stone-600",
};

// Sample variables for preview rendering
const SAMPLE_VARS: Record<string, string> = {
  first_name: "Jane",
  company_name: "Route Commerce",
  stop_name: "Tuxedo Warehouse",
  pickup_date: "May 15, 2026",
  order_total: "$450.00",
  balance_due: "$225.00",
  due_date: "May 10, 2026",
  item_summary: "10× Tuxedo Set, 5× Dress Shirt",
  custom_message: "We look forward to seeing you!",
  cta_text: "Shop Now",
  cta_url: "https://routecommerce.com",
  tag: "New Arrivals",
  headline: "Spring Collection is Here!",
  unsubscribe_url: "#",
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
  fileText: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
};

// New Template Modal
function NewTemplateModal({ 
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
  const [templateType, setTemplateType] = useState<TemplateType>("email_template");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    setSaving(true);
    setError("");
    
    const result = await upsertTemplate({
      brand_id: brandId,
      name: name.trim(),
      subject: "",
      body_text: "",
      template_type: templateType,
    });
    
    setSaving(false);
    
    if (!result.success) {
      setError(result.error ?? "Failed to create template");
      return;
    }
    
    setName("");
    setTemplateType("email_template");
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
              {Icons.fileText("h-5 w-5 text-white")}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">New Template</h2>
              <p className="text-xs text-[var(--admin-text-muted)]">Create a new email template</p>
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
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Pickup Reminder"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Template Type *
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as TemplateType)}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {TEMPLATE_TYPES.map((t) => (
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
            {saving ? "Creating..." : "Create Template"}
            {!saving && Icons.arrowRight("h-4 w-4")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplateListPanel({ templates, brandId = "64294306-5f42-463d-a5e8-2ad6c81a96de" }: { templates: Template[], brandId?: string }) {
  const router = useRouter();
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div className="p-4 sm:p-6">
      <NewTemplateModal 
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
            {Icons.fileText("w-4 h-4 text-[var(--admin-bg)]")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Templates</h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          {Icons.plus("h-3.5 w-3.5 sm:h-4 sm:w-4")}
          <span>New Template</span>
        </button>
      </div>

      {/* Table */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-[var(--admin-text-muted)]">No templates yet</div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-[var(--admin-card)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Name</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Type</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Subject</th>
                <th className="text-left px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Updated</th>
                <th className="text-right px-3 sm:px-4 py-3 font-semibold text-[var(--admin-text-muted)]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {templates.map((t) => (
                <tr 
                  key={t.id} 
                  className="hover:bg-[var(--admin-card-hover)] cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/communications/templates/${t.id}`)}
                >
                  <td className="px-3 sm:px-4 py-3 font-medium text-[var(--admin-text-primary)]">{t.name}</td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${TYPE_COLORS[t.template_type] || "bg-stone-100 text-stone-600"}`}>
                      {t.template_type}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)] truncate max-w-[200px] sm:max-w-xs">{t.subject}</td>
                  <td className="px-3 sm:px-4 py-3 text-[var(--admin-text-muted)]">{formatDate(new Date(t.updated_at))}</td>
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

export function TemplateEditForm({
  template,
  mode = "edit",
  brandId,
}: {
  template?: Template;
  mode?: "edit" | "new";
  brandId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [bodyText, setBodyText] = useState(template?.body_text ?? "");
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? "");
  const [templateType, setTemplateType] = useState<TemplateType>(template?.template_type ?? "email_template");
  const [campaignType, setCampaignType] = useState<CampaignType | "">(template?.campaign_type ?? "");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [htmlMode, setHtmlMode] = useState(!!template?.body_html);

  // Apply a built-in template to the editor fields
  function applyBuiltIn(tpl: EmailTemplate) {
    const rendered = renderTemplate(tpl, SAMPLE_VARS);
    setName(tpl.name);
    setSubject(rendered.subject);
    setBodyText(rendered.body_text);
    setBodyHtml(rendered.body_html);
    setHtmlMode(true);
  }

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    const ta = document.getElementById("body-textarea") as HTMLTextAreaElement;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = bodyText.slice(0, start) + token + bodyText.slice(end);
      setBodyText(next);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      setBodyText((prev) => prev + "\n" + token);
    }
  }

  const preview = {
    subject: subject || "Your Email Subject",
    body_text: bodyText,
    body_html: bodyHtml || `<p style="white-space:pre-wrap">${bodyText}</p>`,
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await upsertTemplate({
      id: template?.id,
      brand_id: brandId,
      name,
      subject,
      body_text: bodyText,
      body_html: (htmlMode && bodyHtml) ? bodyHtml : undefined,
      template_type: templateType,
      campaign_type: (campaignType as CampaignType) || undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
      return;
    }
    router.push("/admin/communications/templates");
    router.refresh();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-text-primary)]">
            {Icons.fileText("w-4 h-4 text-[var(--admin-bg)]")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">
              {mode === "new" ? "New Template" : "Edit Template"}
            </h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
              {mode === "new" ? "Create a new email template" : "Update template settings"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === "edit" 
                ? "bg-emerald-600 text-white" 
                : "bg-white border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)]"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === "preview" 
                ? "bg-emerald-600 text-white" 
                : "bg-white border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)]"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {activeTab === "edit" ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Basic info */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Template Info</h3>
              {/* Built-in template picker */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Start from:</span>
                <select
                  className="text-xs sm:text-sm border border-[var(--admin-border)] rounded-lg px-3 py-1.5 bg-white text-[var(--admin-text-primary)]"
                  onChange={(e) => {
                    const tpl = BUILT_IN_TEMPLATES.find((t) => t.id === e.target.value);
                    if (tpl) applyBuiltIn(tpl);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="">— Pre-built template —</option>
                  {BUILT_IN_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Template Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                placeholder="e.g. Pickup Reminder"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Template Type *</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                >
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                >
                  <option value="">Any</option>
                  {CAMPAIGN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Subject Line</h3>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                placeholder="Email subject line"
              />
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
                Variables:{" "}
                {TEMPLATE_VARIABLES.slice(0, 6).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      const tok = `{{${v.key}}}`;
                      setSubject((s) => s + tok);
                    }}
                    className="ml-1 text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </p>
            </div>
          </div>

          {/* Body editor */}
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide">Message Body</h3>
              <label className="flex items-center gap-2 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  checked={htmlMode}
                  onChange={(e) => setHtmlMode(e.target.checked)}
                  className="rounded border-[var(--admin-border)] text-emerald-600"
                />
                <span className="text-[var(--admin-text-muted)]">HTML mode</span>
              </label>
            </div>

            {/* Variable toolbar */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] self-center mr-1">Insert:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={`${v.label}: ${v.example}`}
                  onClick={() => insertVariable(v.key)}
                  className="rounded bg-[var(--admin-card)] border border-[var(--admin-border)] px-2 py-1 text-[10px] sm:text-xs text-[var(--admin-text-muted)] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>

            {htmlMode ? (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">HTML Body</label>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={12}
                    className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm font-mono text-xs bg-white text-[var(--admin-text-primary)]"
                    placeholder="<p>HTML version with variables like {{first_name}}...</p>"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Plain Text Fallback *</label>
                  <textarea
                    id="body-textarea"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={6}
                    className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                    placeholder="Plain text version..."
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Body (Plain Text) *</label>
                <textarea
                  id="body-textarea"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={10}
                  className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--admin-text-primary)]"
                  placeholder="Message body with variables like {{first_name}}..."
                />
              </div>
            )}

            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
              Tip: Click any variable button above to insert it at the cursor position. Variables are replaced when the email is sent.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name || !subject || !bodyText}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
            <a href="/admin/communications/templates" className="text-xs sm:text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] ml-4">
              Cancel
            </a>
          </div>
        </div>
      ) : (
        /* Preview Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-[var(--admin-text-muted)]">Preview:</span>
            <div className="flex rounded-lg border border-[var(--admin-border)] overflow-hidden">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  previewDevice === "desktop" 
                    ? "bg-emerald-600 text-white" 
                    : "bg-white text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)]"
                }`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  previewDevice === "mobile" 
                    ? "bg-emerald-600 text-white" 
                    : "bg-white text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)]"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Email preview */}
          <div className={`mx-auto transition-all ${previewDevice === "mobile" ? "max-w-[375px]" : "max-w-[600px]"}`}>
            <div className="rounded-xl border border-[var(--admin-border)] bg-white shadow-lg overflow-hidden">
              {/* Mock email header */}
              <div className="bg-[var(--admin-card)] border-b border-[var(--admin-border)] px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 text-center text-xs text-[var(--admin-text-muted)] truncate">
                  {preview.subject}
                </div>
              </div>
              {/* Email body */}
              <div
                className="overflow-hidden"
                dangerouslySetInnerHTML={{ __html: preview.body_html }}
              />
              {/* Plain text toggle */}
              {bodyText && (
                <details className="border-t border-[var(--admin-border)]">
                  <summary className="px-4 py-2 text-xs text-[var(--admin-text-muted)] cursor-pointer hover:text-[var(--admin-text-primary)]">
                    View plain text version
                  </summary>
                  <pre className="px-4 pb-4 text-xs text-[var(--admin-text-muted)] whitespace-pre-wrap font-mono">{preview.body_text}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}