#!/usr/bin/env bash
# Shared helpers for e2e-curl.sh

pass() {
  PASS=$((PASS + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "  FAIL: $1" >&2
}

skip() {
  SKIP=$((SKIP + 1))
  echo "  SKIP: $1"
}

section() {
  echo ""
  echo "--- $1 ---"
}

assert_http_ok() {
  local label="$1"
  shift
  local code
  code=$("$@")
  if [[ "$code" == "200" || "$code" == "201" || "$code" == "204" ]]; then
    pass "$label (HTTP $code)"
  else
    fail "$label — expected 2xx, got HTTP $code"
  fi
}

assert_http_fail() {
  local label="$1"
  local expected="$2"
  shift 2
  local code
  code=$("$@")
  if [[ "$code" == "$expected" ]]; then
    pass "$label (HTTP $code)"
  else
    fail "$label — expected HTTP $expected, got $code"
  fi
}

assert_json_field() {
  local file="$1"
  local jq_path="$2"
  local expected="$3"
  local actual
  actual=$(jq -r "$jq_path" "$file" 2>/dev/null || echo "")
  if [[ "$actual" == "$expected" ]]; then
    pass "json $jq_path = $expected"
  else
    fail "json $jq_path expected '$expected', got '$actual' (file: $file)"
  fi
}
