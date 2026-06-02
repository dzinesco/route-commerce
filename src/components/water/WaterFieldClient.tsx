"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import {
  verifyWaterPin,
  submitWaterEntry,
  getWaterHeadgates,
  logoutWater,
  setWaterLang,
} from "@/actions/water-log/field";
import { useSearchParams } from "next/navigation";

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  high_threshold?: number | null;
  low_threshold?: number | null;
};

type Language = "en" | "es";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

const UNITS = ["CFS", "GPM", "Inches", "AF/Day"];

const LABELS = {
  en: {
    title: "Water Log",
    selectLang: "Select Language",
    whoAreYou: "Who are you?",
    enterPin: "Enter your 4-digit PIN",
    pinPlaceholder: "PIN",
    submit: "Submit Reading",
    loggingIn: "Verifying...",
    selectHeadgate: "Select Headgate",
    measurement: "Measurement",
    notes: "Notes (optional)",
    notesPlaceholder: "Notes...",
    unit: "Unit",
    loggedInAs: "Logged in as",
    logout: "Logout",
    submitting: "Submitting...",
    success: "Reading submitted!",
    error: "Error",
    noHeadgates: "No headgates available",
    invalidPin: "Invalid PIN",
    sessionExpired: "Session expired",
    back: "Back",
    captureGps: "Capture GPS",
    capturingGps: "Capturing...",
    gpsSuccess: "GPS Captured",
    gpsError: "GPS unavailable",
    gpsDenied: "Location denied. Tap to retry.",
    photoLabel: "Photo (optional)",
    addPhoto: "Add Photo",
    removePhoto: "Remove",
    headgateLocked: "QR-locked",
    locked: "Locked",
    highAlert: "High",
    lowAlert: "Low",
  },
  es: {
    title: "Registro de Agua",
    selectLang: "Seleccionar Idioma",
    whoAreYou: "¿Quién eres?",
    enterPin: "Ingrese su PIN de 4 dígitos",
    pinPlaceholder: "PIN",
    submit: "Enviar Lectura",
    loggingIn: "Verificando...",
    selectHeadgate: "Seleccionar Compuerta",
    measurement: "Medición",
    notes: "Notas (opcional)",
    notesPlaceholder: "Notas...",
    unit: "Unidad",
    loggedInAs: "Conectado como",
    logout: "Salir",
    submitting: "Enviando...",
    success: "¡Lectura registrada!",
    error: "Error",
    noHeadgates: "No hay compuertas disponibles",
    invalidPin: "PIN inválido",
    sessionExpired: "Sesión expirada",
    back: "Volver",
    captureGps: "Capturar GPS",
    capturingGps: "Capturando...",
    gpsSuccess: "GPS Capturado",
    gpsError: "GPS no disponible",
    gpsDenied: "Ubicación denegada. Toca para reintentar.",
    photoLabel: "Foto (opcional)",
    addPhoto: "Agregar Foto",
    removePhoto: "Quitar",
    headgateLocked: "Bloqueada por QR",
    locked: "Bloqueada",
    highAlert: "Alto",
    lowAlert: "Bajo",
  },
};

function ThresholdBadge({ high, low, t }: { high?: number | null; low?: number | null; t: typeof LABELS.en }) {
  if (!high && !low) return null;
  return (
    <div className="flex gap-1.5 mt-1">
      {high != null && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700">
          ⚠️ {t.highAlert}: {high}
        </span>
      )}
      {low != null && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
          ⚠️ {t.lowAlert}: {low}
        </span>
      )}
    </div>
  );
}

function WaterFieldInner() {
  const searchParams = useSearchParams();
  const qrHeadgateToken = searchParams.get("h");

  const [lang, setLang] = useState<Language>("en");
  const [step, setStep] = useState<"loading" | "lang" | "role" | "pin" | "form">("loading");
  const [pin, setPin] = useState("");
  const [irrigatorName, setIrrigatorName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"irrigator" | "water_admin" | null>(null);
  const [headgates, setHeadgates] = useState<Headgate[]>([]);
  const [selectedHeadgate, setSelectedHeadgate] = useState("");
  const [headgateLocked, setHeadgateLocked] = useState(false);
  const [measurement, setMeasurement] = useState("");
  const [unit, setUnit] = useState("CFS");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // GPS state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "success" | "error" | "denied">("idle");

  const t = LABELS[lang];

  // Detect saved language preference + check session
  useEffect(() => {
    const saved = document.cookie.match(/wl_lang=(en|es)/)?.[1] as Language | undefined;
    if (saved) setLang(saved);

    const match = document.cookie.match(/wl_session=([^;]+)/);
    if (match) {
      // Already logged in
      loadHeadgates();
      setStep("form");
    } else {
      setStep("lang");
    }
  }, []);

  // Handle QR-locked headgate after headgates load
  useEffect(() => {
    if (qrHeadgateToken && headgates.length > 0) {
      const matched = headgates.find((hg) => hg.id === qrHeadgateToken || hg.name === qrHeadgateToken);
      if (matched) {
        setSelectedHeadgate(matched.id);
        setHeadgateLocked(true);
      }
    }
  }, [qrHeadgateToken, headgates]);

  async function loadHeadgates() {
    const hgs = await getWaterHeadgates(TUXEDO_BRAND_ID, true);
    setHeadgates(hgs.filter((h) => h.active));
  }

  // Show loading spinner next to headgate dropdown
  const isLoadingHeadgates = step === "form" && headgates.length === 0;

  async function handleLangSelect(lang: Language) {
    setLang(lang);
    await setWaterLang(lang);
    setStep("role");
    setError("");
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true);
    setError("");

    const result = await verifyWaterPin(TUXEDO_BRAND_ID, pin);

    if (!result.success) {
      setError(result.error === "Invalid PIN" ? LABELS[lang].invalidPin : result.error);
      setPin("");
      setLoading(false);
      return;
    }

    if (result.role === "water_admin") {
      window.location.href = "/water/admin";
      return;
    }

    setIrrigatorName(result.name ?? "");
    await loadHeadgates();
    setStep("form");
    setLoading(false);
  }

  async function handleCaptureGps() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("capturing");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsStatus("success");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
        } else {
          setGpsStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG or PNG photos allowed");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handleSubmitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHeadgate || !measurement) return;
    setLoading(true);
    setError("");

    let photoUrl: string | undefined;
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("bucket", "water-log-photos");
      try {
        const uploadRes = await fetch("/api/water-photo-upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          photoUrl = uploadData.url;
        }
      } catch {
        // photo upload failed — submit without photo
      }
    }

    const result = await submitWaterEntry(
      selectedHeadgate,
      parseFloat(measurement),
      unit,
      notes,
      photoUrl,
      latitude ?? undefined,
      longitude ?? undefined,
      headgateLocked
    );

    if (!result.success) {
      if (result.error === "Session expired or invalid" || result.error === "Not logged in") {
        setStep("lang");
        setPin("");
        setError(LABELS[lang].sessionExpired);
      } else {
        setError(result.error);
      }
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMeasurement("");
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setLatitude(null);
    setLongitude(null);
    setGpsStatus("idle");
    setLoading(false);

    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleLogout() {
    await logoutWater();
    setStep("lang");
    setPin("");
    setIrrigatorName("");
    setHeadgates([]);
    setSelectedHeadgate("");
    setMeasurement("");
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setLatitude(null);
    setLongitude(null);
    setGpsStatus("idle");
    setHeadgateLocked(false);
  }

  // Language selection screen
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="w-12 h-12 rounded-full border-3 border-stone-300 border-t-stone-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-base">Loading...</p>
        </div>
      </div>
    );
  }

  // Language selection screen
  if (step === "lang") {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <h1 className="text-3xl font-bold text-stone-900 mb-2 text-center">{t.title}</h1>
          <p className="text-stone-500 text-center mb-8">{t.selectLang}</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleLangSelect("en")}
              className="w-full rounded-xl bg-white px-6 py-5 text-xl font-semibold text-stone-900 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 min-h-[64px]"
            >
              English
            </button>
            <button
              onClick={() => handleLangSelect("es")}
              className="w-full rounded-xl bg-white px-6 py-5 text-xl font-semibold text-stone-900 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 min-h-[64px]"
            >
              Español
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Role selection screen
  if (step === "role") {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <button
            onClick={() => setStep("lang")}
            className="text-sm text-stone-500 mb-6 hover:text-stone-700"
          >
            ← {t.back}
          </button>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 text-center">{t.title}</h1>
          <p className="text-stone-500 text-center mb-8">{t.whoAreYou}</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { setSelectedRole("irrigator"); setStep("pin"); }}
              className="w-full rounded-xl bg-white px-6 py-5 text-xl font-semibold text-stone-900 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 min-h-[64px]"
            >
              Irrigator
            </button>
            <button
              onClick={() => { setSelectedRole("water_admin"); setStep("pin"); }}
              className="w-full rounded-xl bg-stone-900 px-6 py-5 text-xl font-semibold text-white shadow-sm ring-1 ring-stone-700 hover:bg-stone-800 min-h-[64px]"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PIN entry screen
  if (step === "pin") {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <button
            onClick={() => setStep("role")}
            className="text-sm text-stone-500 mb-6 hover:text-stone-700"
          >
            ← {t.back}
          </button>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 text-center">{t.title}</h1>
          <p className="text-stone-500 text-center mb-8">{t.enterPin}</p>

          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder={t.pinPlaceholder}
              className="w-full rounded-xl border-2 border-stone-300 px-6 py-6 text-center text-4xl font-bold tracking-widest outline-none focus:border-stone-900 mb-4"
              style={{ letterSpacing: "0.3em" }}
              autoFocus
            />
            {error && (
              <p className="text-center text-red-600 text-sm mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={pin.length !== 4 || loading}
              className="w-full rounded-xl bg-stone-900 px-6 py-5 text-xl font-bold text-white disabled:opacity-50 min-h-[64px]"
            >
              {loading ? t.loggingIn : t.submit}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main log form
  const selectedHg = headgates.find((hg) => hg.id === selectedHeadgate);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 px-4 py-4">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{t.title}</h1>
            <p className="text-sm text-stone-400">{t.loggedInAs}: {irrigatorName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-600 transition-colors min-h-[44px]"
          >
            {t.logout}
          </button>
        </div>
      </div>

      {/* Step progress indicator */}
      <div className="bg-stone-100 border-b border-stone-200 px-4 py-2">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-1.5">
            {["lang", "role", "pin", "form"].map((s, i) => {
              const stepIndex = ["lang", "role", "pin", "form"].indexOf(step as string);
              const isActive = step === s;
              const isPast = stepIndex > i;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-600" : isPast ? "bg-green-400" : "bg-stone-300"}`} />
                  {i < 3 && <div className={`w-6 h-0.5 ${isPast ? "bg-green-400" : "bg-stone-300"}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Success banner */}
        {success && (
          <div className="rounded-xl bg-green-100 border border-green-200 px-4 py-4 text-center text-green-800 font-semibold">
            ✓ {t.success}
          </div>
        )}

        {/* Error banner */}
        {error && !success && (
          <div className="rounded-xl bg-red-100 border border-red-200 px-4 py-4 text-center text-red-800 font-semibold">
            {t.error}: {error}
          </div>
        )}

        {/* Headgate selector */}
        <div>
          <label className="block text-base font-semibold text-stone-700 mb-2">
            {t.selectHeadgate}
          </label>
          {headgateLocked ? (
            <div className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-lg font-bold text-stone-900">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                {selectedHg?.name ?? selectedHeadgate}
                <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                  🔒 {t.locked}
                </span>
              </div>
              {selectedHg && (
                <ThresholdBadge high={selectedHg.high_threshold} low={selectedHg.low_threshold} t={t} />
              )}
            </div>
          ) : isLoadingHeadgates ? (
            <div className="w-full rounded-xl border-2 border-stone-300 bg-stone-100 px-4 py-5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-stone-400 border-t-stone-700 animate-spin" />
              <span className="text-stone-500 text-base font-medium">Loading headgates...</span>
            </div>
          ) : (
            <select
              value={selectedHeadgate}
              onChange={(e) => setSelectedHeadgate(e.target.value)}
              required
              className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-4 text-lg outline-none focus:border-stone-900 min-h-[56px] appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", backgroundSize: "20px" }}
            >
              <option value="" disabled>{t.selectHeadgate}</option>
              {headgates.length === 0 && <option disabled>{t.noHeadgates}</option>}
              {headgates.map((hg) => (
                <option key={hg.id} value={hg.id}>
                  {hg.name}
                  {hg.high_threshold != null ? ` (High: ${hg.high_threshold})` : ""}
                  {hg.low_threshold != null ? ` (Low: ${hg.low_threshold})` : ""}
                </option>
              ))}
            </select>
          )}
          {selectedHg && !headgateLocked && (
            <ThresholdBadge high={selectedHg.high_threshold} low={selectedHg.low_threshold} t={t} />
          )}
        </div>

        {/* Measurement + Unit row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-base font-semibold text-stone-700 mb-2">
              {t.measurement}
            </label>
            <input
              type="number"
              step="any"
              value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-xl border-2 border-stone-300 px-4 py-4 text-2xl font-bold text-stone-900 outline-none focus:border-stone-900 min-h-[60px]"
              inputMode="decimal"
            />
          </div>
          <div className="w-32">
            <label className="block text-base font-semibold text-stone-700 mb-2">
              {t.unit}
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-4 text-lg font-semibold outline-none focus:border-stone-900 min-h-[60px]"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* GPS Capture */}
        <div>
          <label className="block text-base font-semibold text-stone-700 mb-2">
            GPS Location
          </label>
          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={gpsStatus === "capturing"}
            className={`w-full rounded-xl border-2 px-4 py-4 text-base font-semibold transition-colors flex items-center justify-center gap-2 min-h-[56px] ${
              gpsStatus === "success"
                ? "border-green-500 bg-green-50 text-green-700"
                : gpsStatus === "denied" || gpsStatus === "error"
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {gpsStatus === "capturing" && (
              <span className="w-5 h-5 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin flex-shrink-0" />
            )}
            {gpsStatus === "success" && "✓"}
            {gpsStatus === "capturing" && t.capturingGps}
            {gpsStatus === "idle" && t.captureGps}
            {gpsStatus === "success" && `${t.gpsSuccess} — ${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`}
            {gpsStatus === "error" && t.gpsError}
            {gpsStatus === "denied" && t.gpsDenied}
          </button>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-base font-semibold text-stone-700 mb-2">
            {t.photoLabel}
          </label>
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-stone-300">
              <Image src={photoPreview} alt="Preview" fill style={{ objectFit: "cover" }} />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-xs px-3 py-1.5 font-semibold hover:bg-black/90 min-h-[36px]"
              >
                ✕ {t.removePhoto}
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full rounded-xl border-2 border-dashed border-stone-300 cursor-pointer py-5 text-base font-semibold text-stone-500 hover:border-stone-500 hover:text-stone-700 transition-colors min-h-[80px]">
              <span>📷 {t.addPhoto}</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-base font-semibold text-stone-700 mb-2">
            {t.notes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={2}
            className="w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base outline-none focus:border-stone-900 resize-none min-h-[80px]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedHeadgate || !measurement || loading}
          className="w-full rounded-xl bg-green-600 px-6 py-5 text-xl font-bold text-white disabled:opacity-50 active:bg-green-700 min-h-[64px] shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              {t.submitting}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              {t.submit}
            </>
          )}
        </button>
        {loading && (
          <p className="text-center text-xs text-stone-400 mt-1">Submitting your reading...</p>
        )}
      </div>
    </div>
  );
}

export default function WaterFieldClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><span className="text-stone-500">Loading...</span></div>}>
      <WaterFieldInner />
    </Suspense>
  );
}