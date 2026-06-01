"use client";

import { useState, useEffect } from "react";
import { getWaterAdminSettings, saveWaterAdminSettings, type WaterAdminSettings } from "@/actions/water-log/settings";
import { useRouter } from "next/navigation";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default function WaterLogSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<WaterAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [sessionDuration, setSessionDuration] = useState(12);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canExport, setCanExport] = useState(true);
  const [alertPhone, setAlertPhone] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const data = await getWaterAdminSettings(TUXEDO_BRAND_ID);
    if (data) {
      setSettings(data);
      setEnabled(data.enabled);
      setSessionDuration(data.session_duration_hours);
      setCanEdit(data.can_edit_entries);
      setCanDelete(data.can_delete_entries);
      setCanExport(data.can_export_csv);
      setAlertPhone(data.alert_phone ?? "");
      setAlertsEnabled(data.alerts_enabled ?? false);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (enabled && pin && pin !== confirmPin) {
      setMessage({ type: "error", text: "PINs do not match" });
      return;
    }
    if (enabled && pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      setMessage({ type: "error", text: "PIN must be exactly 4 digits" });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await saveWaterAdminSettings(TUXEDO_BRAND_ID, {
      enabled,
      pin: pin || undefined,
      session_duration_hours: sessionDuration,
      can_edit_entries: canEdit,
      can_delete_entries: canDelete,
      can_export_csv: canExport,
      alert_phone: alertPhone || null,
      alerts_enabled: alertsEnabled,
    });
    if (result.success) {
      setMessage({ type: "success", text: "Settings saved" });
      setPin("");
      setConfirmPin("");
    } else {
      setMessage({ type: "error", text: result.error ?? "Save failed" });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-zinc-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-400 text-sm">← Back</button>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Water Log — Admin Portal</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Configure PIN access for the field admin portal at /water/admin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-6 py-6">
        <form onSubmit={handleSave} className="space-y-6">

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === "success" ? "bg-green-900/40 text-green-800 border border-green-200" : "bg-red-900/40 text-red-800 border border-red-200"}`}>
              {message.text}
            </div>
          )}

          {/* Enable toggle */}
          <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-100">Enable Admin Portal</p>
                <p className="text-xs text-zinc-500 mt-0.5">Allow PIN-based access to /water/admin (separate from platform login)</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-stone-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {enabled && (
            <>
              {/* PIN */}
              <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-5 space-y-4">
                <p className="font-semibold text-zinc-100">4-Digit PIN</p>
                <p className="text-xs text-zinc-500">Leave blank to keep existing PIN. Set a new PIN to replace it.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">New PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-stone-900"
                      style={{ letterSpacing: "0.4em" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Confirm PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-stone-900"
                      style={{ letterSpacing: "0.4em" }}
                    />
                  </div>
                </div>
              </div>

              {/* Session Duration */}
              <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-5 space-y-3">
                <p className="font-semibold text-zinc-100">Session Duration</p>
                <p className="text-xs text-zinc-500">How long the admin session lasts after login (1–72 hours).</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={72}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-16 text-center text-sm font-bold text-zinc-100">{sessionDuration}h</span>
                </div>
              </div>

              {/* Permissions */}
              <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-5 space-y-3">
                <p className="font-semibold text-zinc-100">Permissions</p>
                {[
                  { key: "canEdit", label: "Edit entries", desc: "Allow modifying existing log entries", value: canEdit, setter: setCanEdit },
                  { key: "canDelete", label: "Delete entries", desc: "Allow removing log entries", value: canDelete, setter: setCanDelete },
                  { key: "canExport", label: "Export CSV", desc: "Allow exporting water log data", value: canExport, setter: setCanExport },
                ].map(({ key, label, desc, value, setter }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{label}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setter((v: boolean) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-green-500" : "bg-stone-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* High/Low Alerts */}
              <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-5 space-y-4">
                <p className="font-semibold text-zinc-100">High/Low Alerts</p>
                <p className="text-xs text-zinc-500">Receive an SMS when a reading exceeds a headgate's thresholds.</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Enable Alerts</p>
                    <p className="text-xs text-zinc-500">SMS on threshold breach</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertsEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alertsEnabled ? "bg-green-500" : "bg-stone-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-zinc-900 transition-transform ${alertsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {alertsEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Alert Phone Number</label>
                    <input
                      type="tel"
                      value={alertPhone}
                      onChange={(e) => setAlertPhone(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full rounded-xl border border-zinc-600 px-4 py-3 text-base outline-none focus:border-stone-900"
                    />
                    <p className="text-xs text-zinc-500 mt-1">U.S. format recommended. Must include country code (e.g. +1 for USA).</p>
                  </div>
                )}
              </div>

              {/* QR hint */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs text-amber-700">
                  <strong>QR Lock:</strong> Irrigators can lock a headgate by visiting <code className="bg-amber-900/40 px-1 rounded">/water?h={'{headgate_token}'}</code>.
                </p>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-stone-900 px-6 py-4 text-base font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}