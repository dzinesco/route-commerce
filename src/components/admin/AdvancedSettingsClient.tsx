"use client";

import { useState, useEffect } from "react";
import AdvancedIntegrations from "@/components/admin/AdvancedIntegrations";
import AdvancedAIPanel from "@/components/admin/AdvancedAIPanel";
import AdvancedSquareSync from "@/components/admin/AdvancedSquareSync";
import AdvancedShipping from "@/components/admin/AdvancedShipping";
import AdvancedPayments from "@/components/admin/AdvancedPayments";

type Tab = "integrations" | "ai" | "square" | "shipping" | "webhooks" | "payments";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "ai", label: "AI Tools", icon: "sparkles" },
  { id: "square", label: "Square Sync", icon: "square" },
  { id: "shipping", label: "Shipping", icon: "truck" },
  { id: "webhooks", label: "Webhooks", icon: "webhook" },
  { id: "payments", label: "Payments", icon: "credit-card" },
];

// Icon components
const Icons = {
  plug: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
    </svg>
  ),
  sparkles: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
    </svg>
  ),
  square: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 12h6M12 9v6"/>
    </svg>
  ),
  truck: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/>
    </svg>
  ),
  webhook: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
      <path d="M8.25 8.25l-.75.75M14.25 14.25l-.75.75M8.25 14.25l.75-.75M14.25 8.25l.75.75"/>
    </svg>
  ),
  "credit-card": (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  ),
};

type Props = {
  brandId: string;
  brands: { id: string; name: string }[];
  stripeConnect?: {
    is_connected: boolean;
    account_id?: string;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  } | null;
};

export default function AdvancedSettingsClient({ brandId, brands, stripeConnect }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("integrations");

  // Handle Stripe Connect callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_connected") === "true") {
      // Successfully connected - could show a toast or refresh
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("stripe_refresh") === "true") {
      // Link expired, need to refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div>
      {/* Tab navigation */}
      <nav className="grid grid-cols-6 gap-1 p-1.5 rounded-xl bg-white border border-[var(--admin-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-1 sm:px-3 py-2 text-[9px] sm:text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--admin-accent)] text-white"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)]"
            }`}
          >
            {tab.icon === "plug" && Icons.plug("h-4 w-4")}
            {tab.icon === "sparkles" && Icons.sparkles("h-4 w-4")}
            {tab.icon === "square" && Icons.square("h-4 w-4")}
            {tab.icon === "truck" && Icons.truck("h-4 w-4")}
            {tab.icon === "webhook" && Icons.webhook("h-4 w-4")}
            {tab.icon === "credit-card" && Icons["credit-card"]("h-4 w-4")}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.substring(0, 3)}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 sm:w-8 bg-white rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="py-4 sm:py-6">
        {activeTab === "integrations" && (
          <AdvancedIntegrations brandId={brandId} brands={brands} />
        )}

        {activeTab === "ai" && (
          <AdvancedAIPanel brandId={brandId} />
        )}

        {activeTab === "square" && (
          <AdvancedSquareSync brandId={brandId} />
        )}

        {activeTab === "shipping" && (
          <AdvancedShipping brandId={brandId} />
        )}

        {activeTab === "webhooks" && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--admin-bg)]">
                  {Icons.webhook("h-6 w-6 text-[var(--admin-text-muted)]")}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">Webhooks</h2>
                  <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                    Configure webhook endpoints to receive real-time notifications for order events, payments, and inventory updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <div className="bg-[var(--admin-bg)]/50 px-6 py-4 border-b border-[var(--admin-border)]">
                <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Available Webhook Events</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--admin-text-primary)]">Coming Soon</p>
                    <p className="text-xs text-[var(--admin-text-muted)]">Webhook configuration will be available shortly</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  {[
                    { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "Order Status Changes", desc: "Track order lifecycle events" },
                    { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", label: "Payment Confirmations", desc: "Get notified on successful payments" },
                    { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", label: "Inventory Updates", desc: "Real-time stock changes" },
                    { icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", label: "Custom Webhook URLs", desc: "Send events to your endpoint" },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--admin-bg)]/50 border border-[var(--admin-border)]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white border border-[var(--admin-border)]">
                        <svg className="h-4 w-4 text-[var(--admin-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={event.icon}/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--admin-text-primary)]">{event.label}</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[var(--admin-bg)] to-[var(--admin-bg)]/50 border border-[var(--admin-border)]">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="text-sm text-[var(--admin-text-secondary)]">Webhook configuration will allow you to receive events via HTTP POST to your custom endpoint.</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--admin-border)]">
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Need webhooks now?{" "}
                    <button className="text-green-600 hover:text-green-700 font-medium">
                      Contact support
                    </button>
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                    Notify Me
                  </button>
                </div>
              </div>
            </div>

            {/* Technical Info Card */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6">
              <h4 className="text-sm font-semibold text-[var(--admin-text-primary)] mb-3">Webhook Payload Format</h4>
              <div className="bg-[var(--admin-text-primary)] rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-[var(--admin-bg)] font-mono leading-relaxed">
{`{
  "event": "order.status_changed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "order_id": "...",
    "status": "delivered"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <AdvancedPayments brandId={brandId} initialStatus={stripeConnect ?? null} />
        )}
      </div>
    </div>
  );
}