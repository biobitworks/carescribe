# Deployment checklist

Evidence snapshot: 2026-09-26.

## Current status

- [x] GitHub Pages is public with enforced HTTPS at
  <https://biobitworks.github.io/carescribe/>.
- [x] The final local package includes every referenced focused page, stylesheet,
  script, caption file, and replay asset.
- [x] Local browser checks show the Provider, Caregiver, Projector, and Models pages
  with zero console errors; all seven direct pages and their assets return HTTP 200.
- [ ] The final pushed commit and Pages run must still be recorded and compared to the
  public bytes using the post-push steps below.
- [ ] A docs-only push does not deploy Pages. The workflow runs on changes under
  `web/**`, changes to `.github/workflows/pages.yml`, or manual dispatch.

## What GitHub Pages can prove

- [ ] The selected commit's static `web/` files were uploaded by the Pages
  workflow and are retrievable over HTTPS.
- [ ] The static UI loads in the target browsers and its fictional fallback,
  controls, and per-browser `localStorage` behavior pass a manual test.
- [ ] Required static assets return `200` and match the committed bytes.

Pages cannot prove a Python process, `/api/*` endpoint, local model, Amazon
Bedrock invocation, Nova Sonic execution, cross-device synchronization, durable
storage, access control, privacy compliance, or clinical suitability. A label in
the UI or `/api/health` response is not execution evidence.

## What remains local-only

- `src/carescribe/live_server.py` and `/api/health`, `/api/local-gate`,
  `/api/room`, and `/api/bedrock`. Pages serves only files from `web/`; its
  `/api/health` and `/api/room` currently return `404`.
- Browser session/custody state in `localStorage`; it is isolated by device,
  browser profile, and origin.
- Room events in one Python process's memory. They disappear on restart and are
  not shared between server instances.
- The optional model endpoint at `127.0.0.1:8484`, which is loopback on the
  Python server host.
- Bedrock requests, which require the local server, an authorized AWS identity,
  and an actual successful invocation. The inspected Pages deployment supplies
  none of these.

## Before push

- [ ] Confirm every referenced web file is committed:

  ```bash
  git status --short -- web .github/workflows/pages.yml
  git ls-files --error-unmatch \
    web/room-interactions.css \
    web/assets/carescribe-three-actor-demo.mp4
  ```

- [ ] Run the available local checks:

  ```bash
  git diff --check -- web .github/workflows/pages.yml
  node --test web/fco-core.test.mjs
  PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=src \
    python -m pytest tests/test_live_server.py -q
  ```

These checks pass against the final local package once the listed files are staged.

## Exact post-push verification

1. Record the pushed commit and find its workflow run:

   ```bash
   DEPLOY_SHA=$(git rev-parse HEAD)
   git ls-remote origin refs/heads/main
   gh run list --workflow pages.yml --commit "$DEPLOY_SHA" \
     --json databaseId,headSha,status,conclusion,url
   ```

2. If the push changed `web/**` or the workflow, wait for that run. If it was a
   docs-only push, no run is expected; dispatch one only when a redeploy is
   intended:

   ```bash
   gh workflow run pages.yml --ref main
   RUN_ID=$(gh run list --workflow pages.yml --branch main --limit 1 \
     --json databaseId --jq '.[0].databaseId')
   gh run watch "$RUN_ID" --exit-status
   gh run view "$RUN_ID" --json headSha,status,conclusion,url
   ```

3. Verify the public page and every referenced static asset:

   ```bash
   SITE=https://biobitworks.github.io/carescribe
   curl -fsSIL "$SITE/"
   for FILE in index.html app.js fco-core.js styles.css \
     room-interactions.css assets/carescribe-three-actor-demo.mp4
   do
     HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' \
       "$SITE/$FILE?sha=$DEPLOY_SHA")
     test "$HTTP_CODE" = 200 || {
       echo "$HTTP_CODE $FILE"
       exit 1
     }
   done
   ```

4. Prove the deployed bytes match the pushed commit:

   ```bash
   for FILE in index.html app.js fco-core.js styles.css \
     room-interactions.css assets/carescribe-three-actor-demo.mp4
   do
     LOCAL_HASH=$(git show "$DEPLOY_SHA:web/$FILE" | shasum -a 256 | cut -d' ' -f1)
     REMOTE_HASH=$(curl -fsSL "$SITE/$FILE?sha=$DEPLOY_SHA" \
       | shasum -a 256 | cut -d' ' -f1)
     test "$LOCAL_HASH" = "$REMOTE_HASH" || {
       echo "hash mismatch: $FILE"
       exit 1
     }
   done
   ```

5. Keep the backend boundary visible:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' "$SITE/api/health"
   curl -sS -o /dev/null -w '%{http_code}\n' "$SITE/api/room"
   ```

   Both should remain `404` for a Pages-only deployment. Use
   <https://github.com/biobitworks/carescribe/actions/workflows/pages.yml> for
   run history and <https://biobitworks.github.io/carescribe/> for browser
   verification.

## Blockers for a true multi-device backend

- [ ] Deploy the Python/API service on a reachable HTTPS origin. Its default
  bind address, `127.0.0.1`, accepts connections only from the host device;
  the server also has no TLS.
- [ ] Route the frontend to that service (same-origin reverse proxy or an
  explicit API base URL with a narrowly configured cross-origin policy).
- [ ] Replace process-memory rooms with a shared, durable store and define room
  expiry, ordering, deduplication, reconnect, and multi-instance behavior.
- [ ] Add participant authentication and room authorization, plus revocation,
  rate limits, origin/request protections, audit events, and operational
  monitoring. A client-supplied room identifier and approval-shaped payload are
  not authorization or proof of approval.
- [ ] Resolve the privacy-boundary mismatch: `/api/local-gate` sends exact text
  from the browser to the Python host, and the model runs on that host's
  loopback interface. For an on-device claim, inference and minimization must
  happen on the originating device before network transfer.
- [ ] Use a production synchronization design. The current browser polls every
  two seconds; there is no WebSocket/SSE channel, delivery acknowledgement, or
  offline reconciliation.
- [ ] Validate each remote dependency with a real, attributable invocation.
  Current status strings do not establish Bedrock availability and there is no
  inspected evidence of Nova Sonic execution.
- [ ] Complete an independent security, privacy, retention, and regulatory
  assessment before using non-synthetic data. This checklist makes no HIPAA
  compliance claim.
