import LoadingSkeleton, { SkeletonTable } from "@/components/shared/LoadingSkeleton";

export default function AdminLoading() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <LoadingSkeleton variant="text" width="w-48" height="h-8" />
            <LoadingSkeleton variant="text" width="w-64" height="h-4" />
          </div>
          <LoadingSkeleton variant="button" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>

        {/* Table skeleton */}
        <SkeletonTable rows={8} cols={4} />
      </div>
    </main>
  );
}