export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-12 w-80 rounded bg-slate-200" />
          <div className="h-4 w-full max-w-xl rounded bg-slate-200" />
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm" />
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm" />
          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm" />
        </div>
      </div>
    </main>
  );
}