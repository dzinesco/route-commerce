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

export function TemplateListPanel({ templates }: { templates: Template[] }) {
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Templates</h2>
          <p className="text-sm text-zinc-500">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <a
          href="/admin/communications/templates/new"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Template
        </a>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No templates yet</div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-400">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900 cursor-pointer" onClick={() => router.push(`/admin/communications/templates/${t.id}`)}>
                  <td className="px-4 py-3 font-medium text-zinc-100">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.template_type === "email_template" ? "bg-blue-900/40 text-blue-700" :
                      t.template_type === "sms_template" ? "bg-green-900/40 text-green-400" :
                      "bg-zinc-950 text-zinc-400"
                    }`}>
                      {t.template_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 truncate max-w-xs">{t.subject}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(new Date(t.updated_at))}</td>
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
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">
          {mode === "new" ? "New Template" : "Edit Template"}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "edit" ? "bg-slate-900 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "preview" ? "bg-slate-900 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"}`}
          >
            Preview
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {activeTab === "edit" ? (
        <div className="space-y-6">
          {/* Basic info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Template Info</h3>
              {/* Built-in template picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Start from:</span>
                <select
                  className="text-sm border border-zinc-600 rounded-lg px-3 py-1.5"
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
              <label className="block text-sm font-medium text-zinc-300 mb-1">Template Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Pickup Reminder"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Template Type *</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                >
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Campaign Type</label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value as CampaignType)}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
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
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Subject Line</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                placeholder="Email subject line"
              />
              <p className="mt-1 text-xs text-slate-400">
                Variables:{" "}
                {TEMPLATE_VARIABLES.slice(0, 6).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      const tok = `{{${v.key}}}`;
                      const start = subject.length;
                      setSubject((s) => s + tok);
                    }}
                    className="ml-1 text-blue-400 hover:text-blue-800"
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </p>
            </div>
          </div>

          {/* Body editor */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Message Body</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={htmlMode}
                  onChange={(e) => setHtmlMode(e.target.checked)}
                  className="rounded border-slate-400"
                />
                <span className="text-zinc-400">HTML mode</span>
              </label>
            </div>

            {/* Variable toolbar */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-400 self-center mr-1">Insert:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={`${v.label}: ${v.example}`}
                  onClick={() => insertVariable(v.key)}
                  className="rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-400 hover:bg-blue-900/40 hover:text-blue-700"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>

            {htmlMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">HTML Body</label>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={12}
                    className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                    placeholder="<p>HTML version with variables like {{first_name}}...</p>"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Plain Text Fallback *</label>
                  <textarea
                    id="body-textarea"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={6}
                    className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                    placeholder="Plain text version..."
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Body (Plain Text) *</label>
                <textarea
                  id="body-textarea"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={10}
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  placeholder="Message body with variables like {{first_name}}..."
                />
              </div>
            )}

            <p className="text-xs text-slate-400">
              Tip: Click any variable button above to insert it at the cursor position. Variables are replaced when the email is sent.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name || !subject || !bodyText}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
            <a href="/admin/communications/templates" className="text-sm text-zinc-500 hover:text-zinc-300 ml-4">
              Cancel
            </a>
          </div>
        </div>
      ) : (
        /* Preview Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">Preview:</span>
            <div className="flex rounded-lg border border-zinc-600 overflow-hidden">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`px-4 py-2 text-sm font-medium ${previewDevice === "desktop" ? "bg-slate-900 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-900"}`}
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`px-4 py-2 text-sm font-medium ${previewDevice === "mobile" ? "bg-slate-900 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-900"}`}
              >
                Mobile
              </button>
            </div>
          </div>

          {/* Email preview */}
          <div className={`mx-auto transition-all ${previewDevice === "mobile" ? "max-w-[375px]" : "max-w-[600px]"}`}>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-black/20 overflow-hidden">
              {/* Mock email header */}
              <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 text-center text-xs text-zinc-500 truncate">
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
                <details className="border-t border-zinc-800">
                  <summary className="px-4 py-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                    View plain text version
                  </summary>
                  <pre className="px-4 pb-4 text-xs text-zinc-400 whitespace-pre-wrap">{preview.body_text}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
