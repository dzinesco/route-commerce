"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_tax_summary`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          p_brand_id: brandId,
          p_start_date: range.start,
          p_end_date: range.end,
        }),
      }
    )
      .then((r) => r.json())
      .then((d) => {
        setData({
          total_tax_collected: Number(d?.total_tax_collected ?? 0),
          total_gross_sales: Number(d?.total_gross_sales ?? 0),
          order_count: Number(d?.order_count ?? 0),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
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