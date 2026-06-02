"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import LayoutContainer from "@/components/layout/LayoutContainer";
import { supabase } from "@/lib/supabase";

type FAQCategory = {
  category: string;
  items: FAQItem[];
};

type FAQItem = { question: string; answer: string };

function buildFaqCategories(phone: string): FAQCategory[] {
  return [
    {
      category: "Ordering & Pickup",
      items: [
        { question: "How does preordering work?", answer: "Select your preferred pickup stop from our schedule, then browse our available products. Add items to your cart and select your stop at checkout. Preordering helps us know how much to bring to each stop — and ensures you get what you want." },
        { question: "When do I need to order by?", answer: "We recommend ordering at least 2 days before your selected pickup date. Orders placed after the cutoff may still be accepted if space allows — contact us to check." },
        { question: "Can I change my pickup stop after ordering?", answer: "Yes — as long as your order hasn't been marked 'fulfilled,' contact us and we can move your order to a different stop. Log into the portal or call us to make the change." },
        { question: "What if I need to cancel my order?", answer: `Contact us at least 24 hours before your pickup date for a full refund. Cancellations within 24 hours may be subject to a 50% fee. Email Info@indianriverdirect.com or call ${phone}.` },
      ],
    },
    {
      category: "Product & Season",
      items: [
        { question: "What citrus is available when?", answer: "Our season runs year-round with different fruits at different times: Navels (Dec–Mar), Ruby Red Grapefruit (Jan–Apr), Honeybells (Jan–Feb), Super Sweet Tangerines (Jan–Mar), Temples (Mar–Apr), Peaches (Jun–Aug), Blueberries (Jun–Jul). Check the homepage or contact us for this season's exact availability." },
        { question: "Do you offer organic citrus?", answer: "Our growers use integrated pest management and sustainable farming practices. Some items may be certified organic — contact us for current availability and certifications." },
        { question: "How do I store my citrus after pickup?", answer: "Citrus should be stored in the refrigerator to maintain freshness. Most varieties keep 1–2 weeks when refrigerated. Do not freeze citrus unless you plan to use it in cooking." },
        { question: "Why are some items by preorder only?", answer: "Preordering helps us manage inventory and ensures we bring enough product to each stop. Preordered items are prioritized for fulfillment — if you show up without preordering, some items may sell out." },
      ],
    },
    {
      category: "Shipping & Delivery",
      items: [
        { question: "Can I have my order shipped instead of picked up?", answer: `Currently we offer pickup-only ordering through this site. For bulk or wholesale shipping inquiries, please contact us directly at ${phone}.` },
        { question: "Do you deliver to my area?", answer: "We operate pickup stops across the Southeast and Midwest — Ohio, Indiana, Kentucky, West Virginia, Wisconsin, and Illinois. Enter your ZIP code on our homepage to find stops near you. We do not offer residential delivery." },
        { question: "What if no stops are near me?", answer: "If you don't see any stops near your location, we're not currently serving your area. Contact us and we can note your interest for future route expansion. Wholesale customers may also qualify for direct delivery." },
      ],
    },
    {
      category: "Wholesale",
      items: [
        { question: "How do I apply for a wholesale account?", answer: "Visit /wholesale/register to apply. We review applications and typically respond within 1–2 business days. Wholesale accounts are available to retailers, restaurants, farm stands, and other businesses." },
        { question: "Is there a minimum order for wholesale?", answer: "Minimum wholesale order is $150 per order. We also require orders to meet a per-item minimum in some categories. Contact us for details." },
        { question: "Do you offer recurring standing orders?", answer: "Yes — wholesale accounts can set up recurring orders for weekly or biweekly delivery to their stop. Contact your wholesale representative to set up a standing order schedule." },
      ],
    },
  ];
}

const DEFAULT_PHONE = "772-971-4484";

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

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl bg-white border-2 border-stone-200 p-8 text-center shadow-lg">
        <p className="text-stone-500 text-base">No results for "{searchQuery}"</p>
        <p className="mt-1 text-stone-400 text-sm">Try a different term or browse all categories below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((item) => {
        const isOpen = open === item.question;
        return (
          <div
            key={item.question}
            className="rounded-2xl bg-white border-2 border-stone-200 overflow-hidden transition-all duration-300 hover:border-blue-200 hover:shadow-lg"
          >
            <button
              onClick={() => setOpen(isOpen ? null : item.question)}
              className="flex w-full items-center justify-between px-6 py-5 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-stone-950 pr-4 text-base leading-snug group-hover:text-blue-600 transition-colors">
                {item.question}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isOpen
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-stone-100 text-stone-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-6 pt-1 border-t border-stone-100">
                <p className="text-sm text-stone-600 leading-relaxed">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function IndianRiverFAQPage() {
  const [faqCategories, setFaqCategories] = useState(buildFaqCategories(DEFAULT_PHONE));
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.from("brand_settings").select("phone").eq("brand_id",
      "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28"
    ).single().then(({ data }) => {
      if (data?.phone) setFaqCategories(buildFaqCategories(data.phone));
    });
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName="Indian River Direct" brandSlug="indian-river-direct" brandAccent="blue" />

      <main className="py-16 md:py-20">
        <LayoutContainer>
          <div className="max-w-3xl mx-auto">
            {/* Page header */}
            <div className="text-center mb-14 p-10 rounded-3xl bg-white border-2 border-stone-200 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-100">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">Questions</p>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">
                FAQ
              </h1>
              <p className="mt-5 text-lg text-stone-600 leading-relaxed">
                Everything you need to know about ordering, pickup, and our seasonal fruits.
              </p>
            </div>

            {/* Search input */}
            <div className="mb-12 relative">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border-2 border-stone-200 bg-white px-12 py-4 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-colors shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-5 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* FAQ categories */}
            <div className="space-y-14">
              {faqCategories.map((cat) => (
                <div key={cat.category}>
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-5">
                    {cat.category}
                  </h2>
                  <FAQAccordion items={cat.items} searchQuery={searchQuery} />
                </div>
              ))}
            </div>

            {/* Still have questions CTA */}
            <div className="mt-16 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-10 text-center shadow-2xl relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
              </div>
              <div className="relative">
                <p className="text-2xl font-black text-white tracking-tight">Still have questions?</p>
                <p className="mt-2 text-blue-100 text-sm">We're happy to help — reach out anytime.</p>
                <Link
                  href="/indian-river-direct/contact"
                  className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 font-bold text-blue-700 hover:bg-blue-50 transition-all text-sm tracking-wider shadow-lg hover:shadow-xl"
                >
                  Contact Us
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </LayoutContainer>
      </main>

      <StorefrontFooter brandName="Indian River Direct" brandSlug="indian-river-direct" brandAccent="blue" />
    </div>
  );
}