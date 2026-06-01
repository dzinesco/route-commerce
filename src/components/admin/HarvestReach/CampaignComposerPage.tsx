"use client";

import { useState } from "react";
import { type Campaign, type CampaignType } from "@/actions/harvest-reach/campaigns";
import { type Template } from "@/actions/communications/templates";
import type { Segment, SegmentRuleV2 } from "@/actions/harvest-reach/segments";

type Props = {
  brandId: string;
  campaigns: Campaign[];
  templates: Template[];
  segments: Segment[];
  editCampaignId?: string;
};

type Step = 1 | 2 | 3 | 4;

const STEPS = ["Template", "Audience", "Preview", "Schedule"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-950 text-zinc-400",
  scheduled: "bg-blue-900/40 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-900/40 text-green-400",
  canceled: "bg-red-900/40 text-red-400",
};

const CAMPAIGN_TYPES: { value: CampaignType; label: string; desc: string }[] = [
  { value: "marketing", label: "Marketing", desc: "Promotions, newsletters" },
  { value: "operational", label: "Operational", desc: "Stop updates, reminders" },
  { value: "transactional", label: "Transactional", desc: "Receipts, confirmations" },
];

function statusBadge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-zinc-950 text-zinc-400"}`}>
      {status}
    </span>
  );
}

export default function CampaignComposerPage({ brandId, campaigns, templates, segments, editCampaignId }: Props) {
  const editing = campaigns.find((c) => c.id === editCampaignId);

  const [step, setStep] = useState<Step>(editing ? 4 : 1);
  const [name, setName] = useState(editing?.name ?? "");
  const [campaignType, setCampaignType] = useState<CampaignType>(editing?.campaign_type ?? "marketing");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(editing?.template_id ?? "");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [bodyText, setBodyText] = useState(editing?.body_text ?? "");
  const [bodyHtml, setBodyHtml] = useState(editing?.body_html ?? "");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [sendNow, setSendNow] = useState(!editing?.scheduled_at);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);

  function handleTemplateSelect(template: Template) {
    setSelectedTemplateId(template.id);
    setSubject(template.subject ?? "");
    setBodyText(template.body_text ?? "");
    setBodyHtml(template.body_html ?? "");
    setStep(2);
  }

  async function handleCreateOrSchedule() {
    setError("");
    setSaving(true);
    const rules = selectedSegment?.rules ?? { combinator: "AND", filters: [] };
    const { upsertCampaign } = await import("@/actions/communications/campaigns");
    const { sendCampaign } = await import("@/actions/communications/send");

    const result = await upsertCampaign({
      id: editing?.id,
      brand_id: brandId,
      name: name || "Untitled Campaign",
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      template_id: selectedTemplateId || undefined,
      campaign_type: campaignType,
      status: sendNow ? "draft" : "scheduled",
      audience_rules: rules as any,
      scheduled_at: sendNow ? undefined : scheduledAt || undefined,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save campaign");
      setSaving(false);
      return;
    }

    if (sendNow) {
      const sendResult = await sendCampaign(result.campaign.id, brandId);
      if (!sendResult.success) {
        setError(sendResult.error ?? "Failed to send campaign");
        setSaving(false);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  if (saved) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">
          {sendNow ? "Campaign Sent!" : "Campaign Scheduled!"}
        </h2>
        <p className="text-sm text-zinc-500 mb-8">
          {sendNow
            ? "Your campaign has been sent to all matching customers."
            : `It will be sent on ${new Date(scheduledAt).toLocaleString()}.`}
        </p>
        <button
          onClick={() => window.location.href = "/admin/communications"}
          className="px-6 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          return (
            <div key={label} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                step === n
                  ? "bg-stone-900 text-white"
                  : done
                  ? "bg-stone-200 text-stone-700"
                  : "bg-zinc-950 text-slate-400"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  step === n ? "border-white" : done ? "border-stone-400" : "border-zinc-600"
                }`}>
                  {done ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-6 ${done ? "bg-stone-300" : "bg-slate-200"} mx-1`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">

        {/* Step 1: Template */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Choose a Template</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Select a template or start from scratch.</p>
            </div>

            {templates.length === 0 ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-zinc-500">No templates yet. Create your subject and body below.</p>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Subject line"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  />
                  <textarea
                    placeholder="Email body text…"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={5}
                    className="w-full border border-zinc-600 rounded-lg px-3 py-2.5 text-sm resize-none outline-none focus:border-slate-900"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start from scratch */}
                <button
                  onClick={() => setStep(2)}
                  className="rounded-xl border-2 border-dashed border-zinc-600 p-5 text-left hover:border-stone-400 hover:bg-zinc-950 transition-all group"
                >
                  <span className="text-2xl block mb-2">+</span>
                  <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100">Start from scratch</p>
                  <p className="text-xs text-slate-400 mt-0.5">Write your own subject and body</p>
                </button>

                {/* Template cards */}
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedTemplateId === t.id
                        ? "border-stone-900 bg-zinc-950"
                        : "border-zinc-800 hover:border-slate-400 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{t.subject}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-zinc-950 px-2 py-0.5 text-xs text-zinc-400 flex-shrink-0">
                        {t.template_type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Audience */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Audience</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Name your campaign and pick a segment.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. May Sweet Corn Promotion"
                  className="w-full border border-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Saved Segment</label>
                <div className="flex gap-2">
                  <select
                    value={selectedSegmentId}
                    onChange={(e) => {
                      setSelectedSegmentId(e.target.value);
                    }}
                    className="flex-1 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-zinc-900 outline-none focus:border-slate-900"
                  >
                    <option value="">— Choose a saved segment —</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selectedSegmentId && (
                    <button
                      onClick={() => setSelectedSegmentId("")}
                      className="px-3 text-xs text-slate-400 hover:text-red-500 border border-zinc-800 rounded-lg hover:border-red-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!name}
                className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
              >
                Continue to Preview
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Preview & Edit</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Review how your message will look.</p>
            </div>

            {/* Mock email frame */}
            <div className="rounded-xl border border-zinc-800 bg-slate-50 overflow-hidden">
              <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-300" />
                <div>
                  <p className="text-xs font-medium text-zinc-300">Your Brand</p>
                  <p className="text-xs text-slate-400">To: {"{{customer_name}}"}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-base font-semibold text-zinc-100 mb-3">{subject || "(no subject)"}</p>
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{bodyText || "(no body)"}</div>
              </div>
            </div>

            {/* Editable subject */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
              >
                Continue to Schedule
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Schedule & Send</h2>
              <p className="text-sm text-zinc-500 mt-0.5">Set campaign type and timing.</p>
            </div>

            {/* Campaign type */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Campaign Type</label>
              <div className="grid grid-cols-3 gap-3">
                {CAMPAIGN_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => setCampaignType(ct.value)}
                    className={`rounded-xl border py-3 px-4 text-left transition-all ${
                      campaignType === ct.value
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-zinc-800 hover:border-slate-400 hover:bg-zinc-800"
                    }`}
                  >
                    <p className={`text-sm font-medium ${campaignType === ct.value ? "text-white" : "text-zinc-300"}`}>{ct.label}</p>
                    <p className={`text-xs mt-0.5 ${campaignType === ct.value ? "text-stone-300" : "text-slate-400"}`}>{ct.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Send timing */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Send</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={sendNow}
                    onChange={() => setSendNow(true)}
                    className="accent-stone-900 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-zinc-300">Send now</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={!sendNow}
                    onChange={() => setSendNow(false)}
                    className="accent-stone-900 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-zinc-300">Schedule for later</span>
                </label>
              </div>
            </div>

            {!sendNow && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Send Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="border border-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {/* Summary */}
            <div className="rounded-xl bg-slate-50 border border-zinc-800 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Summary</p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Campaign</span>
                <span className="text-zinc-100 font-medium">{name || "—"}</span>
                <span className="text-zinc-500">Template</span>
                <span className="text-zinc-100">{selectedTemplate?.name ?? "Custom"}</span>
                <span className="text-zinc-500">Audience</span>
                <span className="text-zinc-100">{selectedSegment?.name ?? "—"}</span>
                <span className="text-zinc-500">Type</span>
                <span className="text-zinc-100 capitalize">{campaignType}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <button
                onClick={handleCreateOrSchedule}
                disabled={saving || (!sendNow && !scheduledAt)}
                className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Processing…" : sendNow ? "Send Campaign" : "Schedule Campaign"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-slate-800">Recent Campaigns</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-zinc-800">
              <tr>
                {["Name", "Type", "Status", "Sent"].map((h) => (
                  <th key={h} className={`text-left px-6 py-3 font-medium text-zinc-400 ${h !== "Name" ? "hidden sm:table-cell" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.slice(0, 10).map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-800">{c.name}</td>
                  <td className="px-6 py-3.5 hidden sm:table-cell text-zinc-500 capitalize">{c.campaign_type}</td>
                  <td className="px-6 py-3.5 hidden sm:table-cell">{statusBadge(c.status)}</td>
                  <td className="px-6 py-3.5 hidden sm:table-cell text-xs text-slate-400">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}
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