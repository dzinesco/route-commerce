type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  // Active/Enabled states
  active: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
  enabled: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Enabled" },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Published" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed" },
  picked_up: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Picked Up" },
  delivered: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Delivered" },

  // Pending/Warning states
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  draft: { bg: "bg-amber-100", text: "text-amber-700", label: "Draft" },
  processing: { bg: "bg-amber-100", text: "text-amber-700", label: "Processing" },
  open: { bg: "bg-amber-100", text: "text-amber-700", label: "Open" },
  in_transit: { bg: "bg-amber-100", text: "text-amber-700", label: "In Transit" },

  // Inactive/Disabled states
  inactive: { bg: "bg-stone-100", text: "text-stone-600", label: "Inactive" },
  disabled: { bg: "bg-stone-100", text: "text-stone-600", label: "Disabled" },
  archived: { bg: "bg-stone-100", text: "text-stone-600", label: "Archived" },

  // Info states
  at_shed: { bg: "bg-blue-100", text: "text-blue-700", label: "At Shed" },
  packed: { bg: "bg-purple-100", text: "text-purple-700", label: "Packed" },
  square: { bg: "bg-purple-100", text: "text-purple-700", label: "Square" },

  // Special states
  core: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Core" },
  addon: { bg: "bg-amber-50", text: "text-amber-600", label: "Add-on" },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? {
    bg: "bg-stone-100",
    text: "text-stone-600",
    label: status.replace(/_/g, " "),
  };

  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${config.text} border-transparent ${padding}`}>
      {config.label}
    </span>
  );
}