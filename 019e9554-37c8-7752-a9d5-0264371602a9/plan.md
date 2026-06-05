# Self-Hosted Storage + Schema Plan

## Context

The user is migrating Route Commerce from Supabase to a self-hosted stack:
- **Already done in this branch (`feat/better-auth`)**: Better Auth (auth), Docker Postgres, PostgREST, env var rewiring, ~10 source files updated to drop Supabase JS client.
- **What's broken right now**: The website is missing images (Supabase Storage URLs 404 because Supabase is going away), and the local Postgres can't apply the 137 migrations because the **base schema is missing** (the initial tables — `brands`, `orders`, `products`, `stops`, `admin_users` — were created in Supabase directly and never exported as a migration).
- **User constraint**: "no band-aids" — proper self-hosted replacement, not runtime patches.
- **User constraint**: "no data migration" — start with fresh empty DB; users re-upload assets.

## Approach

Three independent workstreams, executed in order:

1. **Capture the base schema** from the still-live Supabase project using `pg_dump --schema-only` (recommended over `supabase db pull`, which has a broken migration history). Apply the captured schema + existing 137 migrations to the local self-hosted Postgres.
2. **Stand up MinIO** in Docker as the S3-compatible object store. Wire it to the app via the AWS SDK. MinIO's URL structure is clean: `http://minio:9000/<bucket>/<key>`, publicly readable per-bucket via bucket policy.
3. **Replace every Supabase Storage URL** in the codebase with MinIO URLs (one env var: `NEXT_PUBLIC_STORAGE_BASE_URL`).

Storage buckets in use (from explore agent):
| Bucket | Purpose | Current state |
|---|---|---|
| `brand-logos` | Brand logo images | Hardcoded in 8+ files via env-var URL |
| `product-images` | Product photos | `80aa01da-ab4b-44f8-b6e7-700552457e18` (Supabase bucket UUID) |
| `contacts-imports` | CSV contact imports | `a1b2c3d4-…` (Supabase bucket UUID) |
| `videos` | Tuxedo video hero | Hardcoded Supabase URL in `TuxedoVideoHero.tsx` |
| `water-photos` (dynamic) | Water log photos | API route, bucket name in form field |

## Implementation

### Phase A — Capture base schema and apply to local Postgres

**Why `pg_dump`, not `supabase db pull`**: The remote Supabase project's `supabase_migrations.schema_migrations` history is out of sync with the local files (that's the long error list the user got). `supabase db pull` requires that history to be in sync before it'll write a new initial migration. `pg_dump` reads the live catalog directly and ignores the migration history entirely.

**Steps**:

1. **Capture the schema** from the remote Supabase DB (run on the user's Mac where direct PG works — MEMORY.md confirms direct PG is blocked from this dev box, but their Mac can do it):
   ```bash
   pg_dump "postgresql://postgres:<service-role-pw>@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres" \
     --schema-only --no-owner --no-privileges \
     --schema=public \
     -f supabase/captured_schema.sql
   ```
   *Exclude `auth` and `storage` schemas* — we stub `auth` ourselves and use MinIO instead of Supabase Storage. Note: 185 SECURITY DEFINER functions reference `auth.uid()`; these will compile against the preflight stub but return NULL at runtime. Phase D addresses this.

2. **Delete files that don't belong** in the local apply order:
   - `BUNDLE_018_042.sql` — concatenated duplicate
   - `XXX_blog_tables.sql`, `XXX_launch_checklist.sql`, `XXX_roadmap_tables.sql`, `XXX_waitlist_waitlist.sql` — drafts (XXX convention)
   - `099_contact_imports_bucket.sql` (the bucket-creation one — keep the RPCs though)
   - Rename to disambiguate any number collisions (no current collision, but defensive)

3. **Patch the 4 broken migrations** identified by the explore agent (read the file first, then `search_replace`):
   - `006_water_log_rpcs_fixed.sql`: replace `STATIC` with `STABLE` (6 occurrences)
   - `087_brand_logos_bucket.sql`: convert `CREATE POLICY IF NOT EXISTS …` to `DROP POLICY IF EXISTS …; CREATE POLICY …;` (4 policies)
   - `099_harvest_reach_segmentation.sql`: quote the `time` column references (matches the 148 patch)
   - `135_email_automation_rpcs.sql`: reorder `enroll_abandoned_cart` params so defaults come last, or add a default to `p_next_email_at`

4. **Update `000_preflight_supabase_compat.sql`** (already in the branch):
   - Add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` at the top
   - Remove the `storage.buckets` / `storage.objects` stub (MinIO replaces it; 087/145 storage policies will be deleted in step 2)

5. **Apply to local Postgres** (running on this dev box, port 5432):
   ```bash
   PGPASSWORD='lay7yqM3fHNvwpfjb4tvz7M3kimopyrSHQF24vsuGUM' \
     psql -h 127.0.0.1 -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -f supabase/migrations/000_preflight_supabase_compat.sql

   PGPASSWORD='lay7yqM3fHNvwpfjb4tvz7M3kimopyrSHQF24vsuGUM' \
     psql -h 127.0.0.1 -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -f supabase/captured_schema.sql

   PGPASSWORD='lay7yqM3fHNvwpfjb4tvz7M3kimopyrSHQF24vsuGUM' \
     for f in supabase/migrations/[0-9]*.sql; do
       psql -h 127.0.0.1 -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -q -f "$f" || break
     done
   ```
   Expected: most migrations apply, some fail (drop those, log in plan). This is the test that the local Postgres is actually usable.

### Phase B — MinIO for object storage

**Add to `docker-compose.yml`** (new `minio` service + `minio_init` one-shot to create buckets via `mc`):

```yaml
  minio:
    image: minio/minio:latest
    container_name: route_commerce_minio
    restart: unless-stopped
    env_file: [.env]
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports: ["127.0.0.1:9000:9000", "127.0.0.1:9001:9001"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio_init:
    image: minio/mc:latest
    depends_on:
      minio: { condition: service_healthy }
    env_file: [.env]
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        mc alias set local http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD}
        for b in brand-logos product-images contacts-imports videos water-photos; do
          mc mb --ignore-existing local/$${b}
          mc anonymous set download local/$${b}
        done
    profiles: ["init"]

volumes:
  minio_data: { driver: local }
```

**Add to `.env.example`**:
```
MINIO_ROOT_USER=routecommerce
MINIO_ROOT_PASSWORD=change-me-minio-root
NEXT_PUBLIC_STORAGE_BASE_URL=http://localhost:9000
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=routecommerce
STORAGE_SECRET_KEY=change-me-minio-root
STORAGE_BUCKET_PREFIX=
```

**Install AWS SDK** (MinIO is S3-compatible):
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Phase C — Replace Supabase Storage calls with MinIO

**New server-side helper** `src/lib/storage.ts`:
- `s3Client` configured from env (uses `@aws-sdk/client-s3`)
- `uploadFile({ bucket, key, body, contentType })` — replaces `fetch(PUT .../storage/v1/object/{bucket}/{key})` patterns
- `deleteFile({ bucket, key })`
- `publicUrl(bucket, key)` — returns `${STORAGE_BASE_URL}/${bucket}/${key}`
- Bucket name constants exported as a single source of truth

**Files to modify** (from explore agent):
- `src/actions/brand-settings.ts` — 8 `fetch` PUTs to `/storage/v1/object/brand-logos/...`
- `src/actions/products/upload-image.ts` — 3 calls to `product-images` bucket
- `src/actions/communications/import-contacts.ts` — `contacts-imports` bucket (PUT + LIST + RPC)
- `src/app/api/water-photo-upload/route.ts` — dynamic bucket
- `src/components/storefront/TuxedoVideoHero.tsx` — hardcoded `https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/...` for videos and brand-logos
- `src/components/time-tracking/TimeTrackingFieldClient.tsx` — same hardcoded URL
- `src/lib/email-service.ts` — 4 occurrences of `wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/...`
- `src/app/tuxedo/about/page.tsx` — same hardcoded URL

For the **hardcoded Supabase URLs**: replace with `publicUrl(bucket, key)` or `${process.env.NEXT_PUBLIC_STORAGE_BASE_URL}/${bucket}/${key}`.

**Remove**:
- The `MockStorageBuilder` in `src/lib/supabase.ts:193-223` (no longer needed)
- `SUPABASE_PAT` env var from `.env.example` (only used by water-photo-upload)

### Phase D — Auth wiring (closes the loop)

The 185 `auth.uid()` references in the captured schema will return NULL without intervention. Two options:

- **Option 1 (recommended, matches existing pattern)**: Disable RLS on all public tables, rely on the SECURITY DEFINER RPCs (which the codebase already does, per CLAUDE.md). One-time SQL after `captured_schema.sql` applies: `DO $$ DECLARE r record; BEGIN FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY'; END LOOP; END $$;`
- **Option 2**: Wire PostgREST to set `request.jwt.claim.sub` from the Better Auth session cookie. More complex; deferred unless RLS proves necessary.

**Recommend Option 1** for now — it's consistent with the existing "brand scoping in server actions" pattern, and the SECURITY DEFINER functions still work because they execute with the function owner's privileges (no RLS blocking).

### Phase E — Verification

End-to-end test sequence (no more "trust me, it works"):

1. **DB schema applies cleanly**:
   ```bash
   docker compose up -d db minio
   PGPASSWORD=$POSTGRES_PASSWORD psql -h 127.0.0.1 -U routecommerce -d route_commerce -f 000_preflight.sql
   PGPASSWORD=$POSTGRES_PASSWORD psql -h 127.0.0.1 -U routecommerce -d route_commerce -f captured_schema.sql
   for f in supabase/migrations/[0-9]*.sql; do psql ... -f "$f" || echo "FAIL: $f"; done
   ```
   Goal: all migrations apply (with the 4 patches from Phase A) OR the remaining failures are documented and skipped.

2. **PostgREST serves the schema**:
   ```bash
   curl http://127.0.0.1:3001/brands?limit=1 -H "apikey: local-anon"
   curl http://127.0.0.1:3001/rpc/get_public_stops_for_brand -X POST -H "Content-Type: application/json" -d '{"p_slug":"indian-river-direct"}'
   ```

3. **MinIO buckets are public**:
   ```bash
   mc alias set local http://127.0.0.1:9000 $USER $PASS
   mc ls local/
   curl -I http://127.0.0.1:9000/brand-logos/test.png   # should return 200 or 404, never 403
   ```

4. **App build passes**:
   ```bash
   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3001 \
     NEXT_PUBLIC_STORAGE_BASE_URL=http://127.0.0.1:9000 \
     BETTER_AUTH_SECRET=... npm run build
   ```
   Goal: `✓ Compiled successfully` with no Supabase URL parse errors, no `auth.uid()` undefined, no missing bucket errors.

5. **Image display in the browser**:
   - Start the dev server: `npm run dev`
   - Sign in via Better Auth (mock or real)
   - Upload a product image via admin UI → verify it lands in MinIO (`mc ls local/product-images/`)
   - Visit `/indian-river-direct/products/[slug]` → verify the image renders with the MinIO URL

6. **Auth round-trip**:
   - `POST /api/auth/sign-up/email` with test email/password → expect 200, user created in `better_auth_user` (or whatever Better Auth's table is — check `200_better_auth_tables.sql`)
   - `POST /api/auth/sign-in/email` → expect session cookie
   - Hit `/admin` with the cookie → expect 200, not redirect to `/login`

## Files to modify (summary)

| File | Change |
|---|---|
| `docker-compose.yml` | Add `minio` + `minio_init` services, `minio_data` volume |
| `.env.example` | Add MinIO + storage env vars, remove `SUPABASE_PAT` |
| `package.json` | Add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| `supabase/migrations/000_preflight_supabase_compat.sql` | Add `pgcrypto` extension, remove storage stub |
| `supabase/migrations/006_water_log_rpcs_fixed.sql` | `STATIC` → `STABLE` |
| `supabase/migrations/087_brand_logos_bucket.sql` | `CREATE POLICY IF NOT EXISTS` → `DROP + CREATE` |
| `supabase/migrations/099_harvest_reach_segmentation.sql` | Quote `time` column refs |
| `supabase/migrations/135_email_automation_rpcs.sql` | Reorder `enroll_abandoned_cart` params |
| `supabase/captured_schema.sql` | **NEW** — output of `pg_dump` from remote |
| `src/lib/storage.ts` | **NEW** — S3 client, upload/delete/publicUrl helpers, bucket constants |
| `src/actions/brand-settings.ts` | Replace 8 Supabase fetch PUTs with `uploadFile` |
| `src/actions/products/upload-image.ts` | Replace 3 calls with `uploadFile` |
| `src/actions/communications/import-contacts.ts` | Replace PUT + LIST with `uploadFile` / S3 ListObjectsV2 |
| `src/app/api/water-photo-upload/route.ts` | Replace Supabase call with `uploadFile` |
| `src/components/storefront/TuxedoVideoHero.tsx` | Replace hardcoded Supabase URL with `publicUrl()` |
| `src/components/time-tracking/TimeTrackingFieldClient.tsx` | Same |
| `src/lib/email-service.ts` | Same (4 occurrences) |
| `src/app/tuxedo/about/page.tsx` | Same |
| `src/lib/supabase.ts` | Remove `MockStorageBuilder` (lines 193-223) |

## Reuse from existing code

- `src/lib/supabase.ts` — the `supabase` JS client still exports query builders used by `src/lib/svc-headers.ts` and many server actions for non-auth RPCs. Keep it for now; it's PostgREST-compatible because both speak the PostgREST protocol.
- `src/lib/auth.ts` — Better Auth config, already wired in this branch. No changes needed.
- `src/lib/admin-permissions.ts` — already swapped to use Better Auth + direct `pg`. No changes needed.
- `src/lib/svc-headers.ts` — used to build Supabase REST headers. Stays as-is (the anon/service-role strings still work against PostgREST).

## Risks

- **Migration apply order**: even after patches, some migrations may reference tables that haven't been created yet due to deletion order. The captured `pg_dump` puts everything in dependency order, so applying it first should resolve most cross-references.
- **The 4 broken migrations may be load-bearing**: 087 (brand-logos RLS) is already removed in the cleanup step. 006 (water log RPCs) is critical for the `/admin/water-log` pages. 099 is critical for communications. 135 is critical for the email automation. If the patches don't work, the affected features will be broken — but the rest of the app should still build and run.
- **Existing user-uploaded images in Supabase will be unreachable**: the user said "no data migration", so this is expected. Admins will re-upload logos/product images. The Tuxedo video and Olathe logos (referenced in `email-service.ts` and `tuxedo/about/page.tsx`) are brand assets the user will need to copy over manually.
- **PostgREST connection pooling**: PostgREST opens ~10 connections to Postgres. The 137 migrations + `pg_dump` schema may reference `auth.uid()` inside SECURITY DEFINER functions, which will fail to plan if the `auth` schema is missing. The preflight stubs the function but the `pg_dump` will also try to create the same function (with the real Supabase body). If `pg_dump` includes a non-stub `auth.uid()` that conflicts with the preflight, apply `pg_dump` first, then the preflight.
