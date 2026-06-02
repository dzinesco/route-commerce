"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADDON_CATALOG, type BrandFeatureKey } from "@/lib/feature-flags";
import { toggleBrandFeature } from "@/actions/settings/features";
import GlassModal from "./GlassModal";

type Props = {
  brandId: string;
  initialEnabledFeatures: Record<string, boolean>;
};

export default function BrandFeatureCards({ brandId, initialEnabledFeatures }: Props) {
  const router = useRouter();
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(initialEnabledFeatures);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEnableModal, setShowEnableModal] = useState<BrandFeatureKey | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (key: BrandFeatureKey, enable: boolean) => {
    setToggling(key);
    setShowEnableModal(null);
    setEnabledFeatures((prev) => ({ ...prev, [key]: enable }));
    const result = await toggleBrandFeature(brandId, key, enable);
    if (result.success) {
      showToast(enable ? `${ADDON_CATALOG[key].name} enabled` : `${ADDON_CATALOG[key].name} disabled`);
      router.refresh();
    } else {
      setEnabledFeatures((prev) => ({ ...prev, [key]: !enable }));
      showToast(`Error: ${result.error}`, 'error');
    }
    setToggling(null);
  };

  const keys = Object.keys(ADDON_CATALOG) as BrandFeatureKey[];

  return (
    <>
      {toast && (
        <div 
          className="fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm"
          style={{
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 118, 110, 0.95)',
            color: 'white',
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {keys.map((key) => {
          const addon = ADDON_CATALOG[key];
          const enabled = !!enabledFeatures[key];
          const busy = toggling === key;

          return (
            <div
              key={key}
              className="rounded-2xl p-6 transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: enabled 
                  ? '0 8px 24px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                  : '0 4px 12px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: enabled 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)'
                      : 'rgba(0, 0, 0, 0.04)',
                    border: enabled ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <span className="text-2xl">{addon.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-stone-950">{addon.name}</h3>
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-0.5"
                      style={{
                        background: enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                        color: enabled ? '#047857' : 'rgba(0, 0, 0, 0.4)',
                        border: enabled ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      {enabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    {addon.description}
                  </p>
                  {addon.addOnPrice && (
                    <p className="mt-2 text-xs font-medium" style={{ color: '#b45309' }}>
                      {addon.addOnPrice}/month
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={() => handleToggle(key, !enabled)}
                  disabled={busy}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    background: enabled 
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: enabled ? '#dc2626' : 'white',
                    border: enabled ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                    boxShadow: enabled ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.25)',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {busy ? "..." : enabled ? "Disable" : "Enable"}
                </button>
                
                {enabled && addon.adminRoute && (
                  <a
                    href={addon.adminRoute}
                    className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: 'rgba(0, 0, 0, 0.02)',
                      color: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    Open →
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enable confirmation modal */}
      {showEnableModal && (
        <GlassModal
          title={`Enable ${ADDON_CATALOG[showEnableModal].name}?`}
          subtitle={`This will activate the add-on feature.`}
          onClose={() => setShowEnableModal(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              {ADDON_CATALOG[showEnableModal].description}
            </p>
            {ADDON_CATALOG[showEnableModal].addOnPrice && (
              <p className="text-sm font-medium" style={{ color: '#b45309' }}>
                Price: {ADDON_CATALOG[showEnableModal].addOnPrice}/month
              </p>
            )}
            <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.04)' }}>
              <button
                onClick={() => setShowEnableModal(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggle(showEnableModal, true)}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                }}
              >
                Enable
              </button>
            </div>
          </div>
        </GlassModal>
      )}
    </>
  );
}