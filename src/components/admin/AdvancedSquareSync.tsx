"use client";

import { useState } from "react";

// Icons
const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const GridIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3h6v6H3V3zm0 12h6v6H3v-6zm12-12h6v6h-6V3zm0 12h6v6h-6v-6z"/>
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

export default function AdvancedSquareSync({ brandId }: { brandId: string }) {
  const [connected, setConnected] = useState(false);
  const [appId, setAppId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleTest() {
    setTestResult(null);
    if (!appId.trim() || !accessToken.trim()) {
      setTestResult({ ok: false, message: "App ID and Access Token are required" });
      return;
    }
    // Simulate test
    await new Promise(r => setTimeout(r, 1000));
    setTestResult({ ok: true, message: "Square connection successful" });
    setConnected(true);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setTestResult({ ok: true, message: "Square sync settings saved" });
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
              <li>• <strong>Square access = real money</strong> — API can process transactions, refunds, and access customer data.</li>
              <li>• <strong>Monitor API calls</strong> — Square charges per API call. Heavy integrations can run up fees.</li>
              <li>• <strong>Token expiry</strong> — Square access tokens expire. Production apps need automatic refresh logic.</li>
              <li>• <strong>Use sandbox first</strong> — Test with Square sandbox before going live to avoid real charges.</li>
              <li>• <strong>Secure storage</strong> — Never expose credentials in client code or public repositories.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Square Sync Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black">
              <GridIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[var(--admin-text-primary)]">Square Sync</h3>
              <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Sync inventory with Square POS</p>
            </div>
            {connected && (
              <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Connected</span>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Application ID</label>
              <input
                type="password"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="sq0idp-..."
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAAl..."
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1.5">Location ID</label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="L..." 
                className="w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {testResult && (
            <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 ${
              testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {testResult.ok ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50"
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

      {/* Sync Options */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] bg-stone-50/50">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Sync Options</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3">
            {[
              { id: "inventory", label: "Inventory Sync", desc: "Sync product quantities from Square" },
              { id: "products", label: "Product Sync", desc: "Import/export products from Square catalog" },
              { id: "prices", label: "Price Updates", desc: "Keep prices synchronized" },
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