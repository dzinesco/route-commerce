export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="animate-pulse space-y-5">
          <div className="h-16 rounded-xl bg-slate-800" />
          <div className="h-8 w-48 rounded bg-slate-300" />
          <div className="h-12 w-full rounded-xl bg-white" />
          <div className="h-12 w-full rounded-xl bg-white" />
          <div className="h-12 w-full rounded-xl bg-white" />
          <div className="h-12 w-full rounded-xl bg-white" />
          <div className="h-10 w-full rounded-xl bg-slate-300" />
        </div>
      </div>
    </main>
  );
}