"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADDON_CATALOG, type BrandFeatureKey } from "@/lib/feature-flags";
import { toggleBrandFeature } from "@/actions/settings/features";

type Props = {
  brandId: string;
  initialEnabledFeatures: Record<string, boolean>;
};

export default function BrandFeatureCards({ brandId, initialEnabledFeatures }: Props) {
  const router = useRouter();
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(initialEnabledFeatures);
  const [toggling, setToggling] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (key: string) => {
    const newEnabled = !enabledFeatures[key];
    setToggling(key);
    setEnabledFeatures((prev) => ({ ...prev, [key]: newEnabled }));
    const result = await toggleBrandFeature(brandId, key as BrandFeatureKey, newEnabled);
    if (result.success) {
      showToast(newEnabled ? `${ADDON_CATALOG[key as BrandFeatureKey].name} enabled` : `${ADDON_CATALOG[key as BrandFeatureKey].name} disabled`);
      router.refresh();
    } else {
      setEnabledFeatures((prev) => ({ ...prev, [key]: !newEnabled }));
      showToast(`Error: ${result.error}`);
    }
    setToggling(null);
  };

  const keys = Object.keys(ADDON_CATALOG) as BrandFeatureKey[];

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
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
              className={`rounded-2xl p-6 shadow-black/20 ring-1 ${
                enabled
                  ? "bg-gradient-to-br from-white to-green-50 ring-green-200"
                  : "bg-zinc-900 ring-stone-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl mt-0.5">{addon.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-zinc-100">{addon.name}</h3>
                    <span
                      className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        enabled
                          ? "bg-green-900/40 text-green-400"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {addon.description}
                  </p>
                  {addon.addOnPrice && !enabled && (
                    <p className="mt-2 text-xs font-medium text-amber-400">
                      Requires: {addon.addOnPrice}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 justify-end">
                {enabled && (
                  <Link
                    href={addon.adminRoute}
                    className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-zinc-950 transition-colors"
                  >
                    Open Module →
                  </Link>
                )}
                <button
                  onClick={() => handleToggle(key)}
                  disabled={busy}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                    enabled
                      ? "border border-red-200 text-red-400 hover:bg-red-900/30"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {busy ? "..." : enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}