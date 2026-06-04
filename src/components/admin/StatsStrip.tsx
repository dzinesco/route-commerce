type Stat = {
  label: string;
  value: number | string;
  emphasis?: boolean;
};

type Props = {
  stats: Stat[];
  /** Right-aligned slot (e.g. an inline "Next stop" pill or refresh action) */
  right?: React.ReactNode;
};

export default function StatsStrip({ stats, right }: Props) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {stats.map((s, i) => (
          <span key={i} className="flex items-baseline gap-1.5">
            <span
              className={`font-bold tabular-nums ${s.emphasis ? "text-emerald-700" : "text-[var(--admin-text-primary)]"}`}
            >
              {s.value}
            </span>
            <span className="text-[var(--admin-text-muted)]">{s.label}</span>
          </span>
        ))}
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
