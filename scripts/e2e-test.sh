#!/bin/bash
# End-to-end validation test for the local Postgres + PostgREST + MinIO + Next.js stack
# Exit 0 = all green, exit 1 = at least one failure.

set -e
API="http://localhost:3001"
WEB="http://localhost:4000"

pass=0
fail=0
declare -a FAILURES

check() {
  local name="$1" url="$2" expected="${3:-200}" cookies="${4:-}"
  local cmd="curl -s -o /dev/null -w '%{http_code}'"
  if [ -n "$cookies" ]; then cmd="$cmd -b \"$cookies\""; fi
  local code=$(eval "$cmd $url")
  if [ "$code" = "$expected" ]; then
    echo "  PASS  $name ($code)"
    pass=$((pass+1))
  else
    echo "  FAIL  $name expected=$expected got=$code url=$url"
    fail=$((fail+1))
    FAILURES+=("$name")
  fi
}

echo "=== Postgres connection ==="
PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT 'ok';" >/dev/null
echo "  PASS  postgres responds"
pass=$((pass+1))

echo "=== DB integrity ==="
TABLE_COUNT=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
[ "$TABLE_COUNT" -ge 65 ] && echo "  PASS  $TABLE_COUNT public tables (>=65)" && pass=$((pass+1)) || { echo "  FAIL  $TABLE_COUNT tables"; fail=$((fail+1)); }

FN_COUNT=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public';")
[ "$FN_COUNT" -ge 250 ] && echo "  PASS  $FN_COUNT functions (>=250)" && pass=$((pass+1)) || { echo "  FAIL  $FN_COUNT functions"; fail=$((fail+1)); }

BRANDS=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM brands;")
[ "$BRANDS" -ge 2 ] && echo "  PASS  $BRANDS brands" && pass=$((pass+1)) || { echo "  FAIL  $BRANDS brands"; fail=$((fail+1)); }

STOPS=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM stops WHERE active=true AND deleted_at IS NULL;")
[ "$STOPS" -ge 200 ] && echo "  PASS  $STOPS active stops" && pass=$((pass+1)) || { echo "  FAIL  $STOPS stops"; fail=$((fail+1)); }

# No test brands
TEST_BRANDS=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM brands WHERE slug IN ('sunrise-farms','green-valley','orchard-fresh');")
[ "$TEST_BRANDS" = "0" ] && echo "  PASS  no test brands" && pass=$((pass+1)) || { echo "  FAIL  test brands found"; fail=$((fail+1)); }

echo "=== Tuxedo Corn data ==="
PHONE=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT phone FROM brand_settings WHERE brand_id='64294306-5f42-463d-a5e8-2ad6c81a96de';")
[ "$PHONE" = "970-323-6874" ] && echo "  PASS  phone=$PHONE" && pass=$((pass+1)) || { echo "  FAIL  phone=$PHONE (expected 970-323-6874)"; fail=$((fail+1)); }

LOGOS=$(PGPASSWORD=routecommerce_dev_password psql -U routecommerce -h 127.0.0.1 -d route_commerce -tA -c "SELECT count(*) FROM brand_settings WHERE brand_id='64294306-5f42-463d-a5e8-2ad6c81a96de' AND logo_url LIKE '/storage/%';")
[ "$LOGOS" = "1" ] && echo "  PASS  logo_url is /storage/ path" && pass=$((pass+1)) || { echo "  FAIL  logo_url not /storage/"; fail=$((fail+1)); }

echo "=== PostgREST ==="
check "GET /" "$API/"
check "GET /brands" "$API/brands?select=id,name,slug&order=name"
check "GET /brands?slug=eq.tuxedo" "$API/brands?slug=eq.tuxedo&select=*"
check "GET /stops" "$API/stops?select=id,city&limit=5"
check "GET /products" "$API/products?select=id,name&limit=5"
check "POST rpc get_brand_settings_by_slug" "$API/rpc/get_brand_settings_by_slug" 200 \
  "-X POST -H Content-Type:application/json -d {\"p_brand_slug\":\"tuxedo\"}"
check "POST rpc get_brand_plan_info" "$API/rpc/get_brand_plan_info" 200 \
  "-X POST -H Content-Type:application/json -d {\"p_brand_id\":\"64294306-5f42-463d-a5e8-2ad6c81a96de\"}"
check "POST rpc get_public_stops_for_brand" "$API/rpc/get_public_stops_for_brand" 200 \
  "-X POST -H Content-Type:application/json -d {\"p_brand_slug\":\"tuxedo\"}"
check "GET /admin_users with brand join" "$API/admin_users?select=id,user_id,role,brand_id,brands(name)&limit=5"
check "GET /stops with brand join" "$API/stops?select=id,city,brand_id,brands(name)&limit=5"

echo "=== MinIO ==="
check "Storage logo.png" "$WEB/storage/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/logo.png"
check "Storage olathe-sweet-logo.png" "$WEB/storage/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo.png"
check "Storage olathe-sweet-logo-dark.png" "$WEB/storage/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo-dark.png"

echo "=== Public storefronts ==="
check "GET /" "$WEB/"
check "GET /tuxedo" "$WEB/tuxedo"
check "GET /tuxedo/about" "$WEB/tuxedo/about"
check "GET /tuxedo/stops" "$WEB/tuxedo/stops"
check "GET /indian-river-direct" "$WEB/indian-river-direct"
check "GET /login" "$WEB/login"

echo "=== Admin pages (dev_session=platform_admin) ==="
for p in /admin /admin/products /admin/stops /admin/orders /admin/users /admin/settings /admin/settings/billing /admin/settings/apps /admin/settings/payments /admin/communications /admin/communications/compose /admin/time-tracking /admin/wholesale /admin/water-log /admin/analytics /admin/reports; do
  check "GET $p" "$WEB$p" 200 "dev_session=platform_admin"
done

echo ""
echo "=== Summary ==="
echo "  PASS: $pass"
echo "  FAIL: $fail"
if [ $fail -gt 0 ]; then
  echo "  Failures:"
  for f in "${FAILURES[@]}"; do echo "    - $f"; done
  exit 1
fi
echo "  ALL GREEN"
