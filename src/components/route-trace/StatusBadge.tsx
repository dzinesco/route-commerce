"use client";

// Custom SVG icons for status badges - consistent one-color outline style
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "active":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
        </svg>
      );
    case "in_transit":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1"/>
          <path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      );
    case "at_shed":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
        </svg>
      );
    case "packed":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
        </svg>
      );
    case "delivered":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      );
    default:
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      );
  }
};

const STATUS_CONFIG = {
  active: { label: "Active", bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]", ring: "#4caf50" },
  in_transit: { label: "In Transit", bg: "bg-[#fff8e1]", text: "text-[#f57c00]", ring: "#ffb74d" },
  at_shed: { label: "At Shed", bg: "bg-[#e3f2fd]", text: "text-[#1565c0]", ring: "#64b5f6" },
  packed: { label: "Packed", bg: "bg-[var(--admin-accent-light)]", text: "text-[var(--admin-accent-text)]", ring: "var(--admin-accent)" },
  delivered: { label: "Delivered", bg: "bg-[var(--admin-bg-subtle)]", text: "text-[var(--admin-text-secondary)]", ring: "var(--admin-text-muted)" },
} as const;

type Status = keyof typeof STATUS_CONFIG;

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? { label: status, bg: "bg-[var(--admin-bg-subtle)]", text: "text-[var(--admin-text-secondary)]", ring: "var(--admin-text-muted)" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.text} shadow-sm`}>
      <span className="relative flex h-2 w-2">
        <span 
          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" 
          style={{ backgroundColor: config.ring, animationDuration: "2s" }} 
        />
        <span 
          className="relative inline-flex h-2 w-2 rounded-full" 
          style={{ backgroundColor: config.ring }} 
        />
      </span>
      <StatusIcon status={status} />
      {config.label}
    </span>
  );
}