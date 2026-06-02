import LoadingSkeleton, { SkeletonCard, SkeletonTable } from "@/components/shared/LoadingSkeleton";

export default function AdminLoading() {
  return (
    <main className="min-h-screen px-4 sm:px-6 md:px-8 py-8" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <LoadingSkeleton variant="text" width="w-48" height="h-8" />
            <LoadingSkeleton variant="text" width="w-64" height="h-4" />
          </div>
          <LoadingSkeleton variant="button" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-white p-5"
              style={{ borderColor: "var(--admin-border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="animate-pulse rounded-xl h-10 w-10" style={{ backgroundColor: "var(--admin-bg)" }} />
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse h-3 w-16 rounded" style={{ backgroundColor: "var(--admin-bg)" }} />
                  <div className="animate-pulse h-5 w-12 rounded" style={{ backgroundColor: "var(--admin-bg)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Table skeleton */}
        <SkeletonTable rows={8} cols={4} />
      </div>
    </main>
  );
}