# Login Page Production Failure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diagnose why the login page works in development but fails in production, then implement a fix.

**Architecture:** The login flow involves three layers: (1) the login page form posting to `/api/login`, (2) the API route validating credentials and setting auth cookies, (3) middleware reading cookies to restore sessions. Production failures typically stem from cookie security settings, environment variable mismatches, or proxy/hosting platform differences.

**Tech Stack:** Next.js 16 App Router · Supabase Auth · Vercel (production) · Node.js

---

## File Structure

- **`src/app/login/page.tsx`** — Login form UI, posts to `/api/login`
- **`src/app/api/login/route.ts`** — Validates credentials, creates admin_users, sets `rc_access_token` and `rc_uid` cookies
- **`src/middleware.ts`** — Reads auth cookies (`rc_auth_uid`, `rc_auth_token`, `dev_session`) to restore session
- **`src/lib/admin-permissions.ts`** — `getAdminUser()` resolves auth from cookies, dev bypass, proxy UID, Supabase token
- **`src/lib/admin-permissions-service.ts`** — Creates admin_users via Supabase REST API (apikey-only, no Authorization header)

---

## Diagnostic Tasks

### Task 1: Reproduce and Instrument the Production Failure

**Files:**
- Modify: `src/app/api/login/route.ts:1-120`
- Modify: `src/middleware.ts:1-100`

- [ ] **Step 1: Add diagnostic logging to /api/login route**

Open `src/app/api/login/route.ts` and add console logging at each failure point. The route currently handles three failure modes: (1) credentials rejected by Supabase, (2) admin_users lookup fails, (3) cookie setting fails.

```typescript
// Add at the top of the POST handler, after extracting formData
console.log("[/api/login] isProd:", isProd, "NODE_ENV:", process.env.NODE_ENV);
console.log("[/api/login] Email:", email, "Password length:", password?.length);
console.log("[/api/login] Supabase URL:", supabaseUrl ? "set" : "MISSING");
console.log("[/api/login] Anon key:", supabaseAnonKey ? "set" : "MISSING");
console.log("[/api/login] Service role:", serviceRoleKey ? "set" : "MISSING");
```

- [ ] **Step 2: Add diagnostic logging to middleware auth resolution**

Open `src/middleware.ts` and log each auth resolution path at the start of the middleware function:

```typescript
console.log("[middleware] pathname:", request.nextUrl.pathname);
console.log("[middleware] dev_session:", devSession);
console.log("[middleware] rc_auth_uid:", rcAuthUid);
console.log("[middleware] rc_auth_token:", rcAuthToken ? "present" : "MISSING");
console.log("[middleware] rc_access_token:", rcAccessToken ? "present" : "MISSING");
console.log("[middleware] isProd:", process.env.NODE_ENV === "production");
```

- [ ] **Step 3: Deploy and reproduce**

Run `npm run build && npm run start` locally in production mode (or deploy to Vercel) and attempt login. Capture all console output from both the API route and middleware.

Expected: You will see which path fails — either the Supabase signInWithPassword call, the admin_users creation, or the cookie setting.

---

### Task 2: Check Cookie Configuration Differences

**Files:**
- Review: `src/app/api/login/route.ts:90-110` (cookie options)
- Review: `src/middleware.ts:23-54` (cookie reading)
- Review: `src/app/api/water-admin-auth/route.ts` (another cookie example)

- [ ] **Step 1: Document cookie options in each file**

The `/api/login` route sets cookies with these options (lines 99-105):
```typescript
const cookieOpts = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  httpOnly: true,
  sameSite: "lax",
  ...(isProd ? { secure: true } : {}),  // secure:true only in production
};
```

In production (HTTPS), `secure: true` is required for cookies to work. In development (HTTP), `secure: false` is needed. The conditional `...(isProd ? { secure: true } : {})` handles this.

- [ ] **Step 2: Verify the `isProd` variable is correctly computed**

Find where `isProd` is defined in `src/app/api/login/route.ts`. It should be:
```typescript
const isProd = process.env.NODE_ENV === "production";
```

If `NODE_ENV` is set differently in production (e.g., not explicitly set, or set to "production" but the Next.js server runs differently on Vercel), this could cause the cookie to be set without `secure: true` in production, making the cookie get rejected by the browser.

- [ ] **Step 3: Check if `SameSite=lax` causes issues on Vercel**

On some Vercel configurations, `SameSite=lax` combined with `secure: true` can cause issues if the domain has redirects or if there's a proxy in front. Try changing to `sameSite: "none"` with `secure: true` in production (requires HTTPS), or investigate if the cookie domain needs to be explicitly set.

---

### Task 3: Verify Environment Variables in Production

**Files:**
- Review: `src/app/api/login/route.ts:20-35`
- Review: `.env.example`
- Review: `.env.local` (development values)

- [ ] **Step 1: List all env vars used in the login flow**

The login route uses:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
```

- [ ] **Step 2: Check Vercel environment variables**

In Vercel dashboard → Settings → Environment Variables, verify:
1. `NEXT_PUBLIC_SUPABASE_URL` is set (not `NEXT_PUBLIC_` prefix in some cases)
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
3. `SUPABASE_SERVICE_ROLE_KEY` is set (this MUST be a server-side only variable, never exposed to client)

**Common issue:** `SUPABASE_SERVICE_ROLE_KEY` is set but the Next.js server component can't read it because Vercel's edge runtime doesn't have access to server-side env vars the same way.

- [ ] **Step 3: Verify Supabase URL format**

The Supabase URL must be the project URL (e.g., `https://xxxxx.supabase.co`), not the internal postgres URL. Check that the production env var matches the development value.

---

### Task 4: Check Middleware Auth Resolution

**Files:**
- Modify: `src/middleware.ts:23-54`

- [ ] **Step 1: Instrument the middleware auth resolution path**

Add logging to each branch of the auth resolution:
```typescript
if (isDevMode) {
  console.log("[middleware] Using dev mode, DEV_UID:", DEV_UID);
  authUid = DEV_UID;
} else if (rcAuthUid === DEV_FORCE_UID) {
  console.log("[middleware] Using dev force UID");
  authUid = DEV_FORCE_UID;
} else if (rcAuthUid) {
  console.log("[middleware] Using rc_auth_uid:", rcAuthUid);
  authUid = rcAuthUid;
} else if (rcAccessToken) {
  console.log("[middleware] Attempting rc_access_token validation");
  // JWT decode and validate...
}
```

- [ ] **Step 2: Check the `trust proxy` setting**

If the application runs behind a Vercel proxy or CDN, the `x-forwarded-proto` header may need to be trusted. In Next.js, add to `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [{ key: 'X-Forwarded-Proto', value: 'https' }],
  }];
},
```

Or in `middleware.ts`, check `request.headers.get('x-forwarded-proto')`.

---

### Task 5: Check Supabase Auth Configuration

**Files:**
- Review: Supabase Dashboard → Authentication → Settings
- Review: `src/lib/supabase.ts`

- [ ] **Step 1: Verify Supabase site URL in dashboard**

In Supabase Dashboard → Authentication → Settings → Site URL, verify the production URL matches:
- Dev: `http://localhost:3000`
- Prod: `https://your-production-domain.com`

If the Site URL doesn't match, Supabase may reject the auth redirect.

- [ ] **Step 2: Check redirect URLs in Supabase**

Supabase → Authentication → URL Configuration → Redirect URLs should include:
- `https://your-production-domain.com/login`
- `https://your-production-domain.com/admin/*`

Any redirect URL mismatch causes silent failures.

- [ ] **Step 3: Check Supabase anon key permissions**

The anon key is used client-side but also in server components. Verify the anon key hasn't been rotated or the project hasn't been migrated to a new Supabase instance.

---

### Task 6: Implement Fixes Based on Diagnosis

**Files:**
- Modify: `src/app/api/login/route.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: If cookie secure flag is the issue**

Update cookie options to explicitly handle all cases:
```typescript
const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  httpOnly: true,
  sameSite: isProd ? "none" : "lax",  // none requires secure
  secure: isProd,  // true in production (HTTPS), false in dev
};
```

- [ ] **Step 2: If env vars are missing in Vercel edge runtime**

Move critical env var reading to a function that handles missing vars gracefully:
```typescript
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[login] Missing required env var: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
```

- [ ] **Step 3: If middleware cookie reading is failing**

The middleware runs on the Vercel Edge Runtime which has limited cookie access. Ensure `rc_auth_uid` and `rc_auth_token` cookies are set with appropriate domain and path:
```typescript
cookieStore.set("rc_auth_uid", uid, {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  // No domain specified — uses current hostname
});
```

---

## Verification Plan

After each fix:

1. **Clear all cookies** in browser dev tools (Application tab → Cookies → Delete all)
2. **Restart the production server** or redeploy to Vercel
3. **Attempt login** with a known-valid account
4. **Check browser dev tools** → Network tab → `/api/login` request
   - Response status should be 200 or 3xx (redirect), not 400/401/500
5. **Check Application tab** → Cookies for `rc_access_token` and `rc_uid`
6. **Check console logs** in both the browser and server for errors

---

## Execution OPTIONS

**Option A (Recommended):** Use `superpowers:subagent-driven-development` — dispatch a subagent to work through each diagnostic task with two-stage review.

**Option B:** Use `superpowers:systematic-debugging` first to pinpoint the exact failure point, then implement targeted fixes.

**Which approach?**