"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWaterEntries, getWaterDisplaySummary, getWaterIrrigators, getWaterHeadgatesAdmin, createWaterIrrigator, createWaterHeadgate, getWaterAlertLog, type WaterDisplaySummary, type WaterDisplayHeadgate, type AlertLogEntry } from "@/actions/water-log/admin";
import { logoutWaterAdmin } from "@/actions/water-log/field";

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

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

const LABELS = {
  en: {
    title: "Water Log Admin",
    loggedInAs: "Logged in as",
    logout: "Salir",
    recentEntries: "Entradas Recientes",
    noEntries: "No entries yet",
    when: "Fecha",
    user: "Usuario",
    headgate: "Compuerta",
    measurement: "Medición",
    via: "Vía",
    field: "Campo",
    admin: "Admin",
    exportCSV: "Export CSV",
    clearFilters: "Clear",
    displaySummary: "Resumen de Pantalla",
    todayCount: "Entradas de hoy",
    lastUpdate: "Última actualización",
    refreshIn: "Refresh in",
    noHeadgates: "Sin compuertas activas",
    noLatest: "Sin lecturas",
    noEntriesToday: "Sin entradas hoy",
    recentEntriesLabel: "Entradas recientes",
    headgates: "Headgates",
    users: "Users",
    addHeadgate: "Add Headgate",
    addUser: "Add User",
    edit: "Edit",
    cancel: "Cancel",
    name: "Name",
    unit: "Unit",
    active: "Active",
    inactive: "Inactive",
    role: "Role",
    language: "Language",
    pin: "PIN",
    newPinFor: "New PIN for",
    writeThisDown: "Write this down — it will not be shown again.",
    dismiss: "Dismiss",
    saving: "Saving...",
  },
  es: {
    title: "Admin Registro de Agua",
    loggedInAs: "Conectado como",
    logout: "Salir",
    recentEntries: "Entradas Recientes",
    noEntries: "Sin entradas aún",
    when: "Fecha",
    user: "Usuario",
    headgate: "Compuerta",
    measurement: "Medición",
    via: "Vía",
    field: "Campo",
    admin: "Admin",
    exportCSV: "Exportar CSV",
    clearFilters: "Limpiar",
    displaySummary: "Resumen de Pantalla",
    todayCount: "Entradas de hoy",
    lastUpdate: "Última actualización",
    refreshIn: "Refresh in",
    noHeadgates: "Sin compuertas activas",
    noLatest: "Sin lecturas",
    noEntriesToday: "Sin entradas hoy",
    recentEntriesLabel: "Entradas recientes",
    headgates: "Compuertas",
    users: "Usuarios",
    addHeadgate: "Agregar Compuerta",
    addUser: "Agregar Usuario",
    edit: "Editar",
    cancel: "Cancelar",
    name: "Nombre",
    unit: "Unidad",
    active: "Activo",
    inactive: "Inactivo",
    role: "Rol",
    language: "Idioma",
    pin: "PIN",
    newPinFor: "Nuevo PIN para",
    writeThisDown: "Write this down — it will not be shown again.",
    dismiss: "Dismiss",
    saving: "Saving...",
  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const AGE_COLORS = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
};

const UNIT_OPTIONS = ["CFS", "GPM", "gal", "ac-in", "ac-ft"];

function HeadgateCard({ hg }: { hg: WaterDisplayHeadgate }) {
  const ageColor = (["green", "yellow", "red"] as const)[
    hg.minutes_ago === null ? 2 : hg.minutes_ago > 60 ? 1 : 0
  ];
  const ageLabel =
    hg.minutes_ago === null
      ? "Never"
      : hg.minutes_ago < 2
      ? "Just now"
      : hg.minutes_ago < 60
      ? `${hg.minutes_ago}m ago`
      : `${Math.floor(hg.minutes_ago / 60)}h ago`;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 min-w-[140px] shrink-0">
      <p className="text-sm font-semibold text-stone-900 truncate">{hg.name}</p>
      {hg.latest_entry ? (
        <>
          <p className="mt-1 text-xl font-bold text-stone-900">
            {hg.latest_entry.measurement}{" "}
            <span className="text-xs font-medium text-stone-500">{hg.unit}</span>
          </p>
          <p className="text-xs text-stone-400">{hg.latest_entry.user_name}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${AGE_COLORS[ageColor]}`}
          >
            {ageLabel}
          </span>
        </>
      ) : (
        <p className="mt-1 text-xs text-stone-400">{LABELS.en.noLatest}</p>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  onToggle,
  action,
}: {
  title: string;
  count?: number;
  onToggle: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-base font-bold text-stone-800 hover:text-stone-900"
      >
        <span className="text-stone-400">{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
            {count}
          </span>
        )}
      </button>
      {action}
    </div>
  );
}

export default function WaterAdminClient() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "es">("en");
  const [displaySummary, setDisplaySummary] = useState<WaterDisplaySummary | null>(null);
  const [displayLoading, setDisplayLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [allEntries, setAllEntries] = useState<WaterEntry[]>([]);
  const [users, setUsers] = useState<WaterUser[]>([]);
  const [headgates, setHeadgates] = useState<Headgate[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>([]);

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterHeadgate, setFilterHeadgate] = useState("");
  const [filterVia, setFilterVia] = useState("");

  // Section toggles
  const [showHeadgates, setShowHeadgates] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [showEntries, setShowEntries] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // Add forms
  const [showAddHg, setShowAddHg] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newPin, setNewPin] = useState<{ name: string; pin: string } | null>(null);

  // New user form
  const [newUserName, setNewUserName] = useState("");
  const [newUserLang, setNewUserLang] = useState<"en" | "es">("en");
  const [savingUser, setSavingUser] = useState(false);
  const [newUserError, setNewUserError] = useState<string | null>(null);

  // New headgate form
  const [newHgName, setNewHgName] = useState("");
  const [newHgUnit, setNewHgUnit] = useState("CFS");
  const [savingHg, setSavingHg] = useState(false);
  const [newHgError, setNewHgError] = useState<string | null>(null);

  const t = LABELS[lang];

  useEffect(() => {
    const savedLang = document.cookie.match(/wl_lang=(en|es)/)?.[1] as "en" | "es" | undefined;
    if (savedLang) setLang(savedLang);
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [entries, usersData, headgatesData, alertsData] = await Promise.all([
      getWaterEntries(TUXEDO_BRAND_ID, 500),
      getWaterIrrigators(TUXEDO_BRAND_ID),
      getWaterHeadgatesAdmin(TUXEDO_BRAND_ID),
      getWaterAlertLog(TUXEDO_BRAND_ID, 50),
    ]);
    setAllEntries(entries);
    setUsers(usersData);
    setHeadgates(headgatesData);
    setAlertLog(alertsData as AlertLogEntry[]);
    setLoading(false);
  };

  const loadDisplaySummary = useCallback(async () => {
    const data = await getWaterDisplaySummary(TUXEDO_BRAND_ID);
    setDisplaySummary(data);
    setDisplayLoading(false);
    setRefreshCountdown(30);
  }, []);

  useEffect(() => {
    loadDisplaySummary();
    const interval = setInterval(() => {
      setRefreshCountdown((c) => {
        if (c <= 1) {
          loadDisplaySummary();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loadDisplaySummary]);

  async function handleLogout() {
    await logoutWaterAdmin();
    window.location.href = "/water";
  }

  // Add user
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim()) return;
    setSavingUser(true);
    setNewUserError(null);
    const result = await createWaterIrrigator(TUXEDO_BRAND_ID, newUserName.trim(), newUserLang);
    if (result.success && result.pin) {
      setNewPin({ name: result.irrigator!.name, pin: result.pin });
      setNewUserName("");
      setShowAddUser(false);
      const updated = await getWaterIrrigators(TUXEDO_BRAND_ID);
      setUsers(updated);
    } else {
      setNewUserError(result.error ?? "Failed to add user");
    }
    setSavingUser(false);
  }

  // Add headgate
  async function handleAddHg(e: React.FormEvent) {
    e.preventDefault();
    if (!newHgName.trim()) return;
    setSavingHg(true);
    setNewHgError(null);
    const result = await createWaterHeadgate(TUXEDO_BRAND_ID, newHgName.trim(), newHgUnit);
    if (result.success) {
      setNewHgName("");
      setNewHgUnit("CFS");
      setShowAddHg(false);
      const updated = await getWaterHeadgatesAdmin(TUXEDO_BRAND_ID);
      setHeadgates(updated);
    } else {
      setNewHgError(result.error ?? "Failed to add headgate");
    }
    setSavingHg(false);
  }

  // Filtered entries
  const filteredEntries = allEntries.filter((e) => {
    if (filterDateFrom && e.logged_at < filterDateFrom) return false;
    if (filterDateTo && e.logged_at > filterDateTo + "T23:59:59.999Z") return false;
    if (filterHeadgate && e.headgate_id !== filterHeadgate) return false;
    if (filterVia && e.submitted_via !== filterVia) return false;
    return true;
  });

  const headgateOptions = Array.from(
    new Map(allEntries.map((e) => [e.headgate_id, e.headgate_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <div className="bg-stone-900 px-4 py-4 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{t.title}</h1>
            <p className="text-xs text-stone-400">{t.loggedInAs}: Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-medium text-white hover:bg-stone-600 min-h-[44px]"
          >
            {t.logout}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">

        {/* ── Display Summary ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-stone-700">{t.displaySummary}</h2>
            <span className="text-xs text-stone-400">
              {t.refreshIn}: {refreshCountdown}s
            </span>
          </div>
          {displayLoading ? (
            <div className="rounded-xl bg-white p-4 text-sm text-stone-400">Loading...</div>
          ) : displaySummary ? (
            <div className="space-y-3">
              <div>
                {displaySummary.headgates.length === 0 ? (
                  <p className="text-sm text-stone-400">{t.noHeadgates}</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {displaySummary.headgates.map((hg) => (
                      <HeadgateCard key={hg.id} hg={hg} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500">{t.todayCount}</span>
                  <p className="text-lg font-bold text-stone-900">
                    {displaySummary.today_count}
                    {displaySummary.today_count > 0 && (
                      <span className="ml-2 text-sm font-medium text-stone-500">
                        ({displaySummary.today_total.toFixed(1)} total)
                      </span>
                    )}
                  </p>
                </div>
                {displaySummary.recent_entries.length > 0 && (
                  <span className="text-xs text-stone-400">
                    {t.lastUpdate}: {formatDateTime(displaySummary.recent_entries[0]?.logged_at)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-4 text-sm text-stone-400">{t.noEntriesToday}</div>
          )}
        </section>

        {/* ── Headgates ── */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <SectionHeader
            title={`${t.headgates} (${headgates.length})`}
            count={headgates.length}
            onToggle={() => setShowHeadgates((v) => !v)}
            action={
              <button
                onClick={() => setShowAddHg((v) => !v)}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 min-h-[36px] min-w-[36px]"
              >
                +
              </button>
            }
          />

          {showAddHg && (
            <form onSubmit={handleAddHg} className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newHgName}
                onChange={(e) => setNewHgName(e.target.value)}
                placeholder={t.name}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm min-h-[44px]"
                required
              />
              <select
                value={newHgUnit}
                onChange={(e) => setNewHgUnit(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm min-h-[44px]"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  type="submit"
                  disabled={savingHg}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                >
                  {savingHg ? "..." : "+"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddHg(false); setNewHgError(null); }}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 min-h-[44px]"
                >
                  ×
                </button>
              </div>
            </form>
          )}
          {newHgError && (
            <div className="mb-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{newHgError}</div>
          )}

          {showHeadgates && (
            <div className="space-y-1">
              {loading ? (
                <p className="text-sm text-stone-400 py-2">Loading...</p>
              ) : headgates.length === 0 ? (
                <p className="text-sm text-stone-400 py-2">{t.noHeadgates}</p>
              ) : (
                headgates.map((hg) => (
                  <div
                    key={hg.id}
                    className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 hover:bg-stone-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 rounded-full w-2 h-2 ${hg.active ? "bg-green-400" : "bg-stone-300"}`} />
                      <span className="text-sm font-medium text-stone-900 truncate">{hg.name}</span>
                      <span className="text-xs text-stone-400 shrink-0">{hg.unit}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/water-log/headgates/${hg.id}?from=/water/admin`)}
                      className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 min-h-[36px]"
                    >
                      {t.edit}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── Users ── */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          {newPin && (
            <div className="mb-3 rounded-xl bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-semibold text-yellow-800">{t.newPinFor} {newPin.name}:</p>
              <p className="text-xl font-bold tracking-widest text-yellow-900">{newPin.pin}</p>
              <p className="mt-0.5 text-xs text-yellow-600">{t.writeThisDown}</p>
              <button
                onClick={() => setNewPin(null)}
                className="mt-1 text-xs text-yellow-700 underline"
              >
                {t.dismiss}
              </button>
            </div>
          )}

          <SectionHeader
            title={`${t.users} (${users.length})`}
            count={users.length}
            onToggle={() => setShowUsers((v) => !v)}
            action={
              <button
                onClick={() => setShowAddUser((v) => !v)}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 min-h-[36px] min-w-[36px]"
              >
                +
              </button>
            }
          />

          {showAddUser && (
            <form onSubmit={handleAddUser} className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder={t.name}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm min-h-[44px]"
                required
              />
              <select
                value={newUserLang}
                onChange={(e) => setNewUserLang(e.target.value as "en" | "es")}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm min-h-[44px]"
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <div className="flex gap-1">
                <button
                  type="submit"
                  disabled={savingUser}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                >
                  {savingUser ? "..." : "+"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddUser(false); setNewUserError(null); }}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 min-h-[44px]"
                >
                  ×
                </button>
              </div>
            </form>
          )}
          {newUserError && (
            <div className="mb-2 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">{newUserError}</div>
          )}

          {showUsers && (
            <div className="space-y-1">
              {loading ? (
                <p className="text-sm text-stone-400 py-2">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-stone-400 py-2">No users</p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 hover:bg-stone-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 rounded-full w-2 h-2 ${u.active ? "bg-green-400" : "bg-stone-300"}`} />
                      <span className="text-sm font-medium text-stone-900 truncate">{u.name}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${u.role === "water_admin" ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-600"}`}>
                        {u.role === "water_admin" ? t.admin : t.field}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/water-log/users/${u.id}?from=/water/admin`)}
                      className="shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 min-h-[36px]"
                    >
                      {t.edit}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── Entries ── */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <SectionHeader
            title={`${t.recentEntries} (${filteredEntries.length})`}
            count={filteredEntries.length}
            onToggle={() => setShowEntries((v) => !v)}
          />

          {showEntries && (
            <>
              {/* Filters */}
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm min-h-[36px]"
                />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm min-h-[36px]"
                />
                <select
                  value={filterHeadgate}
                  onChange={(e) => setFilterHeadgate(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm min-h-[36px]"
                >
                  <option value="">All</option>
                  {headgateOptions.map((hg) => (
                    <option key={hg.id} value={hg.id}>{hg.name}</option>
                  ))}
                </select>
                <select
                  value={filterVia}
                  onChange={(e) => setFilterVia(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm min-h-[36px]"
                >
                  <option value="">All via</option>
                  <option value="field">{t.field}</option>
                  <option value="admin">{t.admin}</option>
                </select>
                {(filterDateFrom || filterDateTo || filterHeadgate || filterVia) && (
                  <button
                    onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterHeadgate(""); setFilterVia(""); }}
                    className="text-xs text-stone-500 hover:text-stone-700 underline self-center"
                  >
                    {t.clearFilters}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-stone-100 text-left">
                      <th className="pb-2 pr-2 text-xs font-semibold text-stone-500 whitespace-nowrap">{t.when}</th>
                      <th className="pb-2 pr-2 text-xs font-semibold text-stone-500 whitespace-nowrap hidden sm:table-cell">{t.user}</th>
                      <th className="pb-2 pr-2 text-xs font-semibold text-stone-500 whitespace-nowrap">{t.headgate}</th>
                      <th className="pb-2 pr-2 text-xs font-semibold text-stone-500 text-right whitespace-nowrap">{t.measurement}</th>
                      <th className="pb-2 text-xs font-semibold text-stone-500 text-right whitespace-nowrap">{t.via}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="py-4 text-center text-stone-400">Loading...</td></tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-center text-stone-400">{allEntries.length === 0 ? t.noEntries : "No matches"}</td></tr>
                    ) : (
                      filteredEntries.map((e) => (
                        <tr
                          key={e.id}
                          onClick={() => router.push(`/admin/water-log/entries/${e.id}?from=/water/admin`)}
                          className="border-b border-stone-50 last:border-0 hover:bg-stone-50 cursor-pointer"
                        >
                          <td className="py-2 pr-2 text-stone-500 text-xs whitespace-nowrap">{formatDateTime(e.logged_at)}</td>
                          <td className="py-2 pr-2 text-stone-700 text-xs whitespace-nowrap hidden sm:table-cell">{e.user_name}</td>
                          <td className="py-2 pr-2 text-stone-700 text-xs whitespace-nowrap">{e.headgate_name}</td>
                          <td className="py-2 pr-2 text-right font-semibold text-stone-900 text-xs whitespace-nowrap">{e.measurement} {e.unit}</td>
                          <td className="py-2 text-right">
                            <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold ${e.submitted_via === "field" ? "bg-blue-100 text-blue-700" : "bg-stone-100 text-stone-600"}`}>
                              {e.submitted_via === "field" ? t.field[0] : t.admin[0]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ── Alert Log ── */}
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <SectionHeader
            title={`⚠️ Alert Log (${alertLog.length})`}
            count={alertLog.length}
            onToggle={() => setShowAlerts((v) => !v)}
          />

          {showAlerts && (
            <>
              {alertLog.length === 0 ? (
                <p className="text-sm text-stone-400 py-3 text-center">No alerts triggered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b border-stone-100 text-left">
                        <th className="pb-2 pr-2 text-xs font-semibold text-stone-500">Time</th>
                        <th className="pb-2 pr-2 text-xs font-semibold text-stone-500">Headgate</th>
                        <th className="pb-2 pr-2 text-xs font-semibold text-stone-500">Type</th>
                        <th className="pb-2 pr-2 text-xs font-semibold text-stone-500 text-right">Reading</th>
                        <th className="pb-2 text-xs font-semibold text-stone-500 text-right">Threshold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertLog.map((a) => (
                        <tr key={a.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50">
                          <td className="py-2 pr-2 text-stone-500 text-xs">{a.formatted_time}</td>
                          <td className="py-2 pr-2 text-stone-700 text-xs font-medium">{a.headgate_name}</td>
                          <td className="py-2 pr-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${a.alert_type === "high" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              {a.alert_type === "high" ? "High ↑" : "Low ↓"}
                            </span>
                          </td>
                          <td className="py-2 pr-2 text-right font-semibold text-stone-900 text-xs">{a.reading_value}</td>
                          <td className="py-2 text-right text-stone-500 text-xs">{a.threshold_value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  );
}