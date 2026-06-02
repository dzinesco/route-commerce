// Cookie Consent Banner - GDPR Compliant
"use client";

import { useState, useEffect } from "react";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "rc_cookie_consent";

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for smooth entrance
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(fullConsent);
  };

  const handleRejectAll = () => {
    const minimalConsent: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    saveConsent(minimalConsent);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = (consent: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      consent,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .cookie-banner {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-4">Cookie Preferences</h2>
            <p className="text-sm text-[#666] mb-6">
              Choose which cookies you&apos;d like to accept. Essential cookies are required for the site to function properly.
            </p>

            <div className="space-y-4 mb-6">
              {/* Essential */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-[#1a1a1a]">Essential Cookies</h3>
                  <p className="text-sm text-[#888]">Required for site functionality</p>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-7 bg-[#1a4d2e] rounded-full relative">
                    <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-[#1a1a1a]">Analytics Cookies</h3>
                  <p className="text-sm text-[#888]">Help us improve the site</p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, analytics: !preferences.analytics })}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    preferences.analytics ? "bg-[#1a4d2e]" : "bg-gray-300"
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    preferences.analytics ? "right-1" : "left-1"
                  }`} />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-[#1a1a1a]">Marketing Cookies</h3>
                  <p className="text-sm text-[#888]">Personalized ads and content</p>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, marketing: !preferences.marketing })}
                  className={`w-12 h-7 rounded-full relative transition-colors ${
                    preferences.marketing ? "bg-[#1a4d2e]" : "bg-gray-300"
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    preferences.marketing ? "right-1" : "left-1"
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-4 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-medium hover:bg-[#2d6a4f]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <div className="cookie-banner fixed bottom-0 left-0 right-0 z-[99] bg-white border-t border-[#e5e5e5] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-[#1a1a1a] text-sm">
                We use cookies to improve your experience. By continuing, you agree to our{" "}
                <a href="/privacy-policy" className="text-[#1a4d2e] underline hover:no-underline">Privacy Policy</a>{" "}
                and{" "}
                <a href="/terms-and-conditions" className="text-[#1a4d2e] underline hover:no-underline">Terms of Service</a>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                Customize
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2.5 text-sm font-medium text-[#888] border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#1a4d2e] rounded-xl hover:bg-[#2d6a4f] transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}