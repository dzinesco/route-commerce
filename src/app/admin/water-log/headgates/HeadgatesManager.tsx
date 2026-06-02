"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getWaterHeadgatesAdmin,
  createWaterHeadgate,
  regenerateHeadgateToken,
  updateWaterHeadgate,
} from "@/actions/water-log/admin";
import { AdminButton } from "@/components/admin/design-system";

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  unit: string;
  created_at: string;
  deleted_at?: string | null;
  headgate_token?: string | null;
  last_used_at?: string | null;
  high_threshold?: number | null;
  low_threshold?: number | null;
};

type Props = {
  initialHeadgates: Headgate[];
  brandId: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function HeadgatesManager({ initialHeadgates, brandId }: Props) {
  const router = useRouter();
  const [headgates, setHeadgates] = useState<Headgate[]>(initialHeadgates);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("CFS");
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<Headgate | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printLoading, setPrintLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Edit modal state
  const [editHg, setEditHg] = useState<Headgate | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("CFS");
  const [editActive, setEditActive] = useState(true);
  const [editHigh, setEditHigh] = useState("");
  const [editLow, setEditLow] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function openEdit(hg: Headgate) {
    setEditHg(hg);
    setEditName(hg.name);
    setEditUnit(hg.unit);
    setEditActive(hg.active);
    setEditHigh(hg.high_threshold != null ? String(hg.high_threshold) : "");
    setEditLow(hg.low_threshold != null ? String(hg.low_threshold) : "");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editHg) return;
    setEditSaving(true);
    const res = await updateWaterHeadgate(
      editHg.id,
      editName,
      editActive,
      editUnit,
      editHigh ? parseFloat(editHigh) : null,
      editLow ? parseFloat(editLow) : null
    );
    if (res.success) {
      const refreshed = await getWaterHeadgatesAdmin(brandId);
      setHeadgates(refreshed);
      setEditHg(null);
      showToast("Headgate updated");
    } else {
      showToast(res.error ?? "Failed", false);
    }
    setEditSaving(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await createWaterHeadgate(brandId, newName.trim(), newUnit);
    if (res.success) {
      const refreshed = await getWaterHeadgatesAdmin(brandId);
      setHeadgates(refreshed);
      setNewName("");
      setShowAdd(false);
      showToast("Headgate added");
    } else {
      showToast(res.error ?? "Failed", false);
    }
    setSaving(false);
  }

  async function handleRegenerate(hg: Headgate) {
    if (!confirm(`Regenerate token for "${hg.name}"? Existing QR codes will stop working.`)) return;
    const res = await regenerateHeadgateToken(hg.id);
    if (res.success) {
      setHeadgates((prev) =>
        prev.map((h) => (h.id === hg.id ? { ...h, headgate_token: res.token! } : h))
      );
      showToast("Token regenerated");
    } else {
      showToast(res.error ?? "Failed", false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === headgates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(headgates.map((h) => h.id)));
    }
  }

  async function printSelected() {
    if (selected.size === 0) return;
    setPrintLoading(true);
    const hgs = headgates.filter((h) => selected.has(h.id));
    try {
      const res = await fetch("/api/water-qr-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headgates: hgs, baseUrl: BASE_URL }),
      });
      const html = await res.text();
      openPrintWindow(html);
    } finally {
      setPrintLoading(false);
    }
  }

  async function openPrintWindow(html: string) {
    const w = window.open("", "_blank", "width=700,height=700");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--admin-border)] px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] text-sm">← Back</button>
              <h1 className="text-2xl font-bold text-[var(--admin-text-primary)]">Headgates & QR Codes</h1>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Manage headgates and generate QR codes for field access</p>
          </div>
          <AdminButton onClick={() => setShowAdd(true)}>
            + Add Headgate
          </AdminButton>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">

        {/* Bulk actions bar */}
        {headgates.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
            <button onClick={toggleAll} className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]">
              {selected.size === headgates.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-[var(--admin-text-muted)]">|</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{selected.size} selected</span>
            <div className="flex-1" />
            <AdminButton
              onClick={printSelected}
              disabled={selected.size === 0}
              isLoading={printLoading}
            >
              Print {selected.size > 0 ? `(${selected.size})` : ""} QR Codes
            </AdminButton>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
            <form onSubmit={handleAdd} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">Headgate Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. North Field Gate 1"
                  className="w-full rounded-xl border border-[var(--admin-border)] px-4 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">Unit</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-xl border border-[var(--admin-border)] px-3 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                >
                  {["CFS", "GPM", "Inches", "AF/Day"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <AdminButton type="submit" disabled={saving} isLoading={saving}>
                Create
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </AdminButton>
            </form>
          </div>
        )}

        {/* Table */}
        {headgates.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
            No headgates yet. Create one to get started.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] text-left">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" className="rounded" onChange={toggleAll} checked={selected.size === headgates.length} />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)]">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)]">Token</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)]">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)]">Last Used</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--admin-text-muted)] text-right">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {headgates.map((hg) => (
                  <tr key={hg.id} className={`border-b border-[var(--admin-border)] last:border-0 hover:bg-[var(--admin-bg-subtle)] ${selected.has(hg.id) ? "bg-blue-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" checked={selected.has(hg.id)} onChange={() => toggleSelect(hg.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--admin-text-primary)]">{hg.name}</span>
                        {hg.high_threshold != null && (
                          <span className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                            High: {hg.high_threshold}
                          </span>
                        )}
                        {hg.low_threshold != null && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 border border-blue-200 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                            Low: {hg.low_threshold}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-[var(--admin-text-muted)]">{hg.headgate_token?.slice(0, 8)}…</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--admin-text-muted)]">{hg.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--admin-text-muted)]">
                        {hg.last_used_at
                          ? new Date(hg.last_used_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${hg.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                        {hg.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdminButton variant="secondary" size="sm" onClick={() => openEdit(hg)}>
                          Edit
                        </AdminButton>
                        {/* QR preview thumbnail */}
                        <button onClick={() => setQrModal(hg)} className="hover:opacity-80" title="View / Print QR">
                          <img
                            src={`/api/water-qr?token=${hg.headgate_token}&size=80`}
                            alt={`QR for ${hg.name}`}
                            className="w-10 h-10 rounded border border-[var(--admin-border)]"
                          />
                        </button>
                        <AdminButton variant="secondary" size="sm" onClick={() => setQrModal(hg)}>
                          Print
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.ok ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* Edit Modal */}
      {editHg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditHg(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[var(--admin-border)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border)]">
              <p className="font-bold text-[var(--admin-text-primary)]">Edit Headgate</p>
              <button onClick={() => setEditHg(null)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
            </div>
            <form onSubmit={handleEditSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--admin-border)] px-4 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-xl border border-[var(--admin-border)] px-3 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                  >
                    {["CFS", "GPM", "Inches", "AF/Day"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
                    Active
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">High Alert Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={editHigh}
                    onChange={(e) => setEditHigh(e.target.value)}
                    placeholder="e.g. 15.0"
                    className="w-full rounded-xl border border-[var(--admin-border)] px-4 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">Low Alert Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={editLow}
                    onChange={(e) => setEditLow(e.target.value)}
                    placeholder="e.g. 5.0"
                    className="w-full rounded-xl border border-[var(--admin-border)] px-4 py-3 text-sm outline-none focus:border-[var(--admin-accent)]"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--admin-text-muted)]">Leave thresholds blank to disable alerts for this headgate.</p>
              <div className="flex gap-2">
                <AdminButton type="submit" disabled={editSaving} isLoading={editSaving} fullWidth>
                  Save Changes
                </AdminButton>
                <AdminButton type="button" variant="secondary" onClick={() => setEditHg(null)}>
                  Cancel
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <QRModal hg={qrModal} onClose={() => setQrModal(null)} onRegenerate={handleRegenerate} />
      )}
    </div>
  );
}

function QRModal({ hg, onClose, onRegenerate }: { hg: Headgate; onClose: () => void; onRegenerate: (hg: Headgate) => void }) {
  const [tab, setTab] = useState<"preview" | "print" | "download">("preview");
  const [loading, setLoading] = useState(false);

  const code = hg.name.replace(/\s+/g, "-").toUpperCase().slice(0, 6) + "-1";
  const qrUrl = `/api/water-qr?token=${hg.headgate_token}&size=360`;
  const waterUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/water?h=${hg.headgate_token}`;

  async function handlePrintLabel() {
    setLoading(true);
    try {
      const res = await fetch("/api/water-qr-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: hg.headgate_token, name: hg.name }),
      });
      const html = await res.text();
      const w = window.open("", "_blank", "width=500,height=600");
      if (w) { w.document.write(html); w.document.close(); }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/water-qr?token=${hg.headgate_token}&size=400`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hg.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[var(--admin-border)]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-border)]">
          <div>
            <p className="font-bold text-[var(--admin-text-primary)]">{hg.name}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">QR Label Preview</p>
          </div>
          <button onClick={onClose} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Simplified label preview ── */}
        <div className="flex justify-center bg-[var(--admin-bg-subtle)] py-6 px-4">
          {/* Mini version of the new label design */}
          <div className="w-40 border-2 border-black rounded-lg p-3 text-center bg-white shadow-sm">
            <div className="text-xl font-black text-black leading-tight tracking-tight">{hg.name}</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 mb-3">{code}</div>
            <div className="flex justify-center mb-2">
              <img
                src={`/api/water-qr?token=${hg.headgate_token}&size=160`}
                alt="QR"
                className="w-28 h-28 rounded"
              />
            </div>
            <div className="text-[5.5px] text-gray-500 leading-tight break-all">{waterUrl}</div>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex border-b border-[var(--admin-border)]">
          {(["preview", "print", "download"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? "text-[var(--admin-text-primary)] border-b-2 border-[var(--admin-accent)]" : "text-[var(--admin-text-muted)]"}`}
            >
              {t === "preview" ? "Preview" : t === "print" ? "🖨️ Print" : "💾 Download"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {tab === "preview" ? (
            <div className="space-y-2 text-sm text-[var(--admin-text-secondary)]">
              <p>This label is optimized for physical signs and thermal printing:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--admin-text-muted)]">
                <li><strong>Large name</strong> (24pt bold) — scannable from distance</li>
                <li><strong>Short code</strong> (e.g. <code className="font-mono bg-[var(--admin-bg-subtle)] px-1 rounded">{code}</code>) — field reference</li>
                <li><strong>High-contrast QR</strong> — error correction H for outdoor use</li>
                <li><strong>Tiny URL</strong> at bottom — reference only</li>
              </ul>
              <AdminButton onClick={() => setTab("print")} fullWidth>
                🖨️ Print This Label
              </AdminButton>
            </div>
          ) : tab === "print" ? (
            <AdminButton onClick={handlePrintLabel} disabled={loading} isLoading={loading} fullWidth>
              🖨️ Print Label
            </AdminButton>
          ) : (
            <AdminButton onClick={handleDownload} disabled={loading} isLoading={loading} fullWidth>
              💾 Download PNG
            </AdminButton>
          )}

          <AdminButton
            onClick={() => { onRegenerate(hg); onClose(); }}
            variant="secondary"
            fullWidth
          >
            🔄 Regenerate Token
          </AdminButton>

          <div className="rounded-lg border border-[var(--admin-border)] p-3">
            <p className="text-xs text-[var(--admin-text-muted)] mb-1">Token</p>
            <code className="text-xs text-[var(--admin-text-secondary)] font-mono break-all">{hg.headgate_token}</code>
          </div>
        </div>
      </div>
    </div>
  );
}