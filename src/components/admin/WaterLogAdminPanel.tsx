"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  createWaterHeadgate,
  createWaterUser,
  getWaterEntries,
} from "@/actions/water-log/admin";
import { downloadWaterLogCSV, filterWaterLogEntries, shapeWaterLogEntry, formatDailyWaterReport, isInIrrigationSeason, type WaterLogFilter, type WaterLogReportRow, type IrrigationSeasonSettings } from "@/lib/water-log-reporting";
import { AdminButton } from "./design-system";

type WaterUser = {
  id: string;
  name: string;
  role: "irrigator" | "water_admin";
  active: boolean;
  language_preference: string;
  last_used_at: string | null;
  created_at: string;
};

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  unit: string;
  created_at: string;
};

type WaterEntry = {
  id: string;
  headgate_id: string;
  user_id: string;
  headgate_name: string;
  user_name: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
  logged_at: string;
};

type WaterLogAdminPanelProps = {
  initialUsers: WaterUser[];
  initialHeadgates: Headgate[];
  initialEntries: WaterEntry[];
  brandId: string;
  canManage: boolean;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WaterLogAdminPanel({
  initialUsers,
  initialHeadgates,
  initialEntries,
  brandId,
  canManage,
}: WaterLogAdminPanelProps) {
  const router = useRouter();
  const [users] = useState<WaterUser[]>(initialUsers);
  const [headgates, setHeadgates] = useState<Headgate[]>(initialHeadgates);
  const [entries] = useState<WaterEntry[]>(initialEntries);

  // ── Headgate add state ────────────────────────────
  const [showAddHg, setShowAddHg] = useState(false);
  const [newHgName, setNewHgName] = useState("");
  const [newHgUnit, setNewHgUnit] = useState("CFS");
  const [savingHg, setSavingHg] = useState(false);

  // ── User add state ─────────────────────────────
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"irrigator" | "water_admin">("irrigator");
  const [newUserLang, setNewUserLang] = useState("en");
  const [savingUser, setSavingUser] = useState(false);
  const [newPin, setNewPin] = useState<{ name: string; pin: string } | null>(null);

  // ── CSV filter state ─────────────────────────────
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterHeadgate, setFilterHeadgate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterVia, setFilterVia] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  // ── Report / messaging settings (localStorage-persisted) ──
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [messagingEnabled, setMessagingEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wl_messaging_enabled") === "true";
  });
  const [seasonStart, setSeasonStart] = useState<IrrigationSeasonSettings>(() => {
    if (typeof window === "undefined") return { seasonStartMonth: 3, seasonStartDay: 15, seasonEndMonth: 10, seasonEndDay: 15 };
    const saved = localStorage.getItem("wl_season_settings");
    return saved ? JSON.parse(saved) : { seasonStartMonth: 3, seasonStartDay: 15, seasonEndMonth: 10, seasonEndDay: 15 };
  });
  const [sendEvenIfEmpty, setSendEvenIfEmpty] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wl_send_even_if_empty") === "true";
  });
  const [recipientName, setRecipientName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("wl_recipient_name") ?? "" : ""
  );
  const [recipientPhone, setRecipientPhone] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("wl_recipient_phone") ?? "" : ""
  );

  // Persist to localStorage on change
  function persistMessaging(val: boolean) {
    setMessagingEnabled(val);
    localStorage.setItem("wl_messaging_enabled", String(val));
  }
  function persistSendEvenIfEmpty(val: boolean) {
    setSendEvenIfEmpty(val);
    localStorage.setItem("wl_send_even_if_empty", String(val));
  }
  function persistSeason(s: IrrigationSeasonSettings) {
    setSeasonStart(s);
    localStorage.setItem("wl_season_settings", JSON.stringify(s));
  }
  function persistRecipientName(v: string) {
    setRecipientName(v);
    localStorage.setItem("wl_recipient_name", v);
  }
  function persistRecipientPhone(v: string) {
    setRecipientPhone(v);
    localStorage.setItem("wl_recipient_phone", v);
  }

  // ── Preview report ─────────────────────────────
  async function handlePreviewReport() {
    const allEntries = await getWaterEntries(brandId, 500);
    const today = new Date().toISOString().split("T")[0];
    const todayRows: WaterLogReportRow[] = allEntries
      .filter((e) => e.logged_at.startsWith(today))
      .map(shapeWaterLogEntry);

    const inSeason = isInIrrigationSeason(new Date(), seasonStart);
    const report = formatDailyWaterReport(todayRows, {
      recipientName: recipientName || undefined,
      sendEvenIfEmpty,
      previewMode: true,
    });

    if (!report) {
      alert(`[Preview] No entries today — report would be skipped (outside season: ${inSeason ? "in" : "out"}).`);
    } else {
      alert(`[Daily Report Preview — ${inSeason ? "in season" : "out of season"}]\n\n${report}`);
    }
  }

  // ── Headgate handlers ────────────────────────────
  async function handleAddHg(e: React.FormEvent) {
    e.preventDefault();
    if (!newHgName.trim()) return;
    setSavingHg(true);
    const result = await createWaterHeadgate(brandId, newHgName.trim(), newHgUnit);
    if (result.success && result.headgate) {
      setHeadgates((prev) => [...prev, result.headgate!]);
      setNewHgName("");
      setNewHgUnit("CFS");
      setShowAddHg(false);
    }
    setSavingHg(false);
  }

  // ── User handlers ─────────────────────────────
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim()) return;
    setSavingUser(true);
    const result = await createWaterUser(brandId, newUserName.trim(), newUserRole, newUserLang);
    if (result.success && result.user) {
      setNewPin({ name: result.user!.name, pin: result.pin! });
      setNewUserName("");
      setNewUserRole("irrigator");
      setNewUserLang("en");
      setShowAddUser(false);
    }
    setSavingUser(false);
  }

  // ── CSV export ──────────────────────────────────
  async function handleExportCSV() {
    setCsvLoading(true);
    try {
      const allEntries = await getWaterEntries(brandId, 500);
      const shaped: WaterLogReportRow[] = allEntries.map(shapeWaterLogEntry);
      const filters: WaterLogFilter = {
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        headgateId: filterHeadgate || undefined,
        userId: filterUser || undefined,
        submittedVia: filterVia || undefined,
      };
      const filtered = filterWaterLogEntries(shaped, filters);
      const date = new Date().toISOString().split("T")[0];
      downloadWaterLogCSV(`water-log-${date}.csv`, filtered);
    } finally {
      setCsvLoading(false);
    }
  }

  // Derived filtered entries for display
  const filteredEntries = entries.filter((e) => {
    if (filterDateFrom && e.logged_at < filterDateFrom) return false;
    if (filterDateTo && e.logged_at > filterDateTo + "T23:59:59.999Z") return false;
    if (filterHeadgate && e.headgate_id !== filterHeadgate) return false;
    if (filterUser && e.user_id !== filterUser) return false;
    if (filterVia && e.submitted_via !== filterVia) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Navigation Actions */}
      <div className="flex gap-2">
        <AdminButton variant="secondary" onClick={() => router.push("/admin/water-log/headgates")}>
          📱 QR Codes
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => router.push("/admin/water-log/settings")}>
          ⚙️ Settings
        </AdminButton>
        <a href="/water/admin" target="_blank" rel="noopener noreferrer">
          <AdminButton variant="secondary">
            ↗️ Field Admin
          </AdminButton>
        </a>
      </div>

      {/* ── Today's Summary + Report Settings ── */}
      <section>
        {/* Summary card */}
        {(() => {
          const today = new Date().toISOString().split("T")[0];
          const todayEntries = entries.filter((e) => e.logged_at.startsWith(today));
          const inSeason = isInIrrigationSeason(new Date(), seasonStart);
          const totalMeasurement = todayEntries.reduce((s, e) => s + e.measurement, 0);
          const lastEntry = todayEntries.length > 0
            ? todayEntries.reduce((a, b) => (a.logged_at > b.logged_at ? a : b))
            : null;

          return (
            <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Today&apos;s Summary</h2>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                    {inSeason
                      ? <span className="text-green-600 font-medium">In irrigation season</span>
                      : <span className="text-orange-500 font-medium">Outside irrigation season</span>
                    } &nbsp;·&nbsp; {todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <AdminButton variant="secondary" onClick={handlePreviewReport}>
                    Preview Report
                  </AdminButton>
                  <AdminButton 
                    variant={showReportSettings ? "primary" : "secondary"} 
                    onClick={() => setShowReportSettings(!showReportSettings)}
                  >
                    Report Settings
                  </AdminButton>
                </div>
              </div>

              {todayEntries.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)]">Total measurement</p>
                    <p className="mt-0.5 text-xl font-bold text-[var(--admin-text-primary)]">{totalMeasurement.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)]">Last entry</p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--admin-text-secondary)]">{lastEntry?.headgate_name}</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">{lastEntry ? formatDateTime(lastEntry.logged_at) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--admin-text-muted)]">Messaging</p>
                    <p className={`mt-0.5 text-sm font-semibold ${messagingEnabled ? "text-green-600" : "text-[var(--admin-text-muted)]"}`}>
                      {messagingEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">No entries recorded today.</p>
              )}
            </div>
          );
        })()}

        {/* Report settings panel */}
        {showReportSettings && (
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Report / Messaging Settings</p>
              <button onClick={() => setShowReportSettings(false)} className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]">Close</button>
            </div>

            <div className="p-3 mb-3 rounded-lg bg-blue-100 border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Preview only.</strong> These settings are local to this browser. Live scheduled WhatsApp/SMS delivery requires a future database settings table and messaging integration.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Messaging enabled</label>
                <button
                  onClick={() => persistMessaging(!messagingEnabled)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${messagingEnabled ? "bg-green-100 border-green-300 text-green-800" : "bg-white border-[var(--admin-border)] text-[var(--admin-text-muted)]"}`}
                >
                  {messagingEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Send even if empty</label>
                <button
                  onClick={() => persistSendEvenIfEmpty(!sendEvenIfEmpty)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${sendEvenIfEmpty ? "bg-green-100 border-green-300 text-green-800" : "bg-white border-[var(--admin-border)] text-[var(--admin-text-muted)]"}`}
                >
                  {sendEvenIfEmpty ? "ON" : "OFF"}
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Season start (month/day)</label>
                <div className="flex gap-1">
                  <select
                    value={seasonStart.seasonStartMonth}
                    onChange={(e) => persistSeason({ ...seasonStart, seasonStartMonth: parseInt(e.target.value) })}
                    className="flex-1 rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("en", { month: "short" })}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={seasonStart.seasonStartDay}
                    onChange={(e) => persistSeason({ ...seasonStart, seasonStartDay: parseInt(e.target.value) || 1 })}
                    className="w-16 rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Season end (month/day)</label>
                <div className="flex gap-1">
                  <select
                    value={seasonStart.seasonEndMonth}
                    onChange={(e) => persistSeason({ ...seasonStart, seasonEndMonth: parseInt(e.target.value) })}
                    className="flex-1 rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("en", { month: "short" })}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={seasonStart.seasonEndDay}
                    onChange={(e) => persistSeason({ ...seasonStart, seasonEndDay: parseInt(e.target.value) || 1 })}
                    className="w-16 rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Recipient name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => persistRecipientName(e.target.value)}
                  placeholder="David"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Recipient phone</label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => persistRecipientPhone(e.target.value)}
                  placeholder="+1..."
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Headgates ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Headgates</h2>
          {!showAddHg && (
            <AdminButton onClick={() => setShowAddHg(true)}>
              + Add Headgate
            </AdminButton>
          )}
        </div>

        {showAddHg && (
          <form onSubmit={handleAddHg} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newHgName}
              onChange={(e) => setNewHgName(e.target.value)}
              placeholder="Headgate name"
              className="flex-1 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)]"
              autoFocus
            />
            <select
              value={newHgUnit}
              onChange={(e) => setNewHgUnit(e.target.value)}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
            >
              <option value="CFS">CFS</option>
              <option value="GPM">GPM</option>
              <option value="gal">gal</option>
              <option value="ac-in">ac-in</option>
              <option value="ac-ft">ac-ft</option>
            </select>
            <AdminButton type="submit" disabled={savingHg || !newHgName.trim()} isLoading={savingHg}>
              Add
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => { setShowAddHg(false); setNewHgName(""); }}>Cancel</AdminButton>
          </form>
        )}

        <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
          {headgates.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--admin-text-muted)]">No headgates yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Unit</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {headgates.map((hg) => (
                  <tr key={hg.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">{hg.name}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{hg.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${hg.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {hg.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)] text-xs">{formatDateTime(hg.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/water-log/headgates/${hg.id}`)}
                        className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Water Users ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Water Users</h2>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
              <span className="font-medium text-blue-600">Admin</span> = manage headgates, users, entries &nbsp;|&nbsp;
              <span className="font-medium text-green-600">Irrigator</span> = submit entries only
            </p>
          </div>
          {!showAddUser && (
            <AdminButton onClick={() => setShowAddUser(true)}>
              + Add User
            </AdminButton>
          )}
        </div>

        {showAddUser && (
          <form onSubmit={handleAddUser} className="mb-4 rounded-xl border border-[var(--admin-border)] bg-white p-4 space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "irrigator" | "water_admin")}
                  className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                >
                  <option value="irrigator">Irrigator</option>
                  <option value="water_admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-text-muted)] mb-1">Language</label>
                <select
                  value={newUserLang}
                  onChange={(e) => setNewUserLang(e.target.value)}
                  className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={savingUser || !newUserName.trim()} isLoading={savingUser}>
                Add User
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={() => { setShowAddUser(false); setNewUserName(""); setNewUserRole("irrigator"); setNewUserLang("en"); }}>
                Cancel
              </AdminButton>
            </div>
          </form>
        )}

        {/* PIN display banner */}
        {newPin && (
          <div className="mb-4 rounded-xl bg-amber-100 border border-amber-200 p-4">
            <p className="font-semibold text-amber-800">New PIN for {newPin.name}:</p>
            <p className="mt-1 text-2xl font-bold tracking-widest text-amber-900">{newPin.pin}</p>
            <p className="mt-1 text-xs text-amber-600">Write this down — it will not be shown again.</p>
            <button onClick={() => setNewPin(null)} className="mt-2 text-xs text-amber-700 underline">Dismiss</button>
          </div>
        )}

        <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
          {users.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--admin-text-muted)]">No water users yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Name</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Role</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)] hidden md:table-cell">Language</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)] hidden lg:table-cell">Last Used</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)]">
                    <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">{user.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        user.role === "water_admin" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {user.role === "water_admin" ? "Admin" : "Irrigator"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${user.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[var(--admin-text-muted)] text-xs">
                      {user.language_preference === "es" ? "Español" : "English"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[var(--admin-text-muted)] text-xs">{formatDateTime(user.last_used_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/water-log/users/${user.id}`)}
                        className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Entries + CSV Export ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Recent Entries</h2>
          <AdminButton onClick={handleExportCSV} isLoading={csvLoading}>
            Export CSV
          </AdminButton>
        </div>

        {/* Filters */}
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
            placeholder="From"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
            placeholder="To"
          />
          <select
            value={filterHeadgate}
            onChange={(e) => setFilterHeadgate(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
          >
            <option value="">All headgates</option>
            {headgates.map((hg) => (
              <option key={hg.id} value={hg.id}>{hg.name}</option>
            ))}
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filterVia}
            onChange={(e) => setFilterVia(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5 text-sm"
          >
            <option value="">All via</option>
            <option value="field">Field</option>
            <option value="admin">Admin</option>
          </select>
          {(filterDateFrom || filterDateTo || filterHeadgate || filterUser || filterVia) && (
            <button
              onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterHeadgate(""); setFilterUser(""); setFilterVia(""); }}
              className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
          {filteredEntries.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--admin-text-muted)]">No entries{entries.length > 0 ? " match filters" : ""}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">When</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">User</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Headgate</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-right">Measurement</th>
                  <th className="px-4 py-3 font-semibold text-[var(--admin-text-muted)]">Via</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)]">
                    <td className="px-4 py-3 text-[var(--admin-text-muted)] text-xs">{formatDateTime(e.logged_at)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">{e.user_name}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{e.headgate_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--admin-text-primary)]">{e.measurement} {e.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${e.submitted_via === "field" ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-500"}`}>
                        {e.submitted_via}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/water-log/entries/${e.id}`)}
                        className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}