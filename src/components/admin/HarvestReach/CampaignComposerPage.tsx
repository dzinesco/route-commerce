"use client";

import { useState, useCallback } from "react";
import { type Campaign, type CampaignType } from "@/actions/harvest-reach/campaigns";
import { type Template } from "@/actions/communications/templates";
import type { Segment, SegmentRuleV2 } from "@/actions/harvest-reach/segments";
import { AdminButton } from "@/components/admin/design-system";

type Props = {
  brandId: string;
  campaigns: Campaign[];
  templates: Template[];
  segments: Segment[];
  editCampaignId?: string;
};

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1 as Step, label: "Template", description: "Choose or create" },
  { id: 2 as Step, label: "Content", description: "Write your message" },
  { id: 3 as Step, label: "Audience", description: "Select recipients" },
  { id: 4 as Step, label: "Schedule", description: "Send or schedule" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-emerald-100 text-emerald-700",
  canceled: "bg-red-100 text-red-600",
};

const CAMPAIGN_TYPES: { value: CampaignType; label: string; desc: string; icon: React.ReactNode }[] = [
  { 
    value: "marketing", 
    label: "Marketing", 
    desc: "Promotions, newsletters",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { 
    value: "operational", 
    label: "Operational", 
    desc: "Stop updates, reminders",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { 
    value: "transactional", 
    label: "Transactional", 
    desc: "Receipts, confirmations",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

// Icons
const Icons = {
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  users: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  calendar: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  clock: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  send: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  arrowLeft: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  edit: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  sparkles: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1m-9-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: Step; steps: typeof STEPS }) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isUpcoming = currentStep < step.id;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                    : isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                {isCompleted ? (
                  Icons.check("w-5 h-5")
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-xs font-semibold ${isCurrent ? "text-emerald-600" : "text-stone-500"}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-16 mx-2 transition-colors ${
                isCompleted ? "bg-emerald-500" : "bg-stone-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-stone-100 text-stone-600"}`}>
      {status}
    </span>
  );
}

// Template card component
function TemplateCard({ 
  template, 
  isSelected, 
  onSelect 
}: { 
  template: Template; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
        isSelected
          ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10"
          : "border-stone-200 hover:border-emerald-300 hover:bg-stone-50"
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          {Icons.check("w-4 h-4 text-white")}
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isSelected ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500 group-hover:bg-emerald-100 group-hover:text-emerald-600"
        } transition-colors`}>
          {Icons.mail("w-5 h-5")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate group-hover:text-emerald-700">{template.name}</p>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{template.subject || "(no subject)"}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 capitalize">
              {template.template_type}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Email preview component
function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden shadow-sm">
      {/* Email header */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-stone-800">Your Brand</p>
          <p className="text-xs text-stone-400">To: {`{{customer_name}}`}</p>
        </div>
      </div>
      
      {/* Email body */}
      <div className="p-5">
        <h3 className="text-base font-bold text-stone-900 mb-2">
          {subject || <span className="text-stone-400 italic">(no subject)</span>}
        </h3>
        <div className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
          {body || <span className="text-stone-400 italic">(no body)</span>}
        </div>
      </div>
    </div>
  );
}

// Success state component
function SuccessState({ sendNow, scheduledAt, campaignName }: { sendNow: boolean; scheduledAt: string; campaignName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Success icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
          {sendNow ? Icons.send("w-10 h-10 text-white") : Icons.clock("w-10 h-10 text-white")}
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center">
          {Icons.check("w-5 h-5 text-emerald-600")}
        </div>
      </div>
      
      {/* Message */}
      <h2 className="text-2xl font-bold text-stone-900 mt-6">
        {sendNow ? "Campaign Sent!" : "Campaign Scheduled!"}
      </h2>
      <p className="text-stone-500 mt-2 text-center max-w-sm">
        {sendNow
          ? `Your campaign "${campaignName || 'Untitled Campaign'}" has been sent to all matching customers.`
          : `Your campaign is scheduled for ${new Date(scheduledAt).toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}.`
        }
      </p>
      
      {/* Actions */}
      <div className="flex items-center gap-3 mt-8">
        <AdminButton variant="secondary" onClick={() => window.location.href = "/admin/communications?tab=analytics"}>
          View Analytics
        </AdminButton>
        <AdminButton onClick={() => window.location.href = "/admin/communications"}>
          Back to Campaigns
        </AdminButton>
      </div>
    </div>
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

  const handleTemplateSelect = useCallback((template: Template) => {
    setSelectedTemplateId(template.id);
    setSubject(template.subject ?? "");
    setBodyText(template.body_text ?? "");
    setBodyHtml(template.body_html ?? "");
    setStep(2);
  }, []);

  const handleCreateOrSchedule = useCallback(async () => {
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
  }, [name, subject, bodyText, bodyHtml, selectedTemplateId, campaignType, sendNow, scheduledAt, selectedSegment, editing, brandId]);

  // Validation
  const canProceedFromStep2 = subject.trim().length > 0;
  const canProceedFromStep3 = name.trim().length > 0;

  if (saved) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--admin-border)] overflow-hidden">
        <SuccessState sendNow={sendNow} scheduledAt={scheduledAt} campaignName={name} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <StepIndicator currentStep={step} steps={STEPS} />

      {/* Step content card */}
      <div className="bg-white rounded-2xl border border-[var(--admin-border)] overflow-hidden shadow-sm">
        {/* Step 1: Template */}
        {step === 1 && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                {Icons.mail("w-5 h-5")}
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Choose a Template</h2>
                <p className="text-sm text-stone-500">Select a template or start from scratch to craft your message.</p>
              </div>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-12 px-4 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
                  {Icons.plus("w-8 h-8 text-stone-400")}
                </div>
                <p className="text-sm text-stone-600 font-medium">No templates yet</p>
                <p className="text-xs text-stone-400 mt-1 mb-4">Create your subject and body in the next step.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isSelected={selectedTemplateId === t.id}
                    onSelect={() => handleTemplateSelect(t)}
                  />
                ))}
              </div>
            )}

            <div className="border-t border-stone-100 pt-6">
              <p className="text-xs text-stone-400 mb-3">Or start fresh:</p>
              <AdminButton onClick={() => setStep(2)} variant="secondary">
                {Icons.edit("w-4 h-4")}
                Start from scratch
              </AdminButton>
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                {Icons.edit("w-5 h-5")}
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Write Your Message</h2>
                <p className="text-sm text-stone-500">Craft a compelling subject and body for your campaign.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Subject Line</label>
                  <input
                    type="text"
                    placeholder="Enter a compelling subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-xs text-stone-400 mt-1">{subject.length}/60 characters recommended</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Message Body</label>
                  <textarea
                    placeholder="Write your message here..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={8}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Preview</label>
                <EmailPreview subject={subject} body={bodyText} />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-6 mt-6 border-t border-stone-100">
              <AdminButton variant="ghost" onClick={() => setStep(1)} icon={Icons.arrowLeft("w-4 h-4")} iconPosition="left">
                Back
              </AdminButton>
              <AdminButton onClick={() => setStep(3)} disabled={!canProceedFromStep2} icon={Icons.arrowRight("w-4 h-4")}>
                Continue to Audience
              </AdminButton>
            </div>
          </div>
        )}

        {/* Step 3: Audience */}
        {step === 3 && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                {Icons.users("w-5 h-5")}
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Select Your Audience</h2>
                <p className="text-sm text-stone-500">Name your campaign and choose who will receive it.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. May Sweet Corn Promotion"
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Recipient Segment</label>
                  <select
                    value={selectedSegmentId}
                    onChange={(e) => setSelectedSegmentId(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="">All contacts</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selectedSegmentId && (
                    <p className="text-xs text-stone-400 mt-1">
                      Using segment: {selectedSegment?.name}
                    </p>
                  )}
                </div>

                {/* Content preview */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Content Summary</p>
                  <p className="text-sm font-medium text-stone-800">{subject || "(no subject)"}</p>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{bodyText || "(no body)"}</p>
                </div>
              </div>

              {/* Visual segment picker */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">Segment Overview</h3>
                {selectedSegment ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                          <polyline points="2 17 12 22 22 17"/>
                          <polyline points="2 12 12 17 22 12"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{selectedSegment.name}</p>
                        <p className="text-xs text-stone-500">{selectedSegment.description || "Custom segment"}</p>
                      </div>
                    </div>
                    <div className="text-xs text-stone-400">
                      {"filters" in selectedSegment.rules ? `${selectedSegment.rules.filters.length} filter${selectedSegment.rules.filters.length !== 1 ? "s" : ""} configured` : "Custom rules configured"}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center">
                      {Icons.users("w-6 h-6 text-stone-400")}
                    </div>
                    <p className="text-sm text-stone-600 font-medium">All Contacts</p>
                    <p className="text-xs text-stone-400 mt-1">This campaign will be sent to all your contacts</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-6 mt-6 border-t border-stone-100">
              <AdminButton variant="ghost" onClick={() => setStep(2)} icon={Icons.arrowLeft("w-4 h-4")} iconPosition="left">
                Back
              </AdminButton>
              <AdminButton onClick={() => setStep(4)} disabled={!canProceedFromStep3} icon={Icons.arrowRight("w-4 h-4")}>
                Continue to Schedule
              </AdminButton>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                {Icons.calendar("w-5 h-5")}
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Schedule & Send</h2>
                <p className="text-sm text-stone-500">Set your campaign type and choose when to send.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign type selection */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-3">Campaign Type</label>
                <div className="space-y-3">
                  {CAMPAIGN_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setCampaignType(ct.value)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        campaignType === ct.value
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          campaignType === ct.value ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500"
                        }`}>
                          {ct.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-800">{ct.label}</p>
                          <p className="text-xs text-stone-500">{ct.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Send timing */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-3">When to Send</label>
                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    sendNow ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:border-stone-300"
                  }`}>
                    <input
                      type="radio"
                      checked={sendNow}
                      onChange={() => setSendNow(true)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {Icons.send("w-5 h-5 text-emerald-600")}
                        <span className="text-sm font-semibold text-stone-800">Send immediately</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">Your campaign will be sent right away</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    !sendNow ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:border-stone-300"
                  }`}>
                    <input
                      type="radio"
                      checked={!sendNow}
                      onChange={() => setSendNow(false)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {Icons.clock("w-5 h-5 text-emerald-600")}
                        <span className="text-sm font-semibold text-stone-800">Schedule for later</span>
                      </div>
                    </div>
                  </label>
                </div>

                {!sendNow && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">Send Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-5 bg-stone-50 rounded-2xl border border-stone-200">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Campaign Summary</p>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-stone-500">Campaign name</span>
                  <p className="font-semibold text-stone-800">{name || "—"}</p>
                </div>
                <div>
                  <span className="text-stone-500">Template</span>
                  <p className="font-semibold text-stone-800">{selectedTemplate?.name ?? "Custom"}</p>
                </div>
                <div>
                  <span className="text-stone-500">Audience</span>
                  <p className="font-semibold text-stone-800">{selectedSegment?.name ?? "All contacts"}</p>
                </div>
                <div>
                  <span className="text-stone-500">Type</span>
                  <p className="font-semibold text-stone-800 capitalize">{campaignType}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-6 mt-6 border-t border-stone-100">
              <AdminButton variant="ghost" onClick={() => setStep(3)} icon={Icons.arrowLeft("w-4 h-4")} iconPosition="left">
                Back
              </AdminButton>
              <AdminButton
                onClick={handleCreateOrSchedule}
                isLoading={saving}
                disabled={(!sendNow && !scheduledAt)}
              >
                {saving ? "Processing…" : sendNow ? (
                  <>
                    {Icons.send("w-4 h-4")}
                    Send Campaign
                  </>
                ) : (
                  <>
                    {Icons.calendar("w-4 h-4")}
                    Schedule Campaign
                  </>
                )}
              </AdminButton>
            </div>
          </div>
        )}
      </div>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--admin-border)] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Recent Campaigns</h3>
            <span className="text-xs text-stone-400">{campaigns.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-left px-6 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wider hidden sm:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {campaigns.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-stone-800">{c.name}</td>
                    <td className="px-6 py-3.5 hidden sm:table-cell text-stone-600 capitalize">{c.campaign_type}</td>
                    <td className="px-6 py-3.5 hidden sm:table-cell"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-3.5 hidden sm:table-cell text-xs text-stone-400">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}