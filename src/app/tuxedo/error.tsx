"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-red-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-red-900">Page Error</h1>
        <p className="mt-4 text-red-700">{error.message}</p>
        {error.digest && (
          <p className="mt-2 text-sm text-red-500">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-red-600 px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
