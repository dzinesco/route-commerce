import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tuxedo Corn | Fresh Produce Wholesale",
  description: "Premium sweet corn and seasonal produce delivered fresh from the farm to pickup stops near you. Shop wholesale pricing on Tuxedo Corn.",
  openGraph: {
    title: "Tuxedo Corn",
    description: "Premium sweet corn and seasonal produce, delivered fresh from our farm to your community.",
    siteName: "Route Commerce",
  },
};

export default function TuxedoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-950" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
