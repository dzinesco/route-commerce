import type React from "react";

type WholesaleBenefit = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const CHECK_ICON = (
  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WHOLESALE_BENEFITS: WholesaleBenefit[] = [
  {
    icon: CHECK_ICON,
    title: "Exclusive Wholesale Pricing",
    description: "Access discounted rates and volume-based tiers that aren't available to retail customers.",
  },
  {
    icon: CHECK_ICON,
    title: "Easy Online Ordering",
    description: "Place orders anytime with the option to pay a deposit and settle the balance at pickup.",
  },
  {
    icon: CHECK_ICON,
    title: "Order History & Invoices",
    description: "Log in anytime to review past orders, download invoices, and track your spending.",
  },
  {
    icon: CHECK_ICON,
    title: "Priority Pickup Scheduling",
    description: "Reserve your spot at upcoming stops and ensure your order is ready when you arrive.",
  },
  {
    icon: CHECK_ICON,
    title: "Dedicated Bulk Support",
    description: "Get personalized help from our wholesale team for large or recurring orders.",
  },
  {
    icon: CHECK_ICON,
    title: "Early Access to Seasonal Products",
    description: "Be the first to know when new crops launch and reserve before they sell out.",
  },
];

export default function WholesaleBenefits() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">What You&apos;ll Get</p>
      <ul className="space-y-4">
        {WHOLESALE_BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3">
            <span className="shrink-0 mt-0.5">{b.icon}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-300">{b.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{b.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}