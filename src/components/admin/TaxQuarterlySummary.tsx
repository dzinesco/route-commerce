"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTaxSummaryAction } from "@/actions/tax";

type TaxSummaryData = {
  total_tax_collected: number;
  total_gross_sales: number;
  order_count: number;
};

function quarterLabel(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}

function quarterDateRange(): { start: string; end: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const startDate = new Date(now.getFullYear(), q * 3, 1);
  const end = now.toISOString().slice(0, 10);
  return { start: startDate.toISOString().slice(0, 10), end };
}

export default function TaxQuarterlySummary({ brandId }: { brandId: string }) {
  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const range = quarterDateRange();
    let cancelled = false;
    (async () => {
      const result = await getTaxSummaryAction({
        brandId,
        startDate: range.start,
        endDate: range.end,
      });
      if (cancelled) return;
      if (result.success) {
        setData({
          total_tax_collected: result.data.total_tax_collected,
          total_gross_sales: result.data.total_gross_sales,
          order_count: result.data.order_count,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-[var(--admin-accent)] border-t-transparent animate-spin" />
        <span className="text-xs text-[var(--admin-text-secondary)]">Loading tax summary...</span>
      </div>
    );
  }

  if (!data || data.order_count === 0) return null;

  const effectiveRate = data.total_gross_sales > 0
    ? (data.total_tax_collected / data.total_gross_sales) * 100
    : 0;

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-secondary)]">
            {quarterLabel()} Tax Collected
          </span>
        </div>
        <Link
          href="/admin/taxes"
          className="text-xs text-[var(--admin-accent-text)] hover:text-[var(--admin-accent)] font-medium transition-colors"
        >
          View Details →
        </Link>
      </div>
      <div className="mt-2 flex items-baseline gap-4">
        <span className="text-xl font-bold text-[var(--admin-text-primary)]">
          ${data.total_tax_collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-[var(--admin-text-muted)]">
          on ${data.total_gross_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })} gross sales · {effectiveRate.toFixed(3)}% rate · {data.order_count} orders
        </span>
      </div>
    </div>
  );
}