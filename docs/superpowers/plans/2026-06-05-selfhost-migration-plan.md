# Supabase → Self-Hosted Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Route Commerce off Supabase's hosted platform onto a self-hosted stack (Postgres + PostgREST + MinIO + better-auth) while preserving all data and behavior. Consolidate the two in-flight branches into one coherent `selfhost/migrate` branch.

**Architecture:** Merge `crispygoat/self-hosted-postgres` (infra: docker-compose, Gitea deploy, env) and `crispygoat/feat/better-auth` (app: better-auth + S3 SDK + admin-permissions rewrite). Capture full schema + data from live Supabase via `pg_dump`. Apply preflight + captured schema + 137 migrations + RLS disable to a local Postgres 16 container. Stand up MinIO + PostgREST alongside. Keep `supabase-js` client (it speaks PostgREST natively) — only swap the base URL.

**Tech Stack:** Postgres 16 (Docker), PostgREST 12 (Docker), MinIO (Docker), better-auth (Node), Kysely + pg, AWS SDK for JavaScript v3, Next.js 16, Node 22.

**Spec:** `docs/superpowers/specs/2026-06-05-selfhost-migration-design.md`

**Working assumptions:**
- Working directory: `/home/coder/.grok/worktrees/kyle-route-commerce-main/2026-06-05-164dcb44`
- Supabase project ref: `wnzkhezyhnfzhkhiflrp` (per CLAUDE.md / MEMORY.md)
- Supabase DB password: in `.env.local` on the user's Mac (not committed); passed via env var to `pg_dump`
- Docker is installed locally; user can run `docker compose`
- Direct PG connection to Supabase works from the user's Mac (not from this dev box, per MEMORY.md)
- Local Postgres: `127.0.0.1:5432`; PostgREST: `127.0.0.1:3001`; MinIO API: `127.0.0.1:9000`; MinIO console: `127.0.0.1:9001`
- Local Postgres credentials: user `routecommerce`, password from local `.env`

---

## Phase 0 — Branch setup and merge

### Task 0.1: Create the migration branch

**Files:** none (git only)

- [ ] **Step 1: Fetch both source branches**

```bash
cd /home/coder/.grok/worktrees/kyle-route-commerce-main/2026-06-05-164dcb44
git fetch crispygoat
git fetch origin
```

Expected: `crispygoat/self-hosted-postgres` and `crispygoat/feat/better-auth` both updated.

- [ ] **Step 2: Create and check out the new branch from main**

```bash
git checkout -b selfhost/migrate main
```

Expected: `Switched to a new branch 'selfhost/migrate'`.

- [ ] **Step 3: Verify branch state**

```bash
git log --oneline -1
```

Expected: `9374e63 docs(memory): record Codex review round 2 pass`.

---

### Task 0.2: Cherry-pick the self-hosted-postgres branch

**Files:** cherry-picked from `crispygoat/self-hosted-postgres`

- [ ] **Step 1: Cherry-pick the 7 commits in chronological order**

```bash
git cherry-pick 2de32b0 988310f 8ad8dbb fddb917 beac3e4 e8f2d76 367a562
```

Expected: Either all commits apply cleanly, OR you see "CONFLICT" messages.

- [ ] **Step 2: If conflicts appear, resolve them now**

Expected conflicts: `.env.example` (will be merged with better-auth env in Task 0.3); `.gitea/workflows/deploy.yml` (updated in Task 0.5); `docker-compose.yml` (extended with PostgREST + MinIO in Task 0.4).

For each conflict:
1. Open the file.
2. Resolve by taking the union of both sides, with section comments.
3. `git add <file>`.
4. `git cherry-pick --continue`.

- [ ] **Step 3: Verify all 7 commits applied**

```bash
git log --oneline -8
```

Expected: top 7 commits match the cherry-pick list, in order, with `9374e63` at position 8.

- [ ] **Step 4: Verify docker-compose.yml exists and has the db service**

```bash
grep -A2 "services:" docker-compose.yml
```

Expected: shows the `db:` service block (Postgres 16).

---

### Task 0.3: Cherry-pick the feat/better-auth branch

**Files:** cherry-picked from `crispygoat/feat/better-auth`

- [ ] **Step 1: Cherry-pick the single commit**

```bash
git cherry-pick 456b5b1
```

Expected: Either applies cleanly, OR conflicts in `.env.example`, `docker-compose.yml`, or `.gitea/workflows/deploy.yml`.

- [ ] **Step 2: Resolve conflicts if needed**

Take the union of both sides. For `.env.example`, organize into sections:

```bash
# ── Postgres (self-hosted) ──   (from self-hosted-postgres)
# ── PostgREST ──                 (NEW — added in Task 0.4)
# ── better-auth ──               (from feat/better-auth)
# ── MinIO ──                     (NEW — added in Task 0.4)
# ── Supabase env vars (legacy) ── (modified to point to local PostgREST)
```

For each conflict: open the file, resolve by union, `git add <file>`, `git cherry-pick --continue`.

- [ ] **Step 3: Verify the new files exist**

```bash
ls -la src/lib/auth.ts src/lib/auth-client.ts src/lib/storage.ts \
       src/app/api/auth/\[...all\]/route.ts \
       supabase/migrations/000_preflight_supabase_compat.sql \
       supabase/migrations/200_better_auth_tables.sql
```

Expected: all 6 files exist.

- [ ] **Step 4: Verify the deleted migrations are gone**

```bash
ls supabase/migrations/BUNDLE_018_042.sql \
   supabase/migrations/087_brand_logos_bucket.sql \
   supabase/migrations/099_contact_imports_bucket.sql \
   supabase/migrations/145_create_product_images_bucket.sql 2>&1
```

Expected: all 4 files report "No such file or directory".

- [ ] **Step 5: Verify `src/lib/supabase/server.ts` is gone**

```bash
ls src/lib/supabase/server.ts 2>&1
```

Expected: "No such file or directory".

---

### Task 0.4: Add PostgREST + MinIO services to docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Read current docker-compose.yml**

```bash
cat docker-compose.yml
```

- [ ] **Step 2: Append the PostgREST + MinIO + minio_init services**

Append to `docker-compose.yml` (before the existing `volumes:` section if present, else at end):

```yaml
  postgrest:
    image: postgrest/postgrest:v12.2.3
    container_name: route_commerce_postgrest
    restart: unless-stopped
    env_file: [.env]
    environment:
      PGRST_SERVER_PORT: 3001
      PGRST_SERVER_HOST: 0.0.0.0
      PGRST_DB_URI: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      PGRST_DB_ANON_ROLE: anon
      PGRST_DB_SCHEMAS: public
      PGRST_OPENAPI_MODE: disabled
      PGRST_JWT_SECRET: ${POSTGREST_JWT_SECRET:-dev-secret-not-for-prod}
    ports:
      - "127.0.0.1:3001:3001"
    depends_on:
      db:
        condition: service_healthy

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
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  minio_init:
    image: minio/mc:latest
    container_name: route_commerce_minio_init
    depends_on:
      minio:
        condition: service_healthy
    env_file: [.env]
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        set -e
        mc alias set local http://minio:9000 $${MINIO_ROOT_USER} $${MINIO_ROOT_PASSWORD}
        for b in brand-logos product-images contacts-imports videos water-photos; do
          mc mb --ignore-existing local/$${b}
          mc anonymous set download local/$${b}
        done
        echo "MinIO buckets initialized"
```

- [ ] **Step 3: Add `minio_data` to the volumes section**

Find the existing `volumes:` block and add `minio_data`:

```yaml
volumes:
  db_data:
    driver: local
  minio_data:
    driver: local
```

- [ ] **Step 4: Verify the YAML parses**

```bash
docker compose config --quiet
```

Expected: exit code 0, no output.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add PostgREST, MinIO, and minio_init services"
```

---

### Task 0.5: Update Gitea deploy workflow to bring up Docker stack

**Files:**
- Modify: `.gitea/workflows/deploy.yml`

- [ ] **Step 1: Read current deploy.yml**

```bash
cat .gitea/workflows/deploy.yml
```

- [ ] **Step 2: Add a "Start Docker stack" step before the existing "Deploy" step**

Insert AFTER `npm run build` and BEFORE `Deploy`:

```yaml
      - name: Start Docker stack
        env:
          POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
          MINIO_ROOT_USER: ${{ secrets.MINIO_ROOT_USER }}
          MINIO_ROOT_PASSWORD: ${{ secrets.MINIO_ROOT_PASSWORD }}
          POSTGREST_JWT_SECRET: ${{ secrets.POSTGREST_JWT_SECRET }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd /home/tyler/route-commerce
          [ -f .env ] || cp .env.example .env
          {
            echo "POSTGRES_USER=${POSTGRES_USER}"
            echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
            echo "POSTGRES_DB=${POSTGRES_DB}"
            echo "MINIO_ROOT_USER=${MINIO_ROOT_USER}"
            echo "MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}"
            echo "POSTGREST_JWT_SECRET=${POSTGREST_JWT_SECRET}"
            echo "DATABASE_URL=${DATABASE_URL}"
          } >> .env
          docker compose up -d db postgrest minio minio_init
          for i in $(seq 1 30); do
            if docker compose exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
              echo "Postgres is ready"
              break
            fi
            sleep 2
          done
```

- [ ] **Step 3: Add a migration apply step**

Insert AFTER `Start Docker stack` and BEFORE `Deploy`:

```yaml
      - name: Apply migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
        run: |
          cd /home/tyler/route-commerce
          PGPASSWORD="${POSTGRES_PASSWORD}" psql -h 127.0.0.1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=0 -f supabase/migrations/000_preflight_supabase_compat.sql || true
          [ -f supabase/captured_schema.sql ] && PGPASSWORD="${POSTGRES_PASSWORD}" psql -h 127.0.0.1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=0 -f supabase/captured_schema.sql || echo "captured_schema.sql not present, skipping"
          for f in supabase/migrations/[0-9]*.sql; do
            PGPASSWORD="${POSTGRES_PASSWORD}" psql -h 127.0.0.1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=0 -q -f "$f" || echo "FAIL: $f"
          done
```

- [ ] **Step 4: Update the `Deploy` step's `env:` block**

Add to the `Deploy` step's `env:` block (preserving the existing env entries):

```yaml
          POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
          MINIO_ROOT_USER: ${{ secrets.MINIO_ROOT_USER }}
          MINIO_ROOT_PASSWORD: ${{ secrets.MINIO_ROOT_PASSWORD }}
          POSTGREST_JWT_SECRET: ${{ secrets.POSTGREST_JWT_SECRET }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          BETTER_AUTH_URL: ${{ secrets.BETTER_AUTH_URL }}
          NEXT_PUBLIC_BETTER_AUTH_URL: ${{ secrets.NEXT_PUBLIC_BETTER_AUTH_URL }}
          STORAGE_ENDPOINT: ${{ secrets.STORAGE_ENDPOINT }}
          STORAGE_REGION: ${{ secrets.STORAGE_REGION }}
          STORAGE_ACCESS_KEY: ${{ secrets.STORAGE_ACCESS_KEY }}
          STORAGE_SECRET_KEY: ${{ secrets.STORAGE_SECRET_KEY }}
          STORAGE_BUCKET_PREFIX: ${{ secrets.STORAGE_BUCKET_PREFIX }}
          NEXT_PUBLIC_STORAGE_BASE_URL: ${{ secrets.NEXT_PUBLIC_STORAGE_BASE_URL }}
          PGRST_SERVER_PORT: ${{ secrets.PGRST_SERVER_PORT }}
          PGRST_DB_URI: ${{ secrets.PGRST_DB_URI }}
          PGRST_DB_ANON_ROLE: ${{ secrets.PGRST_DB_ANON_ROLE }}
          PGRST_JWT_SECRET: ${{ secrets.POSTGREST_JWT_SECRET }}
```

- [ ] **Step 5: Update the `printf` block in the `Deploy` step**

Replace the existing printf block with:

```bash
          {
            printf "POSTGRES_USER=%s\n" "$POSTGRES_USER"
            printf "POSTGRES_PASSWORD=%s\n" "$POSTGRES_PASSWORD"
            printf "POSTGRES_DB=%s\n" "$POSTGRES_DB"
            printf "MINIO_ROOT_USER=%s\n" "$MINIO_ROOT_USER"
            printf "MINIO_ROOT_PASSWORD=%s\n" "$MINIO_ROOT_PASSWORD"
            printf "POSTGREST_JWT_SECRET=%s\n" "$POSTGREST_JWT_SECRET"
            printf "DATABASE_URL=%s\n" "$DATABASE_URL"
            printf "BETTER_AUTH_SECRET=%s\n" "$BETTER_AUTH_SECRET"
            printf "BETTER_AUTH_URL=%s\n" "$BETTER_AUTH_URL"
            printf "NEXT_PUBLIC_BETTER_AUTH_URL=%s\n" "$NEXT_PUBLIC_BETTER_AUTH_URL"
            printf "STORAGE_ENDPOINT=%s\n" "$STORAGE_ENDPOINT"
            printf "STORAGE_REGION=%s\n" "$STORAGE_REGION"
            printf "STORAGE_ACCESS_KEY=%s\n" "$STORAGE_ACCESS_KEY"
            printf "STORAGE_SECRET_KEY=%s\n" "$STORAGE_SECRET_KEY"
            printf "STORAGE_BUCKET_PREFIX=%s\n" "$STORAGE_BUCKET_PREFIX"
            printf "NEXT_PUBLIC_STORAGE_BASE_URL=%s\n" "$NEXT_PUBLIC_STORAGE_BASE_URL"
            printf "PGRST_SERVER_PORT=%s\n" "$PGRST_SERVER_PORT"
            printf "PGRST_DB_URI=%s\n" "$PGRST_DB_URI"
            printf "PGRST_DB_ANON_ROLE=%s\n" "$PGRST_DB_ANON_ROLE"
            printf "PGRST_JWT_SECRET=%s\n" "$POSTGREST_JWT_SECRET"
            printf "NEXT_PUBLIC_SUPABASE_URL=%s\n" "$NEXT_PUBLIC_SUPABASE_URL"
            printf "NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
            printf "STRIPE_SECRET_KEY=%s\n" "$STRIPE_SECRET_KEY"
            printf "MINIMAX_API_KEY=%s\n" "$MINIMAX_API_KEY"
            printf "MINIMAX_BASE_URL=%s\n" "$MINIMAX_BASE_URL"
          } > $APP_DIR/.env.production
```

- [ ] **Step 6: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.gitea/workflows/deploy.yml'))"
```

Expected: exit code 0, no output.

- [ ] **Step 7: Commit**

```bash
git add .gitea/workflows/deploy.yml
git commit -m "feat(deploy): bring up Docker stack + apply migrations in Gitea workflow"
```

---

### Task 0.6: Fix useMockData to not trigger on non-Supabase URLs

**Files:**
- Modify: `src/lib/supabase.ts:8`

- [ ] **Step 1: Read the current line 8**

```bash
sed -n '8p' src/lib/supabase.ts
```

Expected:
```ts
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl || !supabaseUrl.includes("supabase.co");
```

- [ ] **Step 2: Replace the line**

Replace:
```ts
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl || !supabaseUrl.includes("supabase.co");
```

With:
```ts
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl;
```

Rationale: with local PostgREST, the URL is `http://localhost:3001`. The previous check treated non-Supabase URLs as a "no backend" signal and forced mock mode.

- [ ] **Step 3: Verify the change**

```bash
sed -n '8p' src/lib/supabase.ts
```

Expected:
```ts
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "fix(supabase): don't force mock mode for non-Supabase URLs"
```

---

### Task 0.7: Update package.json with new dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

```bash
cat package.json
```

- [ ] **Step 2: Add dependencies (if not already added by the cherry-pick)**

In the `dependencies` block, ensure these are present:

```json
    "@aws-sdk/client-s3": "^3.687.0",
    "@aws-sdk/s3-request-presigner": "^3.687.0",
    "better-auth": "^1.0.0",
    "kysely": "^0.27.5",
    "pg": "^8.13.1"
```

- [ ] **Step 3: Install**

```bash
npm install
```

Expected: no errors.

- [ ] **Step 4: Verify packages are installed**

```bash
ls node_modules/better-auth node_modules/@aws-sdk/client-s3 node_modules/kysely node_modules/pg 2>&1 | head -10
```

Expected: all 4 directories exist.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add better-auth, Kysely, pg, AWS SDK"
```

---

### Task 0.8: Verify the merged build

**Files:** none (verification only)

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: exit code 0. If errors appear, fix inline (likely from feat/better-auth's `src/lib/admin-permissions.ts` rewrite).

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit code 0.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git diff --cached --quiet || git commit -m "fix(build): address merge issues in selfhost/migrate branch"
```

---

## Phase A — Database schema capture and apply

### Task A.1: Set up local Postgres via Docker

**Files:** none (docker only)

- [ ] **Step 1: Create local `.env` from `.env.example`**

```bash
cp .env.example .env
```

- [ ] **Step 2: Generate strong passwords and write to `.env`**

```bash
POSTGRES_PW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
MINIO_PW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)
BETTER_AUTH_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 48)
sed -i "s|change-me-strong-password|$POSTGRES_PW|g" .env
sed -i "s|change-me-minio-root|$MINIO_PW|g" .env
echo "POSTGREST_JWT_SECRET=$JWT_SECRET" >> .env
echo "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" >> .env
```

- [ ] **Step 3: Verify `.env` is updated**

```bash
grep -E "^POSTGRES_PASSWORD|^MINIO_ROOT_PASSWORD|^POSTGREST_JWT_SECRET|^BETTER_AUTH_SECRET" .env
```

Expected: 4 non-empty lines, no `change-me-...` placeholders.

- [ ] **Step 4: Start the db container**

```bash
docker compose up -d db
```

Expected: `Container route_commerce_db ... Started`.

- [ ] **Step 5: Wait for Postgres**

```bash
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U routecommerce -d route_commerce > /dev/null 2>&1; then
    echo "Postgres is ready"
    break
  fi
  sleep 2
done
```

Expected: `Postgres is ready` within 60 seconds.

- [ ] **Step 6: Verify connectivity**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT version();"
```

Expected: `PostgreSQL 16.x ...`.

- [ ] **Step 7: Do NOT commit `.env`** (gitignored).

---

### Task A.2: Capture schema + data from live Supabase

**Files:**
- Create: `supabase/captured_schema.sql` (committed to repo)
- Create: `supabase/captured_data.sql` (committed to repo)

**NOTE:** This step runs on the user's Mac (direct PG blocked from this dev box per MEMORY.md).

- [ ] **Step 1: Get the Supabase DB password**

Ask the user for the Supabase DB password (it should be in `.env.local` as `SUPABASE_DB_PASSWORD` or `SUPABASE_SERVICE_ROLE_KEY`).

- [ ] **Step 2: Run pg_dump with retry (per spec's error handling)**

```bash
SUPABASE_PW="<password from user>"
run_pg_dump_schema() {
  pg_dump "postgresql://postgres:${SUPABASE_PW}@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres" \
    --schema-only --no-owner --no-privileges \
    --schema=public \
    -f /tmp/captured_schema.sql
}
run_pg_dump_data() {
  pg_dump "postgresql://postgres:${SUPABASE_PW}@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres" \
    --data-only --no-owner --no-privileges \
    --schema=public \
    -f /tmp/captured_data.sql
}

if ! run_pg_dump_schema; then
  echo "First schema dump failed; retrying once..."
  sleep 5
  if ! run_pg_dump_schema; then
    echo "Schema dump failed twice; aborting. Do NOT proceed with a partial dump."
    exit 1
  fi
fi

if ! run_pg_dump_data; then
  echo "First data dump failed; retrying once..."
  sleep 5
  if ! run_pg_dump_data; then
    echo "Data dump failed twice; aborting."
    exit 1
  fi
fi
```

Expected: two files created, ~5-20MB schema + variable data.

- [ ] **Step 3: Verify the dumps are non-trivial**

```bash
wc -l /tmp/captured_schema.sql /tmp/captured_data.sql
```

Expected: thousands of lines each.

- [ ] **Step 4: Copy the dumps into the repo**

```bash
cp /tmp/captured_schema.sql supabase/captured_schema.sql
cp /tmp/captured_data.sql supabase/captured_data.sql
ls -la supabase/captured_*.sql
```

Expected: both files exist, > 1MB.

- [ ] **Step 5: Sanity-check the schema dump**

```bash
grep -c "CREATE TABLE" supabase/captured_schema.sql
grep -c "CREATE FUNCTION" supabase/captured_schema.sql
```

Expected: many `CREATE TABLE` (~60) and `CREATE FUNCTION` (~185) statements.

- [ ] **Step 6: Commit the dumps**

```bash
git add supabase/captured_schema.sql supabase/captured_data.sql
git commit -m "chore(supabase): capture schema + data dump from live Supabase"
```

---

### Task A.3: Apply the preflight migration

**Files:** none (uses `000_preflight_supabase_compat.sql` already in repo)

- [ ] **Step 1: Apply 000_preflight_supabase_compat.sql**

```bash
docker compose cp supabase/migrations/000_preflight_supabase_compat.sql db:/tmp/000_preflight.sql
docker compose exec -T db psql -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -f /tmp/000_preflight.sql
```

Expected: no errors; `CREATE EXTENSION`, `CREATE ROLE`, `CREATE SCHEMA`, `CREATE OR REPLACE FUNCTION auth.uid()` succeed.

- [ ] **Step 2: Verify the preflight created the expected objects**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "\dn"
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role');"
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT proname FROM pg_proc WHERE pronamespace = 'auth'::regnamespace;"
```

Expected: `auth` schema exists; 3 roles exist; `uid()`, `role()`, `email()` functions exist.

- [ ] **Step 3: Verify routecommerce can act as the stub roles**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SET ROLE anon; SELECT current_user; RESET ROLE;"
```

Expected: `current_user` reports `anon`; `RESET ROLE` works.

---

### Task A.4: Apply the captured schema to local Postgres

**Files:** none

- [ ] **Step 1: Apply the captured schema**

```bash
docker compose cp supabase/captured_schema.sql db:/tmp/captured_schema.sql
docker compose exec -T db psql -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -f /tmp/captured_schema.sql 2>&1 | tee /tmp/captured_schema_apply.log
```

Expected: many `CREATE TABLE`, `CREATE FUNCTION` messages. Some may fail (e.g., `auth.uid()` redefinition — preflight stub gets replaced by the real Supabase body). That's OK if no critical errors block table creation.

- [ ] **Step 2: Re-apply the preflight to restore the stub auth.uid()**

```bash
docker compose cp supabase/migrations/000_preflight_supabase_compat.sql db:/tmp/000_preflight.sql
docker compose exec -T db psql -U routecommerce -d route_commerce -v ON_ERROR_STOP=1 -f /tmp/000_preflight.sql
```

Expected: `CREATE OR REPLACE FUNCTION` succeeds.

- [ ] **Step 3: Verify tables exist**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "\dt" | wc -l
```

Expected: > 60 (60+ tables in public).

- [ ] **Step 4: Verify SECURITY DEFINER functions exist**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) FROM pg_proc WHERE prosecdef = true;"
```

Expected: ~185.

---

### Task A.5: Patch the 3 broken migrations

**Files:**
- Modify: `supabase/migrations/006_water_log_rpcs_fixed.sql`
- Modify: `supabase/migrations/099_harvest_reach_segmentation.sql`
- Modify: `supabase/migrations/135_email_automation_rpcs.sql`

- [ ] **Step 1: Patch 006 — replace `STATIC` with `STABLE`**

```bash
sed -i 's/\bSTATIC\b/STABLE/g' supabase/migrations/006_water_log_rpcs_fixed.sql
grep -c "STABLE" supabase/migrations/006_water_log_rpcs_fixed.sql
```

Expected: 6+ occurrences of `STABLE`.

- [ ] **Step 2: Patch 099 — quote the `time` column references**

```bash
grep -n "time" supabase/migrations/099_harvest_reach_segmentation.sql
```

In the file, find references to the `time` column (a reserved word). Use `search_replace` to wrap in double quotes, matching the pattern from the existing 148 patch:

```sql
RETURNS TABLE ( ..., "time" TEXT, ... )
...
s."time",
```

- [ ] **Step 3: Patch 135 — add a default to `p_next_email_at` in `enroll_abandoned_cart`**

```bash
grep -n "enroll_abandoned_cart" supabase/migrations/135_email_automation_rpcs.sql
```

Find the function signature. Add a default value to the `p_next_email_at` parameter:

```sql
CREATE OR REPLACE FUNCTION public.enroll_abandoned_cart(
  p_brand_id UUID,
  p_cart_id UUID,
  p_next_email_at TIMESTAMPTZ DEFAULT now() + interval '1 hour'
)
RETURNS ...
```

(If the function doesn't have `p_next_email_at`, find the actual signature and apply a similar fix.)

- [ ] **Step 4: Commit the patches**

```bash
git add supabase/migrations/006_water_log_rpcs_fixed.sql \
        supabase/migrations/099_harvest_reach_segmentation.sql \
        supabase/migrations/135_email_automation_rpcs.sql
git commit -m "fix(migrations): patch 3 broken migrations (006, 099, 135)"
```

---

### Task A.6: Apply all 137 migrations

**Files:**
- Create: `scripts/apply-migrations.sh` (committed)

- [ ] **Step 1: Create the migration apply script**

Create `scripts/apply-migrations.sh`:

```bash
#!/usr/bin/env bash
set -u
CONTAINER=route_commerce_db
DB=route_commerce
USER=routecommerce
LOG=/tmp/migration_apply.log
> $LOG

for f in supabase/migrations/[0-9]*.sql; do
  echo "Applying $f ..." | tee -a $LOG
  docker compose cp "$f" "$CONTAINER:/tmp/$(basename $f)"
  if docker compose exec -T "$CONTAINER" psql -U "$USER" -d "$DB" -v ON_ERROR_STOP=0 -q -f "/tmp/$(basename $f)" >> $LOG 2>&1; then
    echo "  OK" | tee -a $LOG
  else
    echo "  FAIL (continuing)" | tee -a $LOG
  fi
done

echo "--- summary ---"
echo "Failures:"
grep -B1 "FAIL" $LOG | head -40
```

Make it executable:

```bash
chmod +x scripts/apply-migrations.sh
```

- [ ] **Step 2: Run the migration apply**

```bash
./scripts/apply-migrations.sh 2>&1 | tail -40
```

Expected: most migrations apply; some may fail (captured in log). The 3 patched ones (006, 099, 135) should succeed.

- [ ] **Step 3: Verify which migrations failed**

```bash
grep -B1 "FAIL" /tmp/migration_apply.log
```

Expected: a small list. If anything critical failed (e.g., `200_better_auth_tables.sql`), investigate.

- [ ] **Step 4: Verify the better-auth tables exist**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "\dt" | grep -E '"user"|"session"|"account"|"verification"'
```

Expected: 4 tables.

- [ ] **Step 5: Commit the apply script**

```bash
git add scripts/apply-migrations.sh
git commit -m "chore(scripts): add apply-migrations.sh for local Postgres"
```

---

### Task A.7: Apply the data dump

**Files:** none (uses `supabase/captured_data.sql` from Task A.2)

- [ ] **Step 1: Apply the data dump**

```bash
docker compose cp supabase/captured_data.sql db:/tmp/captured_data.sql
docker compose exec -T db psql -U routecommerce -d route_commerce -v ON_ERROR_STOP=0 -f /tmp/captured_data.sql 2>&1 | tail -20
```

Expected: many `INSERT` statements. Some may fail (e.g., foreign key violations if migration order differs) — document in log.

- [ ] **Step 2: Verify data fidelity (spot check)**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) FROM brands;"
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) FROM products;"
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) FROM orders;"
```

Expected: counts > 0 (or 0 if the corresponding table is empty).

---

### Task A.8: Disable RLS on all public tables

**Files:** none (SQL only)

- [ ] **Step 1: Apply the RLS disable block**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -v ON_ERROR_STOP=0 <<'SQL'
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;
SQL
```

Expected: no errors; runs in a few seconds.

- [ ] **Step 2: Verify RLS is disabled**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
```

Expected: 0 rows.

---

## Phase B — MinIO setup and asset migration

### Task B.1: Start MinIO and verify buckets

**Files:** none

- [ ] **Step 1: Start MinIO + minio_init**

```bash
docker compose up -d minio minio_init
```

Expected: both containers start.

- [ ] **Step 2: Wait for the init container to finish**

```bash
docker compose wait minio_init
docker compose logs minio_init | tail -10
```

Expected: `MinIO buckets initialized` in logs.

- [ ] **Step 3: Verify all 5 buckets exist**

```bash
docker compose exec -T minio mc alias set local http://localhost:9000 routecommerce "$MINIO_ROOT_PASSWORD"
docker compose exec -T minio mc ls local/
```

Expected: 5 buckets: `brand-logos/`, `contacts-imports/`, `product-images/`, `videos/`, `water-photos/`.

- [ ] **Step 4: Verify a bucket is publicly readable**

```bash
docker compose exec -T minio mc anonymous get local/brand-logos
```

Expected: `download`.

- [ ] **Step 5: Verify MinIO is accessible from the host**

```bash
curl -I http://127.0.0.1:9000/minio/health/live
```

Expected: `HTTP/1.1 200 OK`.

---

### Task B.2: Copy existing brand assets from Supabase Storage to MinIO

**Files:** none

- [ ] **Step 1: Find the Tuxedo hero video URL**

```bash
grep -A2 "videos" src/components/storefront/TuxedoVideoHero.tsx | head -20
```

The URL looks like:
```
https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/videos/<filename>
```

- [ ] **Step 2: Download the Tuxedo hero video**

```bash
mkdir -p /tmp/minio-migration/videos
curl -o /tmp/minio-migration/videos/<filename> "<URL from Step 1>"
ls -la /tmp/minio-migration/videos/
```

Expected: file downloaded, > 0 bytes.

- [ ] **Step 3: Find the brand logo URLs in `email-service.ts`**

```bash
grep -A1 "brand-logos" src/lib/email-service.ts | head -20
```

Four hardcoded URLs are expected.

- [ ] **Step 4: Download the logos**

```bash
mkdir -p /tmp/minio-migration/brand-logos/<brand_id>
for url in "<url1>" "<url2>" "<url3>" "<url4>"; do
  fname=$(basename "$url")
  curl -o "/tmp/minio-migration/brand-logos/<brand_id>/$fname" "$url"
done
ls -la /tmp/minio-migration/brand-logos/<brand_id>/
```

Expected: 4 files downloaded.

- [ ] **Step 5: Find any other hardcoded Supabase storage URLs**

```bash
grep -rE "wnzkhezyhnfzhkhiflrp\.supabase\.co/storage/v1/object/public" src/ --include="*.ts" --include="*.tsx" | head -20
```

Download any URLs found to `/tmp/minio-migration/misc/`.

- [ ] **Step 6: Upload the videos to MinIO**

```bash
docker compose cp /tmp/minio-migration/videos minio:/tmp/videos
docker compose exec -T minio mc cp --recursive /tmp/videos/ local/videos/
docker compose exec -T minio mc ls local/videos/
```

Expected: video file(s) listed.

- [ ] **Step 7: Upload the brand logos to MinIO**

```bash
docker compose cp /tmp/minio-migration/brand-logos minio:/tmp/brand-logos
docker compose exec -T minio mc cp --recursive /tmp/brand-logos/ local/brand-logos/
docker compose exec -T minio mc ls local/brand-logos/ --recursive
```

Expected: logo files listed.

- [ ] **Step 8: Verify the assets are publicly accessible**

```bash
curl -I http://127.0.0.1:9000/videos/<filename>
curl -I http://127.0.0.1:9000/brand-logos/<brand_id>/<logo_filename>
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 9: Clean up**

```bash
rm -rf /tmp/minio-migration
```

---

## Phase C — PostgREST + end-to-end local verification

### Task C.1: Start PostgREST and verify

**Files:** none

- [ ] **Step 1: Start the PostgREST service**

```bash
docker compose up -d postgrest
```

Expected: `Container route_commerce_postgrest ... Started`.

- [ ] **Step 2: Wait for PostgREST healthcheck**

```bash
for i in $(seq 1 15); do
  if curl -sf http://127.0.0.1:3001/ > /dev/null 2>&1; then
    echo "PostgREST is up"
    break
  fi
  sleep 2
done
```

Expected: `PostgREST is up` within 30 seconds.

- [ ] **Step 3: Smoke test: list brands**

```bash
curl -s "http://127.0.0.1:3001/brands?limit=1" -H "apikey: local-anon" | head -c 500
```

Expected: a JSON array.

- [ ] **Step 4: Smoke test: call a SECURITY DEFINER RPC**

```bash
curl -s -X POST "http://127.0.0.1:3001/rpc/get_public_stops_for_brand" \
  -H "Content-Type: application/json" \
  -H "apikey: local-anon" \
  -d '{"p_slug":"indian-river-direct"}' | head -c 500
```

Expected: a JSON array (or `[]` if no data yet).

- [ ] **Step 5: Check the PostgREST logs for errors**

```bash
docker compose logs postgrest --tail=30
```

Expected: no critical errors.

---

### Task C.2: Set up local env and verify app build

**Files:**
- Create: `.env.local` (gitignored)

- [ ] **Step 1: Create `.env.local`**

```bash
PG_PW=$(grep "^POSTGRES_PASSWORD=" .env | cut -d= -f2-)
BA_S=$(grep "^BETTER_AUTH_SECRET=" .env | cut -d= -f2-)
MINIO_PW=$(grep "^MINIO_ROOT_PASSWORD=" .env | cut -d= -f2-)
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon
DATABASE_URL=postgresql://routecommerce:${PG_PW}@127.0.0.1:5432/route_commerce?schema=public
BETTER_AUTH_SECRET=${BA_S}
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_BASE_URL=http://localhost:9000
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=routecommerce
STORAGE_SECRET_KEY=${MINIO_PW}
STORAGE_BUCKET_PREFIX=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
EOF
```

- [ ] **Step 2: Verify `.env.local` contents**

```bash
cat .env.local
```

Expected: all values populated, no `<...>` placeholders.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Fix any errors**

Common issues:
- Missing `pg` types → `npm install --save-dev @types/pg`
- better-auth import errors → `ls node_modules/better-auth`
- PostgREST call returning errors → check Task A.6 verification

---

### Task C.3: Verify mock mode still works

**Files:** none

- [ ] **Step 1: Start the dev server with mock mode**

```bash
NEXT_PUBLIC_USE_MOCK_DATA=true npm run dev
```

Expected: dev server starts on `http://localhost:3000`.

- [ ] **Step 2: Visit the homepage**

Open `http://localhost:3000` in a browser. Expected: page loads.

- [ ] **Step 3: Set the dev session cookie**

In the browser dev tools, set a cookie:
```
Name: dev_session
Value: platform_admin
Domain: localhost
Path: /
```

- [ ] **Step 4: Reload `/admin`**

Expected: admin dashboard loads with mock data.

- [ ] **Step 5: Stop the dev server**

```bash
# Ctrl+C in the terminal
```

---

### Task C.4: Verify dev mode bypass works against local Postgres

**Files:** none

- [ ] **Step 1: Start the dev server with the real DB**

```bash
unset NEXT_PUBLIC_USE_MOCK_DATA
npm run dev
```

- [ ] **Step 2: Set the dev session cookie**

Same as Task C.3 Step 3: `dev_session=platform_admin`.

- [ ] **Step 3: Visit /admin**

Expected: admin dashboard loads with real data from local Postgres.

- [ ] **Step 4: Verify a known data point**

Visit `/admin/brands` and confirm a known brand is listed.

- [ ] **Step 5: Stop the dev server**

```bash
# Ctrl+C
```

---

### Task C.5: Verify auth round-trip with better-auth

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Sign up via better-auth API**

```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123","name":"Test User"}'
```

Expected: 200 with a user object (or 400 if signup is disabled — adjust per the better-auth config).

- [ ] **Step 3: Sign in**

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

Expected: 200; `/tmp/cookies.txt` contains `rc_session_token`.

- [ ] **Step 4: Use the session to call a protected endpoint**

```bash
curl -X GET http://localhost:3000/admin \
  -b /tmp/cookies.txt \
  -o /dev/null -w "%{http_code}\n"
```

Expected: 200 (or 307 redirect).

- [ ] **Step 5: Verify the user was created**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT id, email, name FROM \"user\";"
```

Expected: row with `email = 'test@example.com'`.

- [ ] **Step 6: Clean up**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "DELETE FROM \"user\" WHERE email = 'test@example.com';"
```

---

### Task C.6: Verify storage round-trip with MinIO

**Files:** none

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Sign in as a platform admin**

Set `dev_session=platform_admin` cookie in the browser.

- [ ] **Step 3: Upload a product image**

Go to `/admin/products`. Edit a product. Upload a new product image (JPG/PNG).

- [ ] **Step 4: Verify the image is in MinIO**

```bash
docker compose exec -T minio mc ls local/product-images/ --recursive | head -10
```

Expected: the uploaded image appears.

- [ ] **Step 5: Verify the image is publicly accessible**

```bash
IMG_KEY=$(docker compose exec -T minio mc ls local/product-images/ --recursive | head -1 | awk '{print $NF}')
curl -I "http://127.0.0.1:9000/product-images/$IMG_KEY"
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 6: Verify the image renders on the storefront**

Visit `/tuxedo/products/<product-slug>` (or `/indian-river-direct/products/<product-slug>`). The image should display.

---

## Phase D — Production cutover

### Task D.1: Set up prod server with Docker stack

**Files:** none (server admin)

- [ ] **Step 1: SSH to the prod server**

```bash
ssh tyler@route.crispygoat.com
```

- [ ] **Step 2: Pull the latest code on `main`**

```bash
cd /home/tyler/route-commerce
git pull origin main
```

Expected: latest `selfhost/migrate` branch commits (merge `selfhost/migrate` to `main` first if your flow requires it).

- [ ] **Step 3: Verify Docker is installed**

```bash
docker --version
docker compose version
```

Expected: `Docker version 24.x` and `Docker Compose version v2.x` (or `docker-compose version 1.x`).

- [ ] **Step 4: Verify Gitea secrets are set**

In `https://git.crispygoat.com/tyler/route-commerce/settings/secrets`, verify:

- `POSTGRES_USER` = `routecommerce`
- `POSTGRES_PASSWORD` = (32+ char random)
- `POSTGRES_DB` = `route_commerce`
- `MINIO_ROOT_USER` = `routecommerce`
- `MINIO_ROOT_PASSWORD` = (32+ char random)
- `POSTGREST_JWT_SECRET` = (48+ char random)
- `DATABASE_URL` = `postgresql://routecommerce:<pw>@db:5432/route_commerce?schema=public`
- `BETTER_AUTH_SECRET` = (48+ char random)
- `BETTER_AUTH_URL` = `https://route.crispygoat.com`
- `NEXT_PUBLIC_BETTER_AUTH_URL` = `https://route.crispygoat.com`
- `STORAGE_ENDPOINT` = `http://minio:9000`
- `STORAGE_REGION` = `us-east-1`
- `STORAGE_ACCESS_KEY` = `routecommerce`
- `STORAGE_SECRET_KEY` = (same as `MINIO_ROOT_PASSWORD`)
- `STORAGE_BUCKET_PREFIX` = (empty)
- `NEXT_PUBLIC_STORAGE_BASE_URL` = `https://route.crispygoat.com/storage` (or your reverse proxy URL)
- `PGRST_SERVER_PORT` = `3001`
- `PGRST_DB_URI` = `postgresql://routecommerce:<pw>@db:5432/route_commerce`
- `PGRST_DB_ANON_ROLE` = `anon`
- `NEXT_PUBLIC_SUPABASE_URL` = `http://postgrest:3001`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (any string)
- `STRIPE_SECRET_KEY` = (existing)
- `RESEND_API_KEY` = (existing)
- `MINIMAX_API_KEY` = (existing)
- `MINIMAX_BASE_URL` = (existing)

- [ ] **Step 5: Push to trigger the Gitea workflow**

From the dev box:

```bash
git push crispygoat selfhost/migrate:main
```

(Or merge `selfhost/migrate` to `main` first, then push `main`.)

- [ ] **Step 6: Watch the Gitea Actions run**

Open `https://git.crispygoat.com/tyler/route-commerce/actions`. Expected: `Start Docker stack` succeeds, `Apply migrations` runs through 137 migrations, `Deploy` restarts the app.

---

### Task D.2: Verify prod is working

**Files:** none

- [ ] **Step 1: Visit the homepage**

Open `https://route.crispygoat.com`. Expected: page loads.

- [ ] **Step 2: Visit a brand storefront**

Open `https://route.crispygoat.com/tuxedo` and `https://route.crispygoat.com/indian-river-direct`. Expected: pages load, brand logos display from MinIO.

- [ ] **Step 3: Sign in to the admin**

Open `https://route.crispygoat.com/login` and sign in with a known admin account.

- [ ] **Step 4: Verify data is present**

Navigate `/admin/orders`, `/admin/products`, `/admin/stops`, `/admin/communications`. Verify data is from the dump (or fresh if no dump was applied).

- [ ] **Step 5: Upload a new product image**

In `/admin/products`, upload a new image. Verify it lands in MinIO and renders on the storefront.

- [ ] **Step 6: Check prod logs for errors**

```bash
ssh tyler@route.crispygoat.com
pm2 logs route-commerce --lines 100
docker compose logs db postgrest minio --tail=30
```

Expected: no critical errors.

---

### Task D.3: 24h monitoring

**Files:** none

- [ ] **Step 1: Monitor for 24 hours**

Watch for:
- Error rates in the Next.js app
- Postgres connection issues
- MinIO disk usage
- PostgREST 5xx responses

- [ ] **Step 2: Roll back if critical issues appear**

If anything goes wrong:
1. `git revert` the merge commit on `main`.
2. `pm2 restart route-commerce`.
3. Investigate before re-attempting.

- [ ] **Step 3: After 24h of stable operation, deactivate Supabase**

In the Supabase dashboard:
1. Pause the project (or delete, if certain).
2. Cancel any active subscriptions.
3. Note the deactivation date in `MEMORY.md`.

- [ ] **Step 4: Document the cutover in MEMORY.md**

Append to `MEMORY.md`:

```markdown
## Self-Hosted Cutover (YYYY-MM-DD)

- Migrated from Supabase to self-hosted Postgres + PostgREST + MinIO + better-auth.
- Branch: `selfhost/migrate` (merged to `main`).
- Schema dump: `supabase/captured_schema.sql` (commit <hash>).
- Data dump: `supabase/captured_data.sql` (commit <hash>) — or "no data dump, fresh start" if not applied.
- 24h monitoring: passed.
- Supabase project: paused/deleted on YYYY-MM-DD.
```

- [ ] **Step 5: Final commit**

```bash
git add MEMORY.md
git commit -m "docs(memory): record self-hosted cutover"
```

---

## Phase E — Final verification (after cutover)

### Task E.1: Run Playwright E2E tests (if available)

**Files:**
- Modify: `playwright.config.ts` (if needed for env)

- [ ] **Step 1: Check if Playwright tests exist**

```bash
ls tests/ 2>&1 | head -10
cat playwright.config.ts | head -40
```

- [ ] **Step 2: Update `playwright.config.ts` to use the local env (if needed)**

```ts
webServer: {
  command: 'npm run dev',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:3001',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-anon',
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_STORAGE_BASE_URL: 'http://localhost:9000',
    STORAGE_ENDPOINT: 'http://127.0.0.1:9000',
    STORAGE_ACCESS_KEY: 'routecommerce',
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
  },
  url: 'http://localhost:3000',
  timeout: 120_000,
},
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install --with-deps chromium
```

- [ ] **Step 4: Run the tests**

```bash
npx playwright test
```

Expected: tests pass (or skip if no tests exist). If tests fail, document the failures but don't block the migration.

- [ ] **Step 5: Note the result**

```bash
echo "Playwright result: $(date)" >> docs/superpowers/migration-e2e-result.log
echo "Pass/Fail: <result>" >> docs/superpowers/migration-e2e-result.log
```

---

### Task E.2: Final cross-check against spec's acceptance criteria

**Files:** none

- [ ] **Step 1: Verify the spec's acceptance criteria**

```bash
git rev-parse --abbrev-ref HEAD
npx tsc --noEmit && echo "TSC OK" && npm run build && echo "BUILD OK"
```

Expected: `selfhost/migrate`, `TSC OK`, `BUILD OK`.

- [ ] **Step 2: Check all 3 patched migrations applied**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "\df" | grep -E "verify_water_pin|enroll_abandoned_cart" | head -5
```

Expected: function names from 006 and 135 visible.

- [ ] **Step 3: Check supabase-js works against PostgREST**

```bash
curl -s "http://127.0.0.1:3001/brands?limit=1" -H "apikey: local-anon"
```

Expected: 200 with JSON array.

- [ ] **Step 4: Check better-auth tables exist**

```bash
docker compose exec -T db psql -U routecommerce -d route_commerce -c "SELECT count(*) AS user_count FROM \"user\";"
```

Expected: a count.

- [ ] **Step 5: Check MinIO buckets exist and are public**

```bash
docker compose exec -T minio mc ls local/ | wc -l
```

Expected: 5.

- [ ] **Step 6: Check env vars don't reference Supabase (except the legacy vars)**

```bash
grep -rE "wnzkhezyhnfzhkhiflrp\.supabase\.co" src/ --include="*.ts" --include="*.tsx" | head -10
```

Expected: only references in the old Supabase storage URLs (already migrated to MinIO). If any non-storage references remain, fix them.

- [ ] **Step 7: Note the result in the spec**

Add a status note to the spec's "Acceptance Criteria" section in `docs/superpowers/specs/2026-06-05-selfhost-migration-design.md` and commit.

---

## Out of scope (deferred to follow-up plans)

- Migrating user passwords from `auth.users` to `user.password` (better-auth). Users will need to reset passwords.
- Performance tuning (indexes, connection pooling, query optimization).
- Replacing `supabase-js` (still used for PostgREST RPC calls; works fine).
- Setting up a Caddy reverse proxy in front of MinIO (deferred; current setup exposes MinIO on port 9000 directly).
- Self-hosted email/SMS sending (Resend + Twilio still used as third-party services).
- Backup/restore strategy for the new Postgres (currently relies on Docker volume; consider adding `pg_dump` cron).
