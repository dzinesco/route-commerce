"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_CATEGORIES = [
  {
    category: "Ordering & Pickup",
    items: [
      {
        question: "How do I place a preorder for corn?",
        answer: "Find a stop near you on our homepage and click 'Shop This Stop' to add corn to your cart and select your pickup location. Preordering helps us bring the right amount of corn to each stop.",
      },
      {
        question: "Can I order without selecting a pickup stop?",
        answer: "Yes. Choose 'Shipping' at checkout and we will mail cooler boxes directly to your home. Shipping is available for orders of 4 or more dozen and is fulfilled after the season ends.",
      },
      {
        question: "What happens if I miss my pickup time?",
        answer: "Please call the office at 970-323-6874 as soon as possible. We will do our best to accommodate, but unclaimed orders may be donated or sold after the pickup window closes.",
      },
    ],
  },
  {
    category: "Shipping & Delivery",
    items: [
      {
        question: "Do you ship corn?",
        answer: "Yes. We ship Olathe Sweet Sweet Corn nationwide. Orders ship as cooler boxes after our field season ends in late summer. A minimum of 4 dozen is required for shipping.",
      },
      {
        question: "How are cooler boxes packaged?",
        answer: "Corn is packed in insulated coolers with gel packs to keep it fresh during transit. Shipping costs are calculated at checkout based on your location.",
      },
      {
        question: "When will my shipped order arrive?",
        answer: "Cooler box orders are shipped after the season ends in late summer. You will receive a tracking notification by email once your order ships. Most orders within the continental US arrive within 3-7 business days.",
      },
    ],
  },
  {
    category: "Wholesale",
    items: [
      {
        question: "How do I set up a wholesale account?",
        answer: "Visit /wholesale/register to apply. We review applications and respond within 1-2 business days. Wholesale accounts are available to retailers, restaurants, and farm stands.",
      },
      {
        question: "Is there a minimum order for wholesale?",
        answer: "Minimum wholesale order is $100 per order. Some account types have additional minimums — contact us for details.",
      },
    ],
  },
  {
    category: "Product & Quality",
    items: [
      {
        question: "What makes Olathe Sweet different?",
        answer: "Olathe Sweet Sweet Corn is grown in the Uncompahgre Valley of Colorado, where high-altitude days and cool nights produce exceptionally sweet, tender corn. We have been growing this variety for over 40 years.",
      },
      {
        question: "Is your corn organic?",
        answer: "We use regenerative farming practices including no-till methods, cover crops, and reduced chemical inputs. We are not certified organic, but we take a thoughtful approach to land stewardship.",
      },
      {
        question: "How should I store my corn?",
        answer: "Store corn in the refrigerator and eat within 3-5 days. Do not husk it until you are ready to cook. For best sweetness, bring a cooler with ice to transport your corn home.",
      },
    ],
  },
];

function FAQAccordion({ items, searchQuery }: { items: FAQItem[]; searchQuery: string }) {
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 sm:p-8 text-center shadow-sm ring-1 ring-stone-200/60 transition-all duration-300 hover:shadow-lg hover:ring-stone-300">
          <p className="text-stone-500 text-sm">No results for &quot;{searchQuery}&quot;</p>
          <p className="mt-1 text-stone-400 text-sm">Try a different term or browse all categories below.</p>
        </div>
      ) : (
        <>
          {filtered.map((item) => {
            const isOpen = open === item.question;
            return (
              <div
                key={item.question}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/60 overflow-hidden transition-all duration-300 hover:ring-stone-300"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : item.question)}
                  className="flex w-full items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left group"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-stone-950 pr-3 sm:pr-4 text-sm sm:text-[15px] leading-snug group-hover:text-emerald-700 transition-colors">
                    {item.question}
                  </span>
                  <span className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? "bg-emerald-600 text-white rotate-180" : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"}`}>
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 border-t border-stone-100">
                    <p className="text-sm text-stone-500 leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function TuxedoFAQPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName="Tuxedo Corn" brandSlug="tuxedo" brandAccent="green" />

      <main className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-3 sm:mb-4">Questions</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-950 leading-tight">FAQ</h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-500 leading-relaxed">Everything you need to know about ordering, pickup, and shipping.</p>
          </div>

          {/* Search */}
          <div className="mb-8 sm:mb-12 relative">
            <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white pl-10 sm:pl-11 pr-5 py-3.5 sm:py-4 text-sm sm:text-base text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900/20 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* FAQ categories */}
          <div className="space-y-10 sm:space-y-14">
            {FAQ_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-4 sm:mb-5">{cat.category}</h2>
                <FAQAccordion items={cat.items} searchQuery={searchQuery} />
              </div>
            ))}
          </div>

          {/* Still have questions CTA */}
          <div className="mt-12 sm:mt-16 rounded-2xl sm:rounded-3xl bg-stone-950 px-6 sm:px-10 py-10 sm:py-12 text-center shadow-xl">
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">Still have questions?</p>
            <p className="mt-2 text-stone-400 text-sm">We are happy to help — reach out anytime.</p>
            <Link href="/tuxedo/contact" className="mt-6 sm:mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 sm:px-8 py-3 sm:py-4 font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 transition-all text-sm tracking-wider hover:shadow-lg hover:shadow-emerald-900/30">
              Contact Us
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      <StorefrontFooter brandName="Tuxedo Corn" brandSlug="tuxedo" brandAccent="green" />
    </div>
  );
}