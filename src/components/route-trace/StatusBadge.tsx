"use client";

const STATUS_CONFIG = {
  active: { label: "Active", bg: "bg-green-100", text: "text-green-800" },
  in_transit: { label: "In Transit", bg: "bg-amber-100", text: "text-amber-800" },
  at_shed: { label: "At Shed", bg: "bg-blue-100", text: "text-blue-800" },
  packed: { label: "Packed", bg: "bg-purple-100", text: "text-purple-800" },
  delivered: { label: "Delivered", bg: "bg-stone-100", text: "text-stone-700" },
} as const;

type Status = keyof typeof STATUS_CONFIG;

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? { label: status, bg: "bg-slate-100", text: "text-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      <span className="h-1.5 w-1.5 rounded-full currentColor" />
      {config.label}
    </span>
  );
}