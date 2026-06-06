#!/usr/bin/env bash
# =============================================================================
# healthcheck.sh — standalone, callable from cron / monitoring
# =============================================================================
#
# Reads the current prod ports from .postgrest-port / .nextjs-port and curls
# each service. Exit code is the count of failed checks (0 = all healthy).
#
# Usage:
#   ./healthcheck.sh
#   ./healthcheck.sh --nginx      # also check the fronted URL
#   WORKSPACE=/srv/app ./healthcheck.sh
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

WORKSPACE="${WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
POSTGREST_PORT_FILE="${POSTGREST_PORT_FILE:-${WORKSPACE}/.postgrest-port}"
NEXTJS_PORT_FILE="${NEXTJS_PORT_FILE:-${WORKSPACE}/.nextjs-port}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-5}"

failures=0

check() {
  local label="$1" url="$2"
  if curl -fsS --max-time "$TIMEOUT" -o /dev/null "$url"; then
    printf '  [ OK ] %-20s %s\n' "$label" "$url"
  else
    printf '  [FAIL] %-20s %s\n' "$label" "$url"
    failures=$(( failures + 1 ))
  fi
}

pgrest_port=$(tr -d '[:space:]' < "$POSTGREST_PORT_FILE" 2>/dev/null || echo "")
next_port=$(tr -d '[:space:]' < "$NEXTJS_PORT_FILE" 2>/dev/null || echo "")

if [[ -n "$pgrest_port" ]]; then
  check "postgrest" "http://127.0.0.1:${pgrest_port}/"
else
  printf '  [SKIP] postgrest          (no .postgrest-port)\n'
fi

if [[ -n "$next_port" ]]; then
  check "nextjs"    "http://127.0.0.1:${next_port}/"
else
  printf '  [SKIP] nextjs             (no .nextjs-port)\n'
fi

if [[ "${1:-}" == "--nginx" ]]; then
  check "nginx" "http://127.0.0.1/"
fi

exit "$failures"
