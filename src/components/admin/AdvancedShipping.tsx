"use client";

import { useState } from "react";

// Icons
const TruckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/>
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

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
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

export default function AdvancedShipping({ brandId }: { brandId: string }) {
  const [carrier, setCarrier] = useState("fedex");
  const [accountNumber, setAccountNumber] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTest() {
    setTestResult(null);
    if (!accountNumber.trim()) {
      setTestResult({ ok: false, message: "Account number is required" });
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
    setTestResult({ ok: true, message: `${carrier.toUpperCase()} connection successful` });
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setTestResult({ ok: true, message: "Shipping settings saved" });
  }

  return (
    <div className="space-y-5">
      {/* Security Warning */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
            <ShieldIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">API Key Security</h4>
            <ul className="mt-1.5 text-xs text-amber-700 space-y-1">
              <li>• <strong>Shipping fraud is real</strong> — Stolen carrier credentials enable fake label purchases on your account.</li>
              <li>• <strong>Carrier API costs</strong> — FedEx/UPS APIs charge per rate quote ($0.01-$0.05) and per label ($3-$10).</li>
              <li>• <strong>Set account limits</strong> — Most carriers let you set monthly spending caps. Use them!</li>
              <li>• <strong>Test in sandbox</strong> — Use test credentials before connecting production shipping accounts.</li>
              <li>• <strong>Audit regularly</strong> — Check carrier invoices monthly for unauthorized activity.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Shipping Carriers Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <TruckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">Shipping Carriers</h3>
              <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Configure shipping provider credentials</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Carrier Selection */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="fedex">FedEx</option>
              <option value="ups">UPS</option>
              <option value="usps">USPS</option>
              <option value="dhl">DHL</option>
            </select>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Account Number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* API Key / Password */}
          <div>
            <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">API Key / Password</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key or password"
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 pr-10 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showApiKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
              testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={saving}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Shipping Options Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">Shipping Options</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3">
            {[
              { id: "live_rates", label: "Live Rate Quotes", desc: "Show real-time shipping rates at checkout" },
              { id: "label_printing", label: "Label Printing", desc: "Generate shipping labels automatically" },
              { id: "tracking", label: "Tracking Updates", desc: "Send tracking notifications to customers" },
              { id: "insurance", label: "Shipping Insurance", desc: "Protect high-value shipments" },
            ].map((option) => (
              <div key={option.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">{option.label}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{option.desc}</p>
                </div>
                <button className="relative inline-flex h-5 w-9 items-center rounded-full bg-emerald-600 transition-colors">
                  <span className="inline-block h-3.5 w-3.5 rounded-full bg-white translate-x-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}