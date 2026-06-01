export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-56 rounded bg-slate-200" />
          <div className="h-12 w-96 rounded bg-slate-200" />
          <div className="h-4 w-full max-w-xl rounded bg-slate-200" />
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}