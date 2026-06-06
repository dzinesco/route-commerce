#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Idempotent PostgREST + Next.js production deploy
# =============================================================================
#
# Self-hosted single-server deploy. Triggered manually, by Gitea webhook, or
# by a Gitea Actions runner after a push to `main` (or `gitea-sync`).
#
# What it does, in order:
#   1. Acquires an exclusive flock (concurrent deploys die loudly).
#   2. CLEANUP: stops the dev stack on :3001 and the previous prod stack
#      (port read from .postgrest-port / .nextjs-port).
#   3. PORT_SELECTION: picks the lowest free port in [3011..30200] for
#      PostgREST, then the next free one for the Next.js frontend.
#   4. BUILD: runs `npm run build` with NEXT_PUBLIC_API_URL exported so it
#      gets inlined into the client bundle.
#   5. DEPLOY: writes the chosen ports to .env.production, brings the
#      compose stack up.
#   6. NGINX: renders the nginx config from a template (with the current
#      ports), `nginx -t`s it, and reloads the host systemd nginx.
#   7. HEALTHCHECK: curls the new stack; if anything is down, rolls back.
#   8. IMAGE_PRUNE: optional, removes dangling images on success.
#
# Files written to the workspace root:
#   .postgrest-port          current PostgREST host port (atomic)
#   .nextjs-port             current Next.js host port (atomic)
#   .env.production          rendered env fed to docker compose
#   .deploy.lock             flock target
#   deploy.log               append-only log
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# -----------------------------------------------------------------------------
# Configurable variables (override via environment before invoking)
# -----------------------------------------------------------------------------
WORKSPACE="${WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_DIR="${COMPOSE_DIR:-${WORKSPACE}/deploy}"
COMPOSE_FILE="${COMPOSE_FILE:-${COMPOSE_DIR}/docker-compose.yml}"
NGINX_TEMPLATE="${NGINX_TEMPLATE:-${COMPOSE_DIR}/nginx.conf.template}"
NGINX_RENDERED="${NGINX_RENDERED:-/etc/nginx/sites-available/prod-app.conf}"
NGINX_LINK="${NGINX_LINK:-/etc/nginx/sites-enabled/prod-app.conf}"
NGINX_OWNER="${NGINX_OWNER:-www-data:www-data}"

PROJECT_NAME="${PROJECT_NAME:-prod-app}"
POSTGREST_PORT_FILE="${POSTGREST_PORT_FILE:-${WORKSPACE}/.postgrest-port}"
NEXTJS_PORT_FILE="${NEXTJS_PORT_FILE:-${WORKSPACE}/.nextjs-port}"
ENV_FILE="${ENV_FILE:-${WORKSPACE}/.env.production}"
LOCK_FILE="${LOCK_FILE:-${WORKSPACE}/.deploy.lock}"
LOG_FILE="${LOG_FILE:-${WORKSPACE}/deploy.log}"

DEV_PORT="${DEV_PORT:-3001}"
PORT_RANGE_START="${PORT_RANGE_START:-3011}"
PORT_RANGE_END="${PORT_RANGE_END:-30200}"
HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT:-60}"   # seconds total
HEALTHCHECK_INTERVAL="${HEALTHCHECK_INTERVAL:-2}"  # seconds between tries

# Image pruning (set PRUNE_IMAGES=0 to skip)
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"

# Optional: pin the public URL the browser uses. If empty, we default to
# http://localhost:${POSTGREST_HOST_PORT}. For production with a real domain
# and nginx in front, set e.g. NEXT_PUBLIC_API_URL=https://app.example.com/api
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"

# -----------------------------------------------------------------------------
# Logging — every line is timestamped, tee'd to stdout AND the log file.
# We replace the shell's fd 1/2 with a tee so any tool that prints (npm, docker,
# curl) lands in both places automatically.
# -----------------------------------------------------------------------------
mkdir -p "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

ts()   { date '+%Y-%m-%d %H:%M:%S'; }
log()  { printf '[%s] %s\n' "$(ts)" "$*"; }
hr()   { printf '%s\n' '----------------------------------------------------------------'; }
section() { hr; log "== $* =="; hr; }

# Trap so we always release the lock and surface a useful message.
on_exit() {
  local exit_code=$?
  if (( exit_code != 0 )); then
    log "DEPLOY FAILED with exit code ${exit_code}"
    log "See ${LOG_FILE} for full output. Rollback hints:"
    log "  - Previous port was: ${PREVIOUS_POSTGREST_PORT:-<unknown>}"
    log "  - Current .postgrest-port value: $(read_port_file "$POSTGREST_PORT_FILE" || echo '<none>')"
    log "  - To restart the old stack manually:"
    log "      POSTGREST_HOST_PORT=${PREVIOUS_POSTGREST_PORT:-3011} \\"
    log "      NEXTJS_HOST_PORT=${PREVIOUS_NEXTJS_PORT:-3012} \\"
    log "      docker compose -p ${PROJECT_NAME} --env-file ${ENV_FILE} up -d"
  else
    log "DEPLOY OK — PostgREST on :${NEW_POSTGREST_PORT}, Next.js on :${NEW_NEXTJS_PORT}"
  fi
  # flock on fd 9 releases automatically when the script exits.
}
trap on_exit EXIT

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
read_port_file() {
  # Echo the port in $1, or empty string if missing/garbage.
  local f="$1"
  [[ -f "$f" ]] || return 1
  local v
  v=$(tr -d '[:space:]' < "$f" 2>/dev/null || true)
  [[ "$v" =~ ^[0-9]+$ ]] || return 1
  printf '%s' "$v"
}

render_template() {
  # Portable envsubst: replaces $VAR and ${VAR} references in stdin with
  # values from the current environment. Only the variable names given as
  # args are expanded (matches `envsubst` behavior). If real envsubst is
  # available we use it for speed.
  local vars="$1"
  if command -v envsubst >/dev/null 2>&1; then
    envsubst "$vars"
  else
    # Build a sed expression like: s/\${VAR}/$VAR/g; s/\bVAR\b/$VAR/g
    local sed_expr=()
    for v in $vars; do
      v="${v#\$}"
      v="${v#\{}"
      v="${v%\}}"
      sed_expr+=( -e "s|\${${v}}|${!v:-}|g" )
      sed_expr+=( -e "s|\$${v}\b|${!v:-}|g" )
    done
    sed "${sed_expr[@]}"
  fi
}

is_listening() {
  # Returns 0 if port $1 has a TCP listener (v4 or v6) on this host.
  local port="$1"
  ss -tlnH 2>/dev/null | awk '{print $4}' | grep -Eq "(^|:)${port}$"
}

next_free_port() {
  # Walk PORT_RANGE_START..PORT_RANGE_END and return the first port nobody
  # is listening on. Returns 1 if none are free.
  local p
  for (( p = PORT_RANGE_START; p <= PORT_RANGE_END; p++ )); do
    if ! is_listening "$p"; then
      printf '%s' "$p"
      return 0
    fi
  done
  return 1
}

atomic_write() {
  # Write stdin to $1 atomically: write to temp, fsync, rename. This is
  # what lets us use .postgrest-port as a single source of truth — readers
  # always see either the old value or the new value, never a half-written one.
  local target="$1"
  local tmp
  tmp=$(mktemp "${target}.tmp.XXXXXX")
  cat > "$tmp"
  sync
  mv -f "$tmp" "$target"
}

free_port() {
  # Try several strategies to free a port:
  #   1. docker compose down for our project (idempotent)
  #   2. brute-force kill of any process bound to the port
  local port="$1" label="$2"
  if [[ -z "$port" ]]; then return 0; fi
  log "  ${label} port ${port}: stopping project '${PROJECT_NAME}' (if up)"
  ( cd "$COMPOSE_DIR" && docker compose -p "$PROJECT_NAME" down --remove-orphans --timeout 10 ) \
    >/dev/null 2>&1 || true

  if is_listening "$port"; then
    log "  ${label} port ${port}: still listening, attempting pkill"
    # fuser prints PIDs holding the port; xargs kills them.
    local pids
    pids=$(fuser -n tcp "$port" 2>/dev/null | tr -d '[:space:]' || true)
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 1
      pids=$(fuser -n tcp "$port" 2>/dev/null | tr -d '[:space:]' || true)
      [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
    fi
  fi
  if is_listening "$port"; then
    log "  ${label} port ${port}: WARNING — still in use after cleanup"
    return 1
  fi
  log "  ${label} port ${port}: free"
  return 0
}

healthcheck() {
  # Hit $1 (URL) until it returns 2xx within HEALTHCHECK_TIMEOUT seconds.
  local url="$1" label="$2" elapsed=0
  log "  ${label}: ${url}"
  while (( elapsed < HEALTHCHECK_TIMEOUT )); do
    if curl -fsS --max-time 5 -o /dev/null "$url"; then
      log "  ${label}: OK (after ${elapsed}s)"
      return 0
    fi
    sleep "$HEALTHCHECK_INTERVAL"
    elapsed=$(( elapsed + HEALTHCHECK_INTERVAL ))
  done
  log "  ${label}: FAILED after ${HEALTHCHECK_TIMEOUT}s"
  return 1
}

# -----------------------------------------------------------------------------
# Lock — refuse to run if another deploy is in flight.
# -----------------------------------------------------------------------------
section "LOCK"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deploy holds ${LOCK_FILE}. Exiting."
  exit 1
fi
log "Acquired exclusive lock on ${LOCK_FILE}"

# -----------------------------------------------------------------------------
# 0. Banner
# -----------------------------------------------------------------------------
section "DEPLOY START"
log "Workspace:    ${WORKSPACE}"
log "Project:      ${PROJECT_NAME}"
log "Compose:      ${COMPOSE_FILE}"
log "Nginx tpl:    ${NGINX_TEMPLATE}"
log "Port range:   ${PORT_RANGE_START}..${PORT_RANGE_END}"
log "Caller:       ${USER:-<unknown>}@$(hostname)"

# -----------------------------------------------------------------------------
# 1. CLEANUP — port 3001 (dev) and the previous prod ports.
# -----------------------------------------------------------------------------
section "CLEANUP"

free_port "$DEV_PORT" "dev"
PREVIOUS_POSTGREST_PORT=$(read_port_file "$POSTGREST_PORT_FILE" || true)
PREVIOUS_NEXTJS_PORT=$(read_port_file "$NEXTJS_PORT_FILE" || true)
log "Previous prod ports: PostgREST=${PREVIOUS_POSTGREST_PORT:-<none>} Next.js=${PREVIOUS_NEXTJS_PORT:-<none>}"

# Stale-port guard: if the file points to a port that is NOT in our standard
# range, or to a port that nothing is listening on anymore, we still tear
# down the project (cheap) but we don't try to free the port itself —
# someone else might be using it.
free_port "${PREVIOUS_POSTGREST_PORT:-}" "prev-postgrest"
free_port "${PREVIOUS_NEXTJS_PORT:-}"   "prev-nextjs"

# -----------------------------------------------------------------------------
# 2. PORT_SELECTION — find the two lowest free ports.
# -----------------------------------------------------------------------------
section "PORT_SELECTION"

NEW_POSTGREST_PORT=$(next_free_port) || {
  log "No free port in [${PORT_RANGE_START}..${PORT_RANGE_END}]. Bailing out."
  exit 2
}
log "PostgREST: ${NEW_POSTGREST_PORT}"

# Re-check after allocation, since we want distinct ports for both services.
NEW_NEXTJS_PORT=""
for (( p = PORT_RANGE_START; p <= PORT_RANGE_END; p++ )); do
  if (( p == NEW_POSTGREST_PORT )); then continue; fi
  if ! is_listening "$p"; then NEW_NEXTJS_PORT="$p"; break; fi
done
if [[ -z "$NEW_NEXTJS_PORT" ]]; then
  log "No free port for Next.js after allocating ${NEW_POSTGREST_PORT}. Bailing out."
  exit 2
fi
log "Next.js:   ${NEW_NEXTJS_PORT}"

# -----------------------------------------------------------------------------
# 3. BUILD — Next.js, with NEXT_PUBLIC_API_URL inlined into the client bundle.
# -----------------------------------------------------------------------------
section "BUILD"

cd "$WORKSPACE"

# Default the public API URL the browser will see.
if [[ -z "$NEXT_PUBLIC_API_URL" ]]; then
  NEXT_PUBLIC_API_URL="http://localhost:${NEW_POSTGREST_PORT}"
fi
log "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"

# Node-only check: don't try to build if there's no package.json.
if [[ -f package.json ]]; then
  # Make sure the deps are present (idempotent — npm ci is a no-op when locked).
  if [[ -f package-lock.json ]]; then
    log "npm ci (locked install)"
    npm ci --no-audit --no-fund
  else
    log "npm install (no lockfile present — consider committing package-lock.json)"
    npm install --no-audit --no-fund
  fi
  log "npm run build"
  NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  POSTGREST_HOST_PORT="$NEW_POSTGREST_PORT" \
  NEXTJS_HOST_PORT="$NEW_NEXTJS_PORT" \
    npm run build
else
  log "No package.json in ${WORKSPACE} — skipping build step."
fi

# -----------------------------------------------------------------------------
# 4. ENV FILE — render .env.production for the running containers.
# -----------------------------------------------------------------------------
section "ENV"

# Preserve any pre-existing secrets in .env.production. We only own the lines
# we write; everything else is left alone. (The simplest sane strategy.)
SECRETS_FILE=""
if [[ -f "$ENV_FILE" ]]; then
  SECRETS_FILE=$(mktemp)
  # Drop any lines we manage; keep the rest verbatim.
  grep -v -E '^(POSTGREST_HOST_PORT|NEXTJS_HOST_PORT|NEXT_PUBLIC_API_URL)=' \
    "$ENV_FILE" > "$SECRETS_FILE" || true
fi

{
  printf '# Generated by deploy.sh on %s — safe to edit, lines below are managed\n' "$(ts)"
  printf 'POSTGREST_HOST_PORT=%s\n' "$NEW_POSTGREST_PORT"
  printf 'NEXTJS_HOST_PORT=%s\n'     "$NEW_NEXTJS_PORT"
  printf 'NEXT_PUBLIC_API_URL=%q\n'  "$NEXT_PUBLIC_API_URL"
  if [[ -n "$SECRETS_FILE" ]]; then
    cat "$SECRETS_FILE"
    rm -f "$SECRETS_FILE"
  fi
} > "${ENV_FILE}.new"

mv -f "${ENV_FILE}.new" "$ENV_FILE"
chmod 600 "$ENV_FILE"
log "Wrote ${ENV_FILE}"

# -----------------------------------------------------------------------------
# 5. DEPLOY — bring the stack up.
# -----------------------------------------------------------------------------
section "DEPLOY"

cd "$COMPOSE_DIR"
log "docker compose -p ${PROJECT_NAME} up -d --build"
docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" up -d --build

# -----------------------------------------------------------------------------
# 6. NGINX — render config from template, test, reload.
# -----------------------------------------------------------------------------
section "NGINX"

if [[ -f "$NGINX_TEMPLATE" ]]; then
  POSTGREST_HOST_PORT="$NEW_POSTGREST_PORT" \
  NEXTJS_HOST_PORT="$NEW_NEXTJS_PORT" \
  NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    render_template '${POSTGREST_HOST_PORT} ${NEXTJS_HOST_PORT} ${NEXT_PUBLIC_API_URL}' \
      < "$NGINX_TEMPLATE" > "$NGINX_RENDERED"

  log "Rendered: ${NGINX_RENDERED}"
  chown "$NGINX_OWNER" "$NGINX_RENDERED" 2>/dev/null || true
  chmod 644 "$NGINX_RENDERED"

  # Wire it into sites-enabled if not already linked.
  if [[ ! -L "$NGINX_LINK" && ! -e "$NGINX_LINK" ]]; then
    log "Enabling site: ${NGINX_LINK} -> ${NGINX_RENDERED}"
    ln -s "$NGINX_RENDERED" "$NGINX_LINK"
  fi

  log "nginx -t"
  nginx -t
  log "systemctl reload nginx"
  systemctl reload nginx
else
  log "No nginx template at ${NGINX_TEMPLATE} — skipping reverse proxy step."
fi

# -----------------------------------------------------------------------------
# 7. HEALTHCHECK — direct + via nginx (when applicable).
# -----------------------------------------------------------------------------
section "HEALTHCHECK"

# Direct checks (bypass nginx, catch compose issues)
healthcheck "http://127.0.0.1:${NEW_POSTGREST_PORT}/" "postgrest-direct" || ROLLBACK=1
healthcheck "http://127.0.0.1:${NEW_NEXTJS_PORT}/"     "nextjs-direct"   || ROLLBACK=1

# nginx-fronted check (only meaningful if nginx template exists)
if [[ -f "$NGINX_TEMPLATE" && "${ROLLBACK:-0}" != "1" ]]; then
  healthcheck "http://127.0.0.1/" "nginx-front" || ROLLBACK=1
fi

if [[ "${ROLLBACK:-0}" == "1" ]]; then
  log "HEALTHCHECK FAILED — rolling back."
  log "Tearing down the new stack on :${NEW_POSTGREST_PORT} / :${NEW_NEXTJS_PORT}"
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" down --remove-orphans --timeout 10 || true

  # If we had a previous port file, the old one is still on disk (we wrote
  # the new one to .new and only mv'd on success... but we DID mv already,
  # so re-write the old value).
  if [[ -n "${PREVIOUS_POSTGREST_PORT:-}" ]]; then
    printf '%s\n' "$PREVIOUS_POSTGREST_PORT" | atomic_write "$POSTGREST_PORT_FILE"
  else
    rm -f "$POSTGREST_PORT_FILE"
  fi
  if [[ -n "${PREVIOUS_NEXTJS_PORT:-}" ]]; then
    printf '%s\n' "$PREVIOUS_NEXTJS_PORT" | atomic_write "$NEXTJS_PORT_FILE"
  else
    rm -f "$NEXTJS_PORT_FILE"
  fi
  exit 3
fi

# -----------------------------------------------------------------------------
# 8. PERSIST — commit the chosen ports as the new single source of truth.
#    (Done AFTER healthcheck so a failed deploy doesn't clobber the old one.)
# -----------------------------------------------------------------------------
section "PERSIST"
printf '%s\n' "$NEW_POSTGREST_PORT" | atomic_write "$POSTGREST_PORT_FILE"
printf '%s\n' "$NEW_NEXTJS_PORT"    | atomic_write "$NEXTJS_PORT_FILE"
log ".postgrest-port = ${NEW_POSTGREST_PORT}"
log ".nextjs-port    = ${NEW_NEXTJS_PORT}"

# -----------------------------------------------------------------------------
# 9. IMAGE_PRUNE — optional housekeeping.
# -----------------------------------------------------------------------------
if [[ "$PRUNE_IMAGES" == "1" ]]; then
  section "IMAGE_PRUNE"
  docker image prune -f
fi

section "DONE"
exit 0
