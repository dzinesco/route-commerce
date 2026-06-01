export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded bg-stone-200" />
          <div className="h-12 w-72 rounded bg-stone-200" />
          <div className="h-4 w-96 rounded bg-stone-200" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-stone-200" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}