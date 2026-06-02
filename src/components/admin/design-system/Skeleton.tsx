"use client";

// Shimmer skeleton components for loading states
// Uses CSS animation for smooth shimmer effect

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle" | "card";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ className = "", variant = "rect", width, height }: SkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded",
    rect: "rounded-xl",
    circle: "rounded-full",
    card: "rounded-xl",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 bg-[length:200%_100%] shimmer ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Table row skeleton
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 p-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton for grid views
export function SkeletonCard({ showImage = true }: { showImage?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
      {showImage && <Skeleton className="h-40 w-full" />}
      <div className="p-4 space-y-3">
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="text" className="w-1/2 h-4" />
        <div className="flex justify-between pt-2">
          <Skeleton variant="text" className="w-1/4 h-6" />
          <Skeleton variant="rect" className="w-16 h-8" />
        </div>
      </div>
    </div>
  );
}

// Stats card skeleton
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-${Math.min(count, 4)} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <Skeleton variant="text" className="w-1/3 h-3 mb-2" />
          <Skeleton variant="text" className="w-1/2 h-6" />
        </div>
      ))}
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-32 h-6" />
            <Skeleton variant="text" className="w-24 h-4" />
          </div>
        </div>
        <Skeleton variant="rect" className="w-28 h-10" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
            <Skeleton variant="text" className="w-1/2 h-3 mb-2" />
            <Skeleton variant="text" className="w-1/3 h-7" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Skeleton variant="rect" className="h-10 flex-1 max-w-xs" />
        <Skeleton variant="rect" className="h-10 w-32" />
        <Skeleton variant="rect" className="h-10 w-24" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="p-4 border-b border-[var(--admin-border)]">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="text" className="h-4 w-20" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-[var(--admin-border)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <Skeleton variant="text" className="w-20 h-4" />
              <Skeleton variant="text" className="w-32 h-4" />
              <Skeleton variant="text" className="w-24 h-4 flex-1" />
              <Skeleton variant="text" className="w-16 h-4" />
              <Skeleton variant="text" className="w-16 h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton variant="text" className="w-32 h-4" />
        <div className="flex gap-2">
          <Skeleton variant="rect" className="h-9 w-9" />
          <Skeleton variant="rect" className="h-9 w-12" />
          <Skeleton variant="rect" className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="rect" className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}