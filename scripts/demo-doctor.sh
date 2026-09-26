#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GUM="${GUM:-$(command -v gum 2>/dev/null || true)}"
CURL="${CURL:-$(command -v curl 2>/dev/null || true)}"
PYTHON="${PYTHON:-$(command -v python 2>/dev/null || command -v python3 2>/dev/null || true)}"
failures=0
warnings=0

style() {
  if [[ -n "$GUM" ]]; then
    "$GUM" style "$@"
  else
    printf '%s\n' "${!#}"
  fi
}

pass() { style --foreground 42 "✓ $1"; }
warn() { warnings=$((warnings + 1)); style --foreground 214 "△ $1"; }
fail() { failures=$((failures + 1)); style --foreground 196 "✗ $1"; }

check_command() {
  if command -v "$1" >/dev/null 2>&1; then pass "$1 available"; else fail "$1 missing"; fi
}

http_status() {
  "$CURL" --silent --show-error --output /dev/null --write-out '%{http_code}' "$1" 2>/dev/null || true
}

style --bold --border rounded --padding "0 2" "CareScribe Demo Doctor"

[[ -n "$PYTHON" ]] && pass "$("$PYTHON" -V 2>&1)" || fail "Python missing"
check_command node
check_command gum
check_command curl

for file in \
  web/index.html web/voice.html web/provider.html web/caregiver.html web/child.html \
  web/replay.html web/session-receipt.html web/session-receipt.json \
  web/session-receipt.js web/release-receipt.json web/release-proof.js \
  src/carescribe/live_server.py src/carescribe/sonic_server.py; do
  [[ -f "$file" ]] && pass "$file" || fail "$file missing"
done

if node --check web/release-proof.js >/dev/null 2>&1 &&
   node --check web/session-receipt.js >/dev/null 2>&1 &&
   node --check web/voice.js >/dev/null 2>&1; then
  pass "browser JavaScript parses"
else
  fail "browser JavaScript parse error"
fi

if node --test web/*.test.mjs >/dev/null 2>&1; then
  pass "browser unit tests"
else
  fail "browser unit tests failed"
fi

if PYTHONPATH=src PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 "$PYTHON" -m pytest -q >/dev/null 2>&1; then
  pass "Python unit tests"
else
  fail "Python unit tests failed"
fi

if [[ -n "$CURL" ]] && [[ "$(http_status http://127.0.0.1:8080/api/health)" == "200" ]]; then
  pass "local room API · http://127.0.0.1:8080"
  [[ "$(http_status http://127.0.0.1:8080/voice.html)" == "200" ]] &&
    pass "local voice page" || fail "local voice page unavailable"
else
  warn "local room API is stopped · start it in Terminal 1"
fi

if [[ -n "$CURL" ]] && [[ "$(http_status http://127.0.0.1:8081/ping)" == "200" ]]; then
  pass "Amazon Nova Sonic bridge · http://127.0.0.1:8081"
else
  warn "Nova Sonic bridge is stopped · fallback replay remains available"
fi

if [[ "${CARESCRIBE_MIC_VERIFIED:-0}" == "1" ]]; then
  pass "physical microphone check acknowledged for this laptop session"
else
  warn "physical microphone still needs a human sound check · set CARESCRIBE_MIC_VERIFIED=1 after hearing the response"
fi

if [[ -n "$CURL" ]] &&
   [[ "$(http_status https://biobitworks.github.io/carescribe/)" == "200" ]] &&
   [[ "$(http_status https://biobitworks.github.io/carescribe/release-receipt.json)" == "200" ]] &&
   [[ "$(http_status https://biobitworks.github.io/carescribe/session-receipt.html)" == "200" ]] &&
   [[ "$(http_status https://biobitworks.github.io/carescribe/session-receipt.json)" == "200" ]]; then
  pass "public presentation, signed release, and session receipt"
else
  warn "public presentation could not be verified"
fi

printf '\n'
style --bold "Two-minute judge path"
style --foreground 39 "1. Caregiver (Maya): consent → connect → ask the fictional concern."
style --foreground 39 "2. Child (Leo): select Child → demonstrate one nonverbal or loud signal; meaning stays unknown."
style --foreground 39 "3. Provider (Julie, SLP): explain next step → review evidence → caregiver confirms understanding."
style --foreground 39 "4. Show transcript + speaking avatar → approve minimized update → show FCG receipt."
style --foreground 39 "5. If voice fails, open replay.html immediately."

printf '\n'
if (( failures > 0 )); then
  style --bold --foreground 196 "$failures critical check(s) failed · $warnings warning(s)"
  exit 1
fi
style --bold --foreground 42 "CORE DEMO GREEN · $warnings optional warning(s)"
