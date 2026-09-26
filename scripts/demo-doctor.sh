#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GUM="${GUM:-$(command -v gum 2>/dev/null || true)}"
CURL="${CURL:-$(command -v curl 2>/dev/null || true)}"
PYTHON="${PYTHON:-$(command -v python 2>/dev/null || command -v python3 2>/dev/null || true)}"
OLLAMA="${OLLAMA:-$(command -v ollama 2>/dev/null || true)}"
LIQUID_MODEL="hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M"
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

if [[ -n "$OLLAMA" ]] && "$OLLAMA" show "$LIQUID_MODEL" >/dev/null 2>&1; then
  pass "LiquidAI LFM2.5 installed locally"
  if "$CURL" -fsS http://127.0.0.1:11434/api/ps 2>/dev/null |
     jq -e --arg model "$LIQUID_MODEL" '.models[]? | select((.name // .model) == $model)' >/dev/null; then
    pass "LiquidAI LFM2.5 loaded now · local privacy fallback ready"
  else
    warn "LiquidAI installed but cold · warm with: ollama run '$LIQUID_MODEL'"
  fi
else
  warn "LiquidAI local fallback is not installed"
fi

if jq -e '
  .bedrock_transcription.model_id == "mistral.voxtral-mini-3b-2507" and
  .bedrock_transcription.execution_state == "OBSERVED_PASS"
' validation/real-team-audio-receipts.json >/dev/null 2>&1; then
  pass "Voxtral Mini Bedrock media receipt · offline fallback only"
else
  warn "Voxtral media-transcription receipt unavailable"
fi

for file in \
  web/index.html web/voice.html web/provider.html web/caregiver.html web/child.html \
  web/replay.html web/session-receipt.html web/session-receipt.json \
  web/session-receipt.js web/release-receipt.json web/release-proof.js \
  web/voice-accessibility.test.mjs \
  validation/speech-pathology-context-matrix.json \
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

if node --test web/voice-accessibility.test.mjs >/dev/null 2>&1; then
  pass "accessibility-first voice control contract"
else
  fail "voice controls or accessible labels failed"
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
style --foreground 39 "1. Open voice.html?room=JUDGES → consent → connect → Start guided round."
style --foreground 39 "2. For each prompt: check actor → Verify selected actor → show role receipt → start response."
style --foreground 39 "3. Use Pause / Continue / Stop visibly; highlighted role is facilitator-selected."
style --foreground 39 "4. Show transcript → approve minimized update → confirm it on actor-specific JUDGES links."
style --foreground 39 "5. If voice fails, open replay.html immediately."

printf '\n'
if (( failures > 0 )); then
  style --bold --foreground 196 "$failures critical check(s) failed · $warnings warning(s)"
  exit 1
fi
style --bold --foreground 42 "CORE DEMO GREEN · $warnings optional warning(s)"
