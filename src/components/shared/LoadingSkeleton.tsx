"use client";

type SkeletonVariant = "text" | "card" | "table" | "avatar" | "button";

type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
  count?: number;
};

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? "w-3/4" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 ${className}`}>
      <div className="flex items-center gap-4">
        <SkeletonLine className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-1/3" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = "" }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 ${className}`}>
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonLine key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <SkeletonLine key={colIdx} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonAvatar({ className = "" }: SkeletonProps) {
  return <SkeletonLine className={`h-10 w-10 rounded-full ${className}`} />;
}

export function SkeletonButton({ className = "" }: SkeletonProps) {
  return <SkeletonLine className={`h-9 w-24 rounded-lg ${className}`} />;
}

export default function LoadingSkeleton({ variant = "text", width, height, className = "", count = 1 }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const items = Array.from({ length: count });

  if (variant === "card") {
    return (
      <div className="space-y-3">
        {items.map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }
  if (variant === "table") {
    return <SkeletonTable className={className} />;
  }
  if (variant === "avatar") {
    return (
      <div className="flex items-center gap-3">
        {items.map((_, i) => (
          <SkeletonAvatar key={i} />
        ))}
      </div>
    );
  }
  if (variant === "button") {
    return (
      <div className="flex gap-3">
        {items.map((_, i) => (
          <SkeletonButton key={i} />
        ))}
      </div>
    );
  }
  // default: text
  return (
    <div className="space-y-2">
      {items.map((_, i) => (
        <SkeletonText key={i} className={className} />
      ))}
    </div>
  );
}