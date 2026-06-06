import { auth, signOut } from "@/lib/auth";

/**
 * /protected-example
 *
 * Smoke-test page that demonstrates the new Auth.js v5 pattern. Calling
 * `auth()` server-side returns the current session (null if not signed
 * in). The middleware in `../middleware.ts` already redirects
 * unauthenticated visitors to `/login`, so by the time this page renders
 * we always have a session.
 *
 * The page shows:
 *   • The user's name, email, and provider
 *   • The session token (first 8 chars only — never expose the whole thing)
 *   • A "Sign out" form action that calls `signOut()` from `next-auth`
 */
export default async function ProtectedExamplePage() {
  const session = await auth();

  // Defensive: middleware should have already redirected. Render a
  // friendly hint if we ever reach here unauthenticated.
  if (!session?.user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow ring-1 ring-stone-200">
          <h1 className="text-xl font-semibold text-stone-900">
            Not signed in
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            You should have been redirected to{" "}
            <a className="text-emerald-700 underline" href="/login">
              /login
            </a>
            . If you can see this, the middleware matcher needs adjusting.
          </p>
        </div>
      </main>
    );
  }

  const user = session.user;
  const expires = session.expires
    ? new Date(session.expires).toLocaleString()
    : "(no expiry)";

  // The raw session token isn't on the session object in v5 (only the
  // csrfToken is exposed client-side). We surface what we do have.
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-6 py-12">
      <div className="w-full max-w-xl space-y-6">
        <header>
          <h1
            className="text-3xl font-semibold tracking-tight text-stone-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Protected example
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            You are signed in. This page is guarded by the Auth.js
            middleware in <code className="text-xs">middleware.ts</code>.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-stone-200">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Session
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Name</dt>
              <dd className="mt-1 font-medium text-stone-900">
                {user.name ?? "(none)"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Email</dt>
              <dd className="mt-1 font-medium text-stone-900 break-all">
                {user.email ?? "(none)"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">User id</dt>
              <dd className="mt-1 font-mono text-xs text-stone-700 break-all">
                {(user as { id?: string }).id ?? "(none)"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Session expires</dt>
              <dd className="mt-1 font-medium text-stone-900">{expires}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-stone-200">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Try it
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Use the form below to sign out, or navigate to{" "}
            <a className="text-emerald-700 underline" href="/admin">
              /admin
            </a>{" "}
            (the same session is shared).
          </p>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
