"use client";

import { useState, useEffect } from "react";
import { saveResendCredentials, saveTwilioCredentials, testResendConnection, testTwilioConnection, getResendCredentials, getTwilioCredentials } from "@/actions/integrations/credentials";

// Icons
const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-3-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
  </svg>
);

const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"/>
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

type Props = {
  brandId: string;
  brands: { id: string; name: string }[];
};

export default function AdvancedIntegrations({ brandId, brands }: Props) {
  const [selectedBrandId, setSelectedBrandId] = useState(brandId);
  const [credentials, setCredentials] = useState<{
    resend: { api_key: string; from_email: string; from_name: string };
    twilio: { account_sid: string; auth_token: string; phone_number: string };
  }>({
    resend: { api_key: "", from_email: "", from_name: "" },
    twilio: { account_sid: "", auth_token: "", phone_number: "" },
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function fetchCredentials() {
      const [resendCreds, twilioCreds] = await Promise.all([
        getResendCredentials(selectedBrandId),
        getTwilioCredentials(selectedBrandId),
      ]);

      setCredentials({
        resend: {
          api_key: resendCreds.api_key ?? "",
          from_email: resendCreds.from_email ?? "",
          from_name: resendCreds.from_name ?? "",
        },
        twilio: {
          account_sid: twilioCreds.account_sid ?? "",
          auth_token: twilioCreds.auth_token ?? "",
          phone_number: twilioCreds.phone_number ?? "",
        },
      });
    }
    fetchCredentials();
  }, [selectedBrandId]);

  function toggleSecret(key: string) {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleTest(service: "resend" | "twilio") {
    // Clear previous result for this service
    const newResults = { ...testResults };
    delete newResults[service];
    setTestResults(newResults);

    if (service === "resend") {
      if (!credentials.resend.api_key?.trim()) {
        setTestResults((prev) => ({ ...prev, resend: { ok: false, message: "API key is required" } }));
        return;
      }
      const result = await testResendConnection(credentials.resend.api_key);
      setTestResults((prev) => ({ ...prev, resend: result }));
    } else {
      if (!credentials.twilio.account_sid?.trim() || !credentials.twilio.auth_token?.trim()) {
        setTestResults((prev) => ({ ...prev, twilio: { ok: false, message: "Account SID and Auth Token are required" } }));
        return;
      }
      const result = await testTwilioConnection(credentials.twilio.account_sid, credentials.twilio.auth_token);
      setTestResults((prev) => ({ ...prev, twilio: result }));
    }
  }

  async function handleSave(service: "resend" | "twilio") {
    setLoading(true);
    setSaveStatus(null);
    // Clear test result for this service
    const clearedResults = { ...testResults };
    delete clearedResults[service];
    setTestResults(clearedResults);

    try {
      if (service === "resend") {
        const result = await saveResendCredentials(selectedBrandId, {
          api_key: credentials.resend.api_key?.trim() || null,
          from_email: credentials.resend.from_email?.trim() || null,
          from_name: credentials.resend.from_name?.trim() || null,
        });
        if (result.success) {
          setSaveStatus({ type: "success", message: "Resend credentials saved" });
          setTestResults((prev) => ({ ...prev, resend: { ok: true, message: "Saved successfully" } }));
        } else {
          setSaveStatus({ type: "error", message: result.error ?? "Failed to save" });
        }
      } else {
        const result = await saveTwilioCredentials(selectedBrandId, {
          account_sid: credentials.twilio.account_sid?.trim() || null,
          auth_token: credentials.twilio.auth_token?.trim() || null,
          phone_number: credentials.twilio.phone_number?.trim() || null,
        });
        if (result.success) {
          setSaveStatus({ type: "success", message: "Twilio credentials saved" });
          setTestResults((prev) => ({ ...prev, twilio: { ok: true, message: "Saved successfully" } }));
        } else {
          setSaveStatus({ type: "error", message: result.error ?? "Failed to save" });
        }
      }
    } catch (err) {
      setSaveStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Security Warning Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
            <ShieldIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">API Key Security</h4>
            <ul className="mt-1.5 text-xs text-amber-700 space-y-1">
              <li>• <strong>Never share keys</strong> — Don&apos;t paste in Slack, email, or commit to GitHub.</li>
              <li>• <strong>SMS costs add up fast</strong> — Twilio charges $0.008-$0.05 per message.</li>
              <li>• <strong>Set spending caps</strong> — Use provider budget controls to avoid surprise bills.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Resend Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500">
              <MailIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">Resend</h3>
              <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Email delivery for Harvest Reach campaigns</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showSecrets.resendKey ? "text" : "password"}
                value={credentials.resend.api_key}
                onChange={(e) => setCredentials((p) => ({
                  ...p,
                  resend: { ...p.resend, api_key: e.target.value },
                }))}
                placeholder="re_..."
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => toggleSecret("resendKey")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showSecrets.resendKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {/* From Email */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">From Email</label>
            <input
              type="email"
              value={credentials.resend.from_email}
              onChange={(e) => setCredentials((p) => ({
                ...p,
                resend: { ...p.resend, from_email: e.target.value },
              }))}
              placeholder="orders@yourbrand.com"
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {/* From Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">From Name</label>
            <input
              type="text"
              value={credentials.resend.from_name}
              onChange={(e) => setCredentials((p) => ({
                ...p,
                resend: { ...p.resend, from_name: e.target.value },
              }))}
              placeholder="Your Brand Name"
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {/* Status & Actions */}
          {testResults.resend && (
            <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
              testResults.resend.ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResults.resend.ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
              {testResults.resend.message}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleTest("resend")}
              disabled={loading}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={() => handleSave("resend")}
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Resend"}
            </button>
          </div>
        </div>
      </div>

      {/* Twilio Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
              <MessageIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">Twilio</h3>
              <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">SMS campaigns and alerts via Harvest Reach</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Account SID */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Account SID</label>
            <input
              type="text"
              value={credentials.twilio.account_sid}
              onChange={(e) => setCredentials((p) => ({
                ...p,
                twilio: { ...p.twilio, account_sid: e.target.value },
              }))}
              placeholder="AC..."
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {/* Auth Token */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Auth Token</label>
            <div className="relative">
              <input
                type={showSecrets.twilioToken ? "text" : "password"}
                value={credentials.twilio.auth_token}
                onChange={(e) => setCredentials((p) => ({
                  ...p,
                  twilio: { ...p.twilio, auth_token: e.target.value },
                }))}
                placeholder="Your Twilio auth token"
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm pr-10 text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => toggleSecret("twilioToken")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showSecrets.twilioToken ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={credentials.twilio.phone_number}
              onChange={(e) => setCredentials((p) => ({
                ...p,
                twilio: { ...p.twilio, phone_number: e.target.value },
              }))}
              placeholder="+1234567890"
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {/* Status & Actions */}
          {testResults.twilio && (
            <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
              testResults.twilio.ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResults.twilio.ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
              {testResults.twilio.message}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleTest("twilio")}
              disabled={loading}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={() => handleSave("twilio")}
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Twilio"}
            </button>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          saveStatus.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {saveStatus.message}
        </div>
      )}
    </div>
  );
}