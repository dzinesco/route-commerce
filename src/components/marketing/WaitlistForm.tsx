"use client";

import { useState, FormEvent } from "react";

interface WaitlistFormProps {
  className?: string;
  onSuccess?: () => void;
}

export default function WaitlistForm({ className = "", onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          referral_source: referralSource || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setSuccess(true);
      setEmail("");
      setName("");
      setReferralSource("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={`bg-gradient-to-br from-[#1a4d2e]/10 to-[#2d6a4f]/5 rounded-2xl p-8 text-center border border-[#6b8f71]/20 ${className}`}>
        <div className="w-16 h-16 bg-[#1a4d2e]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#1a4d2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          You&apos;re on the list!
        </h3>
        <p className="text-[#6b8f71]">
          We&apos;ll be in touch soon with early access details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#1a1a1a] mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-xl border border-[#6b8f71]/30 bg-white text-[#1a1a1a] placeholder-[#888] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1a1a1a] mb-2">
            Email Address <span className="text-[#c97a3e]">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@farm.com"
            required
            className="w-full px-4 py-3 rounded-xl border border-[#6b8f71]/30 bg-white text-[#1a1a1a] placeholder-[#888] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all"
          />
        </div>
      </div>

      <div>
        <label htmlFor="referral" className="block text-sm font-medium text-[#1a1a1a] mb-2">
          How did you hear about us?
        </label>
        <select
          id="referral"
          value={referralSource}
          onChange={(e) => setReferralSource(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#6b8f71]/30 bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all"
        >
          <option value="">Select an option</option>
          <option value="google">Google Search</option>
          <option value="social">Social Media</option>
          <option value="friend">Friend or Colleague</option>
          <option value="event">Industry Event</option>
          <option value="podcast">Podcast</option>
          <option value="blog">Blog or Article</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !email}
        className="w-full px-6 py-4 bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white rounded-xl font-semibold text-lg hover:from-[#2d6a4f] hover:to-[#1a4d2e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1a4d2e]/20"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Joining...
          </span>
        ) : (
          "Join the Waitlist"
        )}
      </button>

      <p className="text-xs text-[#888] text-center">
        We respect your privacy. No spam, ever.
      </p>
    </form>
  );
}