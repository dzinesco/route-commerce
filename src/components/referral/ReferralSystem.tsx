// Referral System - Generate, share, and track referral codes

"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics";

interface ReferralCode {
  code: string;
  reward_type: "percentage" | "fixed";
  reward_value: number;
  uses: number;
  max_uses: number;
  created_at: string;
}

interface ReferralSystemProps {
  brandId: string;
  userId: string;
}

export function ReferralSystem({ brandId, userId }: ReferralSystemProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCode] = useState<ReferralCode | null>(null);

  const generateCode = async () => {
    setIsGenerating(true);
    
    // Track event
    analytics.featureUsed("referral_generate_code", { brand_id: brandId });
    
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          brand_id: brandId,
          user_id: userId,
        }),
      });
      
      if (res.ok) {
        // Code generated successfully - refresh list
        analytics.referralShared("", "platform_select");
      }
    } catch (error) {
      console.error("Failed to generate referral code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareCode = (code: ReferralCode, platform: string) => {
    const shareUrl = `${window.location.origin}/register?ref=${code.code}`;
    const text = `Join Route Commerce and get ${code.reward_value}% off your first month!`;
    
    if (platform === "copy") {
      navigator.clipboard.writeText(shareUrl);
      analytics.referralShared(code.code, "copy_link");
    } else if (platform === "email") {
      window.location.href = `mailto:?subject=Try Route Commerce&body=${encodeURIComponent(text + "\n\n" + shareUrl)}`;
      analytics.referralShared(code.code, "email");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + shareUrl)}`, "_blank");
      analytics.referralShared(code.code, "twitter");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
      analytics.referralShared(code.code, "facebook");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Refer & Earn</h3>
            <p className="text-gray-600">
              Share Route Commerce with other farms and earn rewards for each successful signup.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">20%</div>
            <div className="text-sm text-gray-500">Reward</div>
          </div>
        </div>
        
        <button
          onClick={generateCode}
          disabled={isGenerating}
          className="mt-4 w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate New Referral Code"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-500">Total Referrals</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">0</div>
          <div className="text-sm text-gray-500">Conversions</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">$0</div>
          <div className="text-sm text-gray-500">Earned</div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h4 className="font-semibold text-gray-900 mb-4">How It Works</h4>
        <div className="space-y-4">
          {[
            { step: "1", title: "Generate Code", desc: "Create your unique referral code" },
            { step: "2", title: "Share", desc: "Send to other farms via email or social" },
            { step: "3", title: "They Sign Up", desc: "Friend uses your code to register" },
            { step: "4", title: "Both Earn", desc: "Get 20% off, they get 20% off" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {item.step}
              </div>
              <div>
                <div className="font-medium text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Share Your Code</h3>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <code className="text-xl font-mono font-bold">{selectedCode.code}</code>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => { shareCode(selectedCode, "copy"); setShareModalOpen(false); }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </button>
              <button
                onClick={() => { shareCode(selectedCode, "email"); setShareModalOpen(false); }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
              <button
                onClick={() => { shareCode(selectedCode, "twitter"); setShareModalOpen(false); }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter
              </button>
            </div>
            <button
              onClick={() => setShareModalOpen(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Referral badge component for display
export function ReferralBadge({ code }: { code: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      <span>Ref: {code}</span>
    </div>
  );
}