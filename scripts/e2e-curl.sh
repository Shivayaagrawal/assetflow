#!/usr/bin/env bash
# End-to-end validation via curl (HTTP layer) + PostgreSQL constraint checks.
# Workflow mutations (server actions) are exercised by scripts/e2e-workflows.mts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
ORIGIN="${ORIGIN:-http://localhost:3000}"
PASSWORD="${SEED_PASSWORD:-Password123!}"
COOKIE_JAR="$(mktemp)"
RUN_ID="$(date +%s)"
PASS=0
FAIL=0
SKIP=0

cleanup() { rm -f "$COOKIE_JAR"; }
trap cleanup EXIT

# shellcheck disable=SC1091
source "$ROOT/scripts/e2e-lib.sh"

echo "=============================================="
echo " AssetFlow E2E — HTTP (curl) + DB constraints"
echo " Base: $BASE_URL  Run: $RUN_ID"
echo "=============================================="

section "Health"
assert_http_ok "GET /api/health" \
  curl -sS -o /tmp/e2e-health.json -w "%{http_code}" "$BASE_URL/api/health"
assert_json_field "/tmp/e2e-health.json" '.success' 'true'
assert_json_field "/tmp/e2e-health.json" '.data.status' 'ok'

section "Identity — easy cases"
TEST_EMAIL="e2e-${RUN_ID}@assetflow.demo"
assert_http_ok "POST sign-up creates EMPLOYEE" \
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/e2e-signup.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-up/email" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"E2E User $RUN_ID\"}"
assert_json_field "/tmp/e2e-signup.json" '.user.role' 'EMPLOYEE'
assert_json_field "/tmp/e2e-signup.json" '.user.status' 'ACTIVE'

assert_http_ok "GET session after sign-up" \
  curl -sS -b "$COOKIE_JAR" -o /tmp/e2e-session.json -w "%{http_code}" \
    "$BASE_URL/api/auth/get-session"
assert_json_field "/tmp/e2e-session.json" '.user.email' "$TEST_EMAIL"

assert_http_ok "POST sign-out" \
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/e2e-signout.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-out" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d '{}'

assert_http_ok "POST sign-in seed admin" \
  curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -o /tmp/e2e-admin-login.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d '{"email":"admin@assetflow.demo","password":"'"$PASSWORD"'"}'
assert_json_field "/tmp/e2e-admin-login.json" '.user.role' 'ADMIN'

section "Identity — hard cases"
assert_http_fail "POST sign-in wrong password → 401" 401 \
  curl -sS -o /tmp/e2e-bad-pw.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d '{"email":"admin@assetflow.demo","password":"wrong-password-xyz"}'

DUP_HTTP=$(curl -sS -o /tmp/e2e-dup-signup.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Duplicate\"}")
if [[ "$DUP_HTTP" == "422" || "$DUP_HTTP" == "409" || "$DUP_HTTP" == "400" ]]; then
  pass "duplicate sign-up rejected (HTTP $DUP_HTTP)"
else
  fail "duplicate sign-up expected 4xx, got HTTP $DUP_HTTP: $(cat /tmp/e2e-dup-signup.json)"
fi

FORGOT_HTTP=$(curl -sS -o /tmp/e2e-forgot.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d "{\"email\":\"$TEST_EMAIL\",\"redirectTo\":\"$ORIGIN/reset-password\"}")
FORGOT_CODE=$(jq -r '.code // empty' /tmp/e2e-forgot.json 2>/dev/null || true)
if [[ "$FORGOT_HTTP" == "200" ]]; then
  pass "POST request-password-reset (HTTP 200)"
elif [[ "$FORGOT_CODE" == "RESET_PASSWORD_DISABLED" ]]; then
  skip "request-password-reset not enabled in Better Auth config"
else
  fail "request-password-reset expected 200, got HTTP $FORGOT_HTTP: $(cat /tmp/e2e-forgot.json)"
fi

section "Cron"
CRON_SECRET="$(grep '^CRON_SECRET=' .env | cut -d= -f2- | tr -d '"' || true)"
if [[ -z "$CRON_SECRET" ]]; then
  skip "CRON_SECRET not set — skipping cron route"
else
  assert_http_fail "GET /api/cron/overdue-check without auth → 401" 401 \
    curl -sS -o /tmp/e2e-cron-unauth.json -w "%{http_code}" \
      "$BASE_URL/api/cron/overdue-check"

  assert_http_ok "GET /api/cron/overdue-check with bearer" \
    curl -sS -o /tmp/e2e-cron.json -w "%{http_code}" \
      -H "Authorization: Bearer $CRON_SECRET" \
      "$BASE_URL/api/cron/overdue-check"
  assert_json_field "/tmp/e2e-cron.json" '.success' 'true'

  assert_http_ok "GET /api/cron/booking-reminder with bearer" \
    curl -sS -o /tmp/e2e-reminder-cron.json -w "%{http_code}" \
      -H "Authorization: Bearer $CRON_SECRET" \
      "$BASE_URL/api/cron/booking-reminder"
  assert_json_field "/tmp/e2e-reminder-cron.json" '.success' 'true'
fi

section "Reports"
REPORT_UNAUTH_HTTP=$(curl -sS -o /tmp/e2e-reports-unauth.json -w "%{http_code}" \
  "$BASE_URL/reports/export")
if [[ "$REPORT_UNAUTH_HTTP" == "401" || "$REPORT_UNAUTH_HTTP" == "307" ]]; then
  pass "GET /reports/export without session blocked (HTTP $REPORT_UNAUTH_HTTP)"
else
  fail "GET /reports/export without session expected 401 or 307, got HTTP $REPORT_UNAUTH_HTTP"
fi

assert_http_ok "GET /reports/export returns CSV (authenticated)" \
  curl -sS -L -b "$COOKIE_JAR" -o /tmp/e2e-reports.csv -w "%{http_code}" \
    "$BASE_URL/reports/export"
if head -1 /tmp/e2e-reports.csv | grep -q "Section"; then
  pass "reports CSV has header row"
else
  fail "reports CSV missing expected header"
fi

section "Notifications & Activity"
assert_http_ok "GET /api/notifications (authenticated)" \
  curl -sS -b "$COOKIE_JAR" -o /tmp/e2e-notifications.json -w "%{http_code}" \
    "$BASE_URL/api/notifications"
assert_json_field "/tmp/e2e-notifications.json" '.success' 'true'

assert_http_fail "GET /api/notifications without session → 401" 401 \
  curl -sS -o /tmp/e2e-notifications-unauth.json -w "%{http_code}" \
    "$BASE_URL/api/notifications"

assert_http_ok "GET /notifications page" \
  curl -sS -L -b "$COOKIE_JAR" -o /tmp/e2e-notifications-page.html -w "%{http_code}" \
    "$BASE_URL/notifications"
if grep -q "Notifications" /tmp/e2e-notifications-page.html; then
  pass "notifications page renders title"
else
  fail "notifications page missing title"
fi

assert_http_ok "GET /activity page" \
  curl -sS -L -b "$COOKIE_JAR" -o /tmp/e2e-activity-page.html -w "%{http_code}" \
    "$BASE_URL/activity"
if grep -q "Activity Feed" /tmp/e2e-activity-page.html; then
  pass "activity page renders title"
else
  fail "activity page missing title"
fi

section "Booking calendar"
assert_http_ok "GET /booking page" \
  curl -sS -L -b "$COOKIE_JAR" -o /tmp/e2e-booking-page.html -w "%{http_code}" \
    "$BASE_URL/booking"
if grep -q "Resource calendar" /tmp/e2e-booking-page.html; then
  pass "booking page renders calendar"
else
  fail "booking page missing calendar"
fi

section "Asset upload"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > /tmp/e2e-asset.png
assert_http_ok "POST /api/uploads/asset-image (authenticated)" \
  curl -sS -b "$COOKIE_JAR" -o /tmp/e2e-upload.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/uploads/asset-image" \
    -F "file=@/tmp/e2e-asset.png;type=image/png"
assert_json_field "/tmp/e2e-upload.json" '.success' 'true'
UPLOAD_URL=$(jq -r '.data.url // empty' /tmp/e2e-upload.json)
if [[ "$UPLOAD_URL" == /uploads/assets/* ]]; then
  pass "upload returns local asset path"
else
  fail "upload path unexpected: $UPLOAD_URL"
fi

assert_http_fail "POST /api/uploads/asset-image without session → 401" 401 \
  curl -sS -o /tmp/e2e-upload-unauth.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/uploads/asset-image" \
    -F "file=@/tmp/e2e-asset.png;type=image/png"

ASSET_ID=$(docker exec "${PG_CONTAINER:-assetflow-postgres-1}" psql -U assetflow -d assetflow -tAc \
  'SELECT id FROM "Asset" LIMIT 1' 2>/dev/null | tr -d '[:space:]' || true)
if [[ -n "$ASSET_ID" ]]; then
  assert_http_ok "GET asset detail with QR + timeline" \
    curl -sS -L -b "$COOKIE_JAR" -o /tmp/e2e-asset-detail.html -w "%{http_code}" \
      "$BASE_URL/assets/$ASSET_ID"
  if grep -q "Asset QR Code" /tmp/e2e-asset-detail.html && grep -q "Asset Timeline" /tmp/e2e-asset-detail.html; then
    pass "asset detail shows QR and timeline sections"
  else
    fail "asset detail missing QR or timeline sections"
  fi
else
  skip "no asset id for detail page check"
fi

section "PostgreSQL constraints (live DB)"
PG_CONTAINER="${PG_CONTAINER:-assetflow-postgres-1}"
if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  for con in \
    "no_overlapping_bookings" \
    "booking_end_after_start" \
    "return_after_allocate" \
    "cost_non_negative"; do
    if docker exec "$PG_CONTAINER" psql -U assetflow -d assetflow -tAc \
      "SELECT 1 FROM pg_constraint WHERE conname = '$con'" | grep -q 1; then
      pass "constraint active: $con"
    else
      fail "constraint missing: $con"
    fi
  done

  for idx in \
    "one_active_allocation_per_asset" \
    "one_active_maintenance_per_asset" \
    "Notification_type_relatedEntityId_recipientId_key"; do
    if docker exec "$PG_CONTAINER" psql -U assetflow -d assetflow -tAc \
      "SELECT 1 FROM pg_indexes WHERE indexname = '$idx'" | grep -q 1; then
      pass "partial index active: $idx"
    else
      fail "partial index missing: $idx"
    fi
  done

  # Hard case: EXCLUDE rejects overlapping insert at DB layer
  if docker exec "$PG_CONTAINER" psql -U assetflow -d assetflow -v ON_ERROR_STOP=1 -tAc "
    DO \$\$
    DECLARE
      aid text;
      uid text;
    BEGIN
      SELECT id INTO aid FROM \"Asset\" WHERE \"isBookable\" = true LIMIT 1;
      SELECT id INTO uid FROM \"User\" WHERE status = 'ACTIVE' LIMIT 1;
      IF aid IS NULL OR uid IS NULL THEN
        RAISE EXCEPTION 'seed data missing';
      END IF;
      INSERT INTO \"Booking\" (id, \"assetId\", \"bookedById\", \"startTime\", \"endTime\", status, \"createdAt\", \"updatedAt\")
      VALUES ('e2e-base-$RUN_ID', aid, uid, '2030-01-15 09:00:00+00', '2030-01-15 10:00:00+00', 'UPCOMING', now(), now());
      BEGIN
        INSERT INTO \"Booking\" (id, \"assetId\", \"bookedById\", \"startTime\", \"endTime\", status, \"createdAt\", \"updatedAt\")
        VALUES ('e2e-overlap-$RUN_ID', aid, uid, '2030-01-15 09:30:00+00', '2030-01-15 10:30:00+00', 'UPCOMING', now(), now());
        RAISE EXCEPTION 'overlap should have been rejected';
      EXCEPTION WHEN exclusion_violation THEN
        NULL;
      END;
      DELETE FROM \"Booking\" WHERE id IN ('e2e-base-$RUN_ID', 'e2e-overlap-$RUN_ID');
    END \$\$;
  " >/dev/null 2>&1; then
    pass "EXCLUDE rejects overlapping booking (hard case)"
  else
    fail "EXCLUDE overlap test failed"
  fi

  # Hard case: partial unique index blocks second active allocation
  if docker exec "$PG_CONTAINER" psql -U assetflow -d assetflow -v ON_ERROR_STOP=1 -tAc "
    DO \$\$
    DECLARE
      aid text;
      uid text;
    BEGIN
      SELECT id INTO aid FROM \"Asset\" WHERE status = 'AVAILABLE' LIMIT 1;
      SELECT id INTO uid FROM \"User\" WHERE status = 'ACTIVE' LIMIT 1;
      IF aid IS NULL THEN
        RAISE NOTICE 'no available asset — skip';
        RETURN;
      END IF;
      INSERT INTO \"Allocation\" (id, \"assetId\", \"holderType\", \"holderEmployeeId\", \"allocatedAt\", status, \"createdAt\", \"updatedAt\")
      VALUES ('e2e-alloc-$RUN_ID', aid, 'EMPLOYEE', uid, now(), 'ACTIVE', now(), now());
      BEGIN
        INSERT INTO \"Allocation\" (id, \"assetId\", \"holderType\", \"holderEmployeeId\", \"allocatedAt\", status, \"createdAt\", \"updatedAt\")
        VALUES ('e2e-alloc2-$RUN_ID', aid, 'EMPLOYEE', uid, now(), 'ACTIVE', now(), now());
        RAISE EXCEPTION 'double allocation should fail';
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
      DELETE FROM \"Allocation\" WHERE id IN ('e2e-alloc-$RUN_ID', 'e2e-alloc2-$RUN_ID');
    END \$\$;
  " >/dev/null 2>&1; then
    pass "partial unique blocks double active allocation (hard case)"
  else
    fail "double allocation constraint test failed"
  fi
else
  skip "Postgres container $PG_CONTAINER not running"
fi

section "Workflow layer (server actions via tsx)"
if npx tsx scripts/e2e-workflows.mts "$RUN_ID"; then
  pass "workflow suite completed"
else
  fail "workflow suite failed"
fi

echo ""
echo "=============================================="
echo " Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "=============================================="
[[ "$FAIL" -eq 0 ]]
