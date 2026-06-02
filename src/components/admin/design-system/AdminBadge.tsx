"use client";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type AdminBadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
};

const variantClasses: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: "bg-[var(--admin-border-light)]", text: "text-[var(--admin-text-secondary)]", dot: "bg-[var(--admin-text-muted)]" },
  success: { bg: "bg-[var(--admin-accent-light)]", text: "text-[var(--admin-accent-text)]", dot: "bg-[var(--admin-accent)]" },
  warning: { bg: "bg-[var(--admin-warning-light)]", text: "text-[var(--admin-warning)]", dot: "bg-[var(--admin-warning)]" },
  danger: { bg: "bg-[var(--admin-danger-light)]", text: "text-[var(--admin-danger)]", dot: "bg-[var(--admin-danger)]" },
  info: { bg: "bg-[var(--admin-border)]", text: "text-[var(--admin-text-secondary)]", dot: "bg-[var(--admin-info)]" },
};

export default function AdminBadge({ 
  children, 
  variant = "default", 
  dot = false,
  className = "" 
}: AdminBadgeProps) {
  const { bg, text, dot: dotColor } = variantClasses[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${bg} ${text} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
}

// Status badge with predefined statuses
type AdminStatusBadgeProps = {
  status: "active" | "inactive" | "pending" | "draft" | "completed" | "cancelled";
  className?: string;
};

const statusConfig: Record<string, { variant: BadgeVariant; dot: boolean; label: string }> = {
  active: { variant: "success", dot: true, label: "Active" },
  inactive: { variant: "default", dot: true, label: "Inactive" },
  pending: { variant: "warning", dot: true, label: "Pending" },
  draft: { variant: "default", dot: true, label: "Draft" },
  completed: { variant: "success", dot: true, label: "Completed" },
  cancelled: { variant: "danger", dot: true, label: "Cancelled" },
};

export function AdminStatusBadge({ status, className = "" }: AdminStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.inactive;
  return (
    <AdminBadge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </AdminBadge>
  );
}

// Count badge (circular)
type AdminCountBadgeProps = {
  count: number;
  variant?: BadgeVariant;
  className?: string;
};

export function AdminCountBadge({ count, variant = "default", className = "" }: AdminCountBadgeProps) {
  const { bg, text } = variantClasses[variant];
  return (
    <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${bg} ${text} ${className}`}>
      {count}
    </span>
  );
}