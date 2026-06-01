import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indian River Direct | Peach & Citrus Truckload",
  description: "Fresh peaches and citrus from our Florida groves to truckload sales in your neighborhood. Family-owned since 1985. Pre-order now for 2026 season.",
};

export default function IndianRiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Glass morphism gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100/40 via-white/60 to-blue-50/30" />
      
      {/* Decorative glass orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-gradient-to-br from-blue-100/25 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-50/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Content wrapper */}
      <div className="relative">{children}</div>
    </div>
  );
}