"use client";

type StatItem = {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "info";
};

type AdminStatsBarProps = {
  stats: StatItem[];
};

const variantClasses = {
  default: "bg-[var(--admin-border-light)] border-[var(--admin-border)] text-[var(--admin-text-secondary)]",
  success: "bg-[var(--admin-accent-light)] border-[var(--admin-accent)] text-[var(--admin-accent-text)]",
  warning: "bg-[var(--admin-warning-light)] border-[var(--admin-warning)] text-[var(--admin-text-primary)]",
  info: "bg-[var(--admin-border)] border-[var(--admin-text-muted)] text-[var(--admin-text-secondary)]",
};

export default function AdminStatsBar({ stats }: AdminStatsBarProps) {
  return (
    <div className="flex items-center gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-[var(--admin-text-muted)]">{stat.label}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-sm font-bold ${variantClasses[stat.variant ?? "default"]}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}