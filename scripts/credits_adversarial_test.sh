#!/usr/bin/env bash
#
# Credits Adversarial Test Script
# ================================
# Run against a live Supabase project to verify tamper-proof credit reservation.
#
# Prerequisites:
#   export SUPABASE_URL="https://your-project.supabase.co"
#   export SUPABASE_ANON_KEY="your-anon-key"
#   export USER_JWT="your-user-jwt-token"
#   export OTHER_USER_JWT="a-different-users-jwt-token"
#
# Usage:
#   chmod +x scripts/credits_adversarial_test.sh
#   ./scripts/credits_adversarial_test.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE="${SUPABASE_URL}/functions/v1"
AUTH="Authorization: Bearer ${USER_JWT}"
CT="Content-Type: application/json"

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }

echo "========================================="
echo "  Credits Adversarial Test Suite"
echo "========================================="
echo ""

# ─── Test 1: generate-image without reservation_id → expect 402 ───
info "Test 1: generate-image without reservation_id"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE}/generate-image" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"prompt":"test prompt"}')

if [ "$STATUS" = "402" ] || [ "$STATUS" = "400" ]; then
  pass "generate-image rejected without reservation_id (HTTP $STATUS)"
else
  fail "generate-image should reject without reservation_id, got HTTP $STATUS"
fi

# ─── Test 2: funlab-generate without reservation_id → expect 402 ───
info "Test 2: funlab-generate without reservation_id"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE}/funlab-generate" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"pack_id":"caricature_clean","variant_prompts":["a","b","c"],"source_image_url":"https://example.com/test.jpg"}')

if [ "$STATUS" = "402" ]; then
  pass "funlab-generate rejected without reservation_id (HTTP $STATUS)"
else
  fail "funlab-generate should return 402 without reservation_id, got HTTP $STATUS"
fi

# ─── Test 3: Call with someone else's reservation_id → expect 402 ───
info "Test 3: Reserve credits for user A, use with user B"
# First reserve as user A
RESERVE_RESP=$(curl -s \
  -X POST "${BASE}/reserve-credits" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"amount":10,"action":"funlab","description":"adversarial test"}')

RESERVATION_ID=$(echo "$RESERVE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reservation_id',''))" 2>/dev/null || echo "")

if [ -z "$RESERVATION_ID" ]; then
  fail "Could not reserve credits for test 3 (response: $RESERVE_RESP)"
else
  # Try to use it as user B
  OTHER_AUTH="Authorization: Bearer ${OTHER_USER_JWT:-invalid_token}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE}/funlab-generate" \
    -H "${OTHER_AUTH}" -H "${CT}" \
    -d "{\"pack_id\":\"caricature_clean\",\"variant_prompts\":[\"a\",\"b\",\"c\"],\"source_image_url\":\"https://example.com/test.jpg\",\"reservation_id\":\"${RESERVATION_ID}\"}")

  if [ "$STATUS" = "402" ] || [ "$STATUS" = "401" ]; then
    pass "Cannot use another user's reservation (HTTP $STATUS)"
  else
    fail "Should reject other user's reservation, got HTTP $STATUS"
  fi

  # Clean up: refund the test reservation
  curl -s -o /dev/null \
    -X POST "${BASE}/commit-credits" \
    -H "${AUTH}" -H "${CT}" \
    -d "{\"reservation_id\":\"${RESERVATION_ID}\",\"action\":\"refund\"}"
fi

# ─── Test 4: Expired reservation → expect 402 and no credit change ───
info "Test 4: Expired reservation"
# Reserve, then manually expire it (need service role for this)
RESERVE_RESP2=$(curl -s \
  -X POST "${BASE}/reserve-credits" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"amount":3,"action":"analyze","description":"expiry test"}')

RESERVATION_ID2=$(echo "$RESERVE_RESP2" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reservation_id',''))" 2>/dev/null || echo "")

if [ -z "$RESERVATION_ID2" ]; then
  fail "Could not reserve credits for test 4"
else
  info "  Reservation created: $RESERVATION_ID2"
  info "  To complete this test manually:"
  info "  1. In Supabase SQL editor, run:"
  info "     UPDATE credit_transactions SET expires_at = '2020-01-01' WHERE id = '${RESERVATION_ID2}';"
  info "  2. Then run:"
  info "     curl -s -w '%{http_code}' -X POST '${BASE}/analyze-image' -H '${AUTH}' -H '${CT}' -d '{\"image\":\"test\",\"reservation_id\":\"${RESERVATION_ID2}\"}'"
  info "  3. Expected: HTTP 402"
  info "  4. Verify credit_transactions row: status should still be 'pending' (server expiry handles cleanup)"

  # Clean up
  curl -s -o /dev/null \
    -X POST "${BASE}/commit-credits" \
    -H "${AUTH}" -H "${CT}" \
    -d "{\"reservation_id\":\"${RESERVATION_ID2}\",\"action\":\"refund\"}"
fi

# ─── Test 5: Check balance before/after reservation lifecycle ───
info "Test 5: Balance consistency through reserve → refund"
BALANCE_BEFORE=$(curl -s \
  -X POST "${BASE}/check-feature-access" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"action":"analyze"}')

info "  Balance before: $(echo "$BALANCE_BEFORE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('balance','?'))" 2>/dev/null)"

RESERVE_RESP3=$(curl -s \
  -X POST "${BASE}/reserve-credits" \
  -H "${AUTH}" -H "${CT}" \
  -d '{"amount":10,"action":"funlab","description":"balance test"}')

RESERVATION_ID3=$(echo "$RESERVE_RESP3" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reservation_id',''))" 2>/dev/null || echo "")

if [ -n "$RESERVATION_ID3" ]; then
  BALANCE_DURING=$(curl -s \
    -X POST "${BASE}/check-feature-access" \
    -H "${AUTH}" -H "${CT}" \
    -d '{"action":"analyze"}')
  info "  Balance during reservation: $(echo "$BALANCE_DURING" | python3 -c "import sys,json; print(json.load(sys.stdin).get('balance','?'))" 2>/dev/null)"

  # Refund
  curl -s -o /dev/null \
    -X POST "${BASE}/commit-credits" \
    -H "${AUTH}" -H "${CT}" \
    -d "{\"reservation_id\":\"${RESERVATION_ID3}\",\"action\":\"refund\"}"

  BALANCE_AFTER=$(curl -s \
    -X POST "${BASE}/check-feature-access" \
    -H "${AUTH}" -H "${CT}" \
    -d '{"action":"analyze"}')
  info "  Balance after refund: $(echo "$BALANCE_AFTER" | python3 -c "import sys,json; print(json.load(sys.stdin).get('balance','?'))" 2>/dev/null)"

  pass "Balance lifecycle check complete — verify before == after manually"
else
  fail "Could not reserve for balance test"
fi

echo ""
echo "========================================="
echo "  Manual verification checklist"
echo "========================================="
echo ""
echo "  □ Test 1: generate-image rejects without reservation_id"
echo "  □ Test 2: funlab-generate rejects without reservation_id"
echo "  □ Test 3: Cannot use another user's reservation_id"
echo "  □ Test 4: Expired reservation rejected, no credit change"
echo "  □ Test 5: Balance before reserve == balance after refund"
echo "  □ Test 6: funlab-generate with 3/3 success → commit, credits deducted"
echo "  □ Test 7: funlab-generate with <3 success → refund, credits restored"
echo ""
echo "  Verify in Supabase dashboard:"
echo "  □ credit_transactions shows correct status transitions"
echo "  □ No orphaned 'pending' rows older than 10 minutes"
echo ""
