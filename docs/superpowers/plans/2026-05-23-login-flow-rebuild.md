# Login Flow Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin login/auth flow so it is simple, auditable, and never throws ambiguous errors. Single auth cookie (`rc_auth_uid`), single lookup path in `getAdminUser()`, clear error messages.

**Architecture:** Login API sets only `rc_auth_uid` (httpOnly, secure in prod). `getAdminUser()` reads `rc_auth_uid` → REST lookup via service role apikey → return AdminUser or null. All other cookie paths (`rc_access_token`, `rc_uid`, `rc_auth_token`, `sb-*` session) are removed from the admin auth flow. `getAdminUser()` NEVER throws — it always returns AdminUser or null.

**Tech Stack:** Next.js 16 App Router · Supabase Auth · Vercel (Node.js runtime) · TypeScript

---

## File Structure

- **`src/app/api/login/route.ts`** — Login API: authenticate + set ONLY `rc_auth_uid` cookie
- **`src/lib/admin-permissions.ts`** — `getAdminUser()`: ONLY `rc_auth_uid` path, never throws
- **`src/app/admin/layout.tsx`** — AdminLayout: show "Access Denied" not "Auth Error", log actual errors
- **`src/middleware.ts`** — Middleware: only check `rc_auth_uid`, remove all other auth cookie checks
- **`src/app/admin/test-auth/page.tsx`** — New debug page: shows all cookie values + getAdminUser result

---

## Task 1: Simplify `/api/login` — Set Only `rc_auth_uid`

**Files:**
- Modify: `src/app/api/login/route.ts:96-113`

- [ ] **Step 1: Replace cookie setting block**

Replace the cookie setting section (lines 96-113) with:

```typescript
console.log("[/api/login] setting cookies for user:", data.user.id);
const cookieStore = await cookies();
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  httpOnly: true,
  sameSite: "lax" as const,
  ...(isProd ? { secure: true } : {}),
};

// Only rc_auth_uid — this is the single auth cookie for admin.
// Middleware checks rc_auth_uid; getAdminUser() looks up admin_users by this UID.
cookieStore.set("rc_auth_uid", data.user.id, cookieOpts);
console.log("[/api/login] rc_auth_uid set:", data.user.id);

console.log("[/api/login] returning success");
return NextResponse.json({ success: true, userId: data.user.id });
```

**Note:** Remove `rc_access_token` and `rc_uid` cookie setting entirely. `rc_auth_uid` alone is sufficient — it contains the Supabase auth UID which is what both middleware and `getAdminUser()` use.

- [ ] **Step 2: Verify no other cookies are set in this file**

Search for all `cookieStore.set` calls in the file — confirm only `rc_auth_uid` is set.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/login/route.ts
git commit -m "fix: /api/login only sets rc_auth_uid — removes rc_access_token/rc_uid cookies

rc_auth_uid is the single auth cookie. Middleware checks it directly;
getAdminUser() uses it as the UID for admin_users lookup. No need for
rc_access_token or rc_uid in the admin auth flow."
```

---

## Task 2: Simplify `getAdminUser()` — Single Path, Never Throws

**Files:**
- Modify: `src/lib/admin-permissions.ts:1-233`

- [ ] **Step 1: Replace the entire getAdminUser function**

Replace the current `getAdminUser()` function (lines 24-182) with this simplified version:

```typescript
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[getAdminUser] Missing env vars");
      return null;
    }

    // ── Dev session bypass (local only — NEVER in production) ────────
    if (process.env.NODE_ENV === "development") {
      const devSession = cookieStore.get("dev_session")?.value;
      if (devSession && (devSession === "platform_admin" || devSession === "brand_admin" || devSession === "store_employee")) {
        console.log("[getAdminUser] dev_session active — using dev auth");
        return buildDevAdminUser(devSession);
      }
    }

    // ── rc_auth_uid is the ONLY auth cookie for admin ───────────────
    const rcAuthUid = cookieStore.get("rc_auth_uid")?.value;
    if (!rcAuthUid) {
      console.log("[getAdminUser] no rc_auth_uid cookie — returning null");
      return null;
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.error("[getAdminUser] no SUPABASE_SERVICE_ROLE_KEY — cannot look up admin_users");
      return null;
    }

    // Look up admin_users by rc_auth_uid (the Supabase auth user UID)
    const rawLookup = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${rcAuthUid}&limit=1`,
      { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
    );

    if (!rawLookup.ok) {
      console.error("[getAdminUser] admin_users lookup failed:", rawLookup.status);
      return null;
    }

    const adminUsers = rawLookup.ok ? await rawLookup.json().catch(() => null) : null;
    if (!adminUsers || adminUsers.length === 0) {
      console.log("[getAdminUser] no admin_users record for uid:", rcAuthUid);
      // Auto-create platform_admin for this user
      const { createAdminUser } = await import("@/lib/admin-permissions-service");
      const newAdmin = await createAdminUser(rcAuthUid, "platform_admin", null);
      if (!newAdmin) {
        console.error("[getAdminUser] createAdminUser returned null");
        return null;
      }
      return buildAdminUser(newAdmin as Record<string, unknown>);
    }

    const adminUser = adminUsers[0];
    if (!adminUser.active) {
      console.log("[getAdminUser] admin_users record is inactive:", rcAuthUid);
      return null;
    }

    console.log("[getAdminUser] success — uid:", rcAuthUid, "role:", adminUser.role);
    return buildAdminUser(adminUser);

  } catch (err) {
    // NEVER throw — always return null on error
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[getAdminUser] unexpected error:", msg);
    return null;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin-permissions.ts
git commit -m "refactor: simplify getAdminUser() to single rc_auth_uid path

Removes rcAccessToken validation path, the createServerClient path, and
all fallback logic. getAdminUser() now:
1. Checks dev_session (dev only)
2. Reads rc_auth_uid cookie only
3. Looks up admin_users via REST with apikey header (no Bearer token)
4. Auto-creates admin_users if missing
5. NEVER throws — returns AdminUser or null

This eliminates all paths that could throw TypeError from
createServerClient or Authorization header issues."
```

---

## Task 3: Fix AdminLayout — "Access Denied" Not "Auth Error"

**Files:**
- Modify: `src/app/admin/layout.tsx:7-27`

- [ ] **Step 1: Replace the error display**

Replace the `catch (e)` block in AdminLayout (lines 13-27) with:

```typescript
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(err);
    console.error("[AdminLayout] getAdminUser threw:", errMsg);
    return (
      <>
        <AdminHeader userRole={null} routeTraceEnabled={false} />
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400 text-sm">Your session could not be verified. Please log out and log back in.</p>
            <p className="text-zinc-600 text-xs mt-2 font-mono">{errMsg}</p>
          </div>
        </div>
      </>
    );
  }
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "fix: AdminLayout shows 'Access Denied' not 'Auth Error' on getAdminUser throw

Also shows the actual error message in a monospace block for debugging.
'Auth Error' was vague and unhelpful — 'Access Denied' clearly indicates
the session verification failed without implying a system brokenness."
```

---

## Task 4: Simplify Middleware — Only Check `rc_auth_uid`

**Files:**
- Modify: `src/middleware.ts:17-73`

- [ ] **Step 1: Replace auth resolution block**

The current middleware has complex multi-path auth resolution (dev_session, rcAuthUid, rcAuthToken, rcAccessToken, Supabase SSR). Replace the auth resolution section (lines 27-55) with:

```typescript
  const devSession = request.cookies.get("dev_session")?.value;
  const isDevMode = devSession === "platform_admin" || devSession === "brand_admin" || devSession === "store_employee";
  const rcAuthUid = request.cookies.get("rc_auth_uid")?.value;

  let authUid: string | null = null;

  if (isDevMode) {
    // Dev session only valid in development
    authUid = DEV_UID;
  } else if (rcAuthUid) {
    // rc_auth_uid is set by /api/login — treat as authenticated
    authUid = rcAuthUid;
  }
  // No rc_auth_uid in production → authUid stays null → redirect to /login
```

The rest of the middleware (redirect logic, matcher) stays unchanged.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "fix: middleware only checks rc_auth_uid for production auth

Removes all other auth cookie checks (rc_auth_token, rc_access_token).
Middleware now: dev_session (dev only) OR rc_auth_uid → authenticated.
No more complex multi-path resolution that could fail silently."
```

---

## Task 5: Add `/admin/test-auth` Debug Page

**Files:**
- Create: `src/app/admin/test-auth/page.tsx`

- [ ] **Step 1: Create the debug page**

Create `src/app/admin/test-auth/page.tsx`:

```typescript
import { getAdminUser } from "@/lib/admin-permissions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestAuthPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  let adminUser = null;
  let error: string | null = null;

  try {
    adminUser = await getAdminUser();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Auth Debug</h1>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">All Cookies ({allCookies.length})</h2>
        <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto max-h-64">
          {allCookies.map(c => `${c.name}=${c.value.slice(0, 80)}${c.value.length > 80 ? "..." : ""}`).join("\n") || "(none)"}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">rc_auth_uid</h2>
        <p className="text-lg font-mono">
          {allCookies.some(c => c.name === "rc_auth_uid")
            ? <span className="text-emerald-400">SET — {allCookies.find(c => c.name === "rc_auth_uid")?.value}</span>
            : <span className="text-red-400">NOT SET</span>
          }
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">rc_access_token</h2>
        <p className="text-lg font-mono">
          {allCookies.some(c => c.name === "rc_access_token")
            ? <span className="text-yellow-400">SET (not needed)</span>
            : <span className="text-zinc-500">NOT SET (OK)</span>
          }
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">getAdminUser() result</h2>
        {error ? (
          <div>
            <p className="text-red-400 font-bold">ERROR</p>
            <pre className="bg-red-950/50 p-4 rounded-xl text-sm mt-2">{error}</pre>
          </div>
        ) : adminUser ? (
          <div>
            <p className="text-emerald-400 font-bold">AUTHENTICATED</p>
            <pre className="bg-black/50 p-4 rounded-xl text-sm mt-2 overflow-auto">
              {JSON.stringify({
                id: adminUser.id,
                user_id: adminUser.user_id,
                role: adminUser.role,
                brand_id: adminUser.brand_id,
                active: adminUser.active,
              }, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-red-400">NOT AUTHENTICATED — null returned</p>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-zinc-800">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Quick Actions</h2>
        <div className="flex gap-4">
          <a href="/admin" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500">
            Go to Admin
          </a>
          <form action="/api/logout" method="POST">
            <button type="submit" className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700">
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/test-auth/page.tsx
git commit -m "feat: add /admin/test-auth debug page for auth troubleshooting

Shows all cookie values, rc_auth_uid status, rc_access_token status,
and getAdminUser() result. Helps diagnose auth issues quickly in prod."
```

---

## Task 6: Deploy and Verify

- [ ] **Step 1: Push all commits**

```bash
git push
```

- [ ] **Step 2: Deploy to Vercel production**

```bash
npx vercel --prod
```

Wait for deployment to be READY.

- [ ] **Step 3: Verification checklist**

In an incognito browser window:
1. Go to `/admin` — should redirect to `/login`
2. Clear all cookies
3. Go to `/login` — should show login form with no errors
4. Log in with real credentials
5. Should land on `/admin` — no "Auth Error" or "Access Denied"
6. Go to `/admin/test-auth` — should show:
   - `rc_auth_uid` = SET
   - `rc_access_token` = NOT SET
   - `getAdminUser()` = AUTHENTICATED
7. Logout — should clear `rc_auth_uid`
8. Try accessing `/admin` again — should redirect to `/login`

---

## Verification Plan

After each fix, clear all cookies and test login flow end-to-end:

1. **Clear cookies** in browser dev tools (Application tab → Cookies → Delete all)
2. **Login** at `/login` with known-valid credentials
3. **Land on `/admin`** — should show admin dashboard, not an error
4. **Check `/admin/test-auth`** — `rc_auth_uid` SET, `rc_access_token` NOT SET, AUTHENTICATED
5. **Logout** and verify redirect to `/login`

If any step fails, stop and diagnose before proceeding to next task.