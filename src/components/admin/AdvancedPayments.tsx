"use client";

import { useState } from "react";
import {
  createStripeConnectLink,
  refreshStripeConnectLink,
  disconnectStripeConnect,
  createStripeDashboardLink,
  getStripeConnectStatus,
} from "@/actions/stripe-connect";

interface AdvancedPaymentsProps {
  brandId: string;
  initialStatus: {
    is_connected: boolean;
    account_id?: string;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  } | null;
}

// SVG Icons
const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M2 10h20"/>
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
  </svg>
);

const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M15 9l-6 6M9 9l6 6"/>
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
);

const UnlinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-6.95 0l-1.72 1.71"/>
    <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 006.95 0l1.71-1.71"/>
    <line x1="8" y1="2" x2="8" y2="5"/>
    <line x1="2" y1="8" x2="5" y2="8"/>
    <line x1="16" y1="19" x2="16" y2="22"/>
    <line x1="19" y1="16" x2="22" y2="16"/>
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const StoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const DollarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);

export default function AdvancedPayments({ brandId, initialStatus }: AdvancedPaymentsProps) {
  const [status, setStatus] = useState(initialStatus ?? { is_connected: false });
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"connect" | "refresh" | "dashboard" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refreshStatus() {
    const result = await getStripeConnectStatus(brandId);
    if (!result.error) {
      setStatus(result);
    }
  }

  async function handleConnect() {
    setLoading(true);
    setAction("connect");
    setError(null);
    setSuccess(null);

    const result = await createStripeConnectLink(brandId);

    if (!result.success || !result.url) {
      setError(result.error ?? "Failed to create Stripe account");
      setLoading(false);
      setAction(null);
      return;
    }

    // Redirect to Stripe onboarding
    window.location.href = result.url;
  }

  async function handleRefresh() {
    setLoading(true);
    setAction("refresh");
    setError(null);
    setSuccess(null);

    const result = await refreshStripeConnectLink(brandId);

    if (!result.success || !result.url) {
      setError(result.error ?? "Failed to refresh onboarding");
      setLoading(false);
      setAction(null);
      return;
    }

    // Redirect to Stripe to continue onboarding
    window.location.href = result.url;
  }

  async function handleOpenDashboard() {
    setLoading(true);
    setAction("dashboard");
    setError(null);
    setSuccess(null);

    const result = await createStripeDashboardLink(brandId);

    if (!result.success || !result.url) {
      setError(result.error ?? "Failed to open Stripe dashboard");
      setLoading(false);
      setAction(null);
      return;
    }

    // Open Stripe dashboard in new tab
    window.open(result.url, "_blank");
    setLoading(false);
    setAction(null);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Stripe? Your brand store will no longer be able to accept payments until reconnected.")) {
      return;
    }

    setLoading(true);
    setAction("disconnect");
    setError(null);
    setSuccess(null);

    const result = await disconnectStripeConnect(brandId);

    if (!result.success) {
      setError(result.error ?? "Failed to disconnect");
    } else {
      setStatus({ is_connected: false });
      setSuccess("Stripe disconnected successfully");
    }

    setLoading(false);
    setAction(null);
  }

  const isFullyOnboarded = status.is_connected && status.charges_enabled && status.payouts_enabled && status.details_submitted;

  return (
    <div className="space-y-5">
      {/* Info Banner - Two Stripe Systems */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 flex-shrink-0">
            <StoreIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--admin-text-primary)]">Brand Store Payments</h4>
            <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
              This connects your brand&apos;s storefront to <strong>your own Stripe account</strong> so you can accept payments directly from your customers.
              This is separate from the Route Commerce SaaS subscription billing.
            </p>
          </div>
        </div>
      </div>

      {/* Security Warning Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 flex-shrink-0">
            <ShieldIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">How Stripe Connect Works</h4>
            <ul className="mt-2 text-xs text-amber-700 space-y-1.5">
              <li>• <strong>You sign in to YOUR Stripe account</strong> — No API keys to manage or share.</li>
              <li>• <strong>Express accounts are pre-configured</strong> — Card payments and transfers enabled.</li>
              <li>• <strong>Stripe handles compliance</strong> — Identity verification and tax forms handled by Stripe.</li>
              <li>• <strong>Funds go directly to you</strong> — Payments deposit to your connected Stripe account.</li>
              <li>• <strong>2-7 day payout schedule</strong> — Standard Stripe payout timing to your bank.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stripe Connect Status Card */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        {/* Card Header */}
        <div className={`px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--admin-border)] ${
          isFullyOnboarded
            ? "bg-emerald-50/50"
            : status.is_connected
            ? "bg-amber-50/50"
            : "bg-stone-50/50"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                isFullyOnboarded
                  ? "bg-emerald-500"
                  : status.is_connected
                  ? "bg-amber-500"
                  : "bg-stone-500"
              }`}>
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Stripe Connect</h2>
                <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">
                  Accept payments on your brand storefront
                </p>
              </div>
            </div>

            {/* Status Badge */}
            {status.is_connected ? (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                isFullyOnboarded
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                {isFullyOnboarded ? (
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                )}
                {isFullyOnboarded ? "Active" : "Incomplete"}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-secondary)] border border-stone-200">
                <XCircleIcon className="h-3.5 w-3.5" />
                Not Connected
              </div>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-6">
          {/* Account Info */}
          {status.account_id && (
            <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
              <span>Account:</span>
              <code className="rounded border border-[var(--admin-border)] bg-stone-50 px-1.5 py-0.5 font-mono text-[var(--admin-text-secondary)]">
                {status.account_id}
              </code>
            </div>
          )}

          {/* Onboarding Status */}
          {status.is_connected && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatusIndicator
                label="Charges"
                enabled={status.charges_enabled}
                description="Can accept card payments"
              />
              <StatusIndicator
                label="Payouts"
                enabled={status.payouts_enabled}
                description="Can receive transfers"
              />
              <StatusIndicator
                label="Details"
                enabled={status.details_submitted}
                description="Business verified"
              />
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {!status.is_connected ? (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading && action === "connect" ? (
                  <LoaderIcon className="h-4 w-4" />
                ) : (
                  <CreditCardIcon className="h-4 w-4" />
                )}
                Connect with Stripe
              </button>
            ) : (
              <>
                {!isFullyOnboarded && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {loading && action === "refresh" ? (
                      <LoaderIcon className="h-4 w-4" />
                    ) : (
                      <RefreshIcon className="h-4 w-4" />
                    )}
                    Complete Setup
                  </button>
                )}
                <button
                  onClick={handleOpenDashboard}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50 disabled:opacity-50"
                >
                  {loading && action === "dashboard" ? (
                    <LoaderIcon className="h-4 w-4" />
                  ) : (
                    <ExternalLinkIcon className="h-4 w-4" />
                  )}
                  Stripe Dashboard
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {loading && action === "disconnect" ? (
                    <LoaderIcon className="h-4 w-4" />
                  ) : (
                    <UnlinkIcon className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* How It Works Section */}
        {!status.is_connected && (
          <div className="border-t border-[var(--admin-border)] px-4 py-4 sm:px-6 bg-stone-50/50">
            <div className="flex items-start gap-3">
              <InfoIcon className="h-4 w-4 text-[var(--admin-text-muted)] mt-0.5" />
              <div>
                <p className="text-xs font-medium text-[var(--admin-text-secondary)] mb-2">Setup steps:</p>
                <ol className="text-xs text-[var(--admin-text-muted)] space-y-1.5 list-decimal list-inside">
                  <li>Click &quot;Connect with Stripe&quot; to start</li>
                  <li>Sign in to your Stripe account or create one</li>
                  <li>Complete business verification in the Stripe form</li>
                  <li>Once approved, start accepting payments on your store</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Active Banner */}
        {isFullyOnboarded && (
          <div className="border-t border-emerald-200 px-4 py-4 sm:px-6 bg-emerald-50/50">
            <div className="flex items-start gap-3">
              <DollarIcon className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-emerald-700 mb-1">Ready to Accept Payments</p>
                <p className="text-xs text-emerald-600">
                  Your Stripe account is fully set up. Payments from your brand storefront will be deposited directly to your Stripe account.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIndicator({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled?: boolean;
  description: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border ${
      enabled
        ? "bg-emerald-50 border-emerald-200"
        : "bg-amber-50 border-amber-200"
    }`}>
      {enabled ? (
        <CheckCircleIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
      )}
      <div>
        <p className={`text-xs font-semibold ${enabled ? "text-emerald-700" : "text-amber-700"}`}>
          {label} {enabled ? "Enabled" : "Pending"}
        </p>
        <p className="text-[10px] text-[var(--admin-text-muted)]">{description}</p>
      </div>
    </div>
  );
}