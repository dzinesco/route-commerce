export default function Loading() {
  return (
    <main className="min-h-screen bg-yellow-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-12 w-80 rounded bg-slate-200" />
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}