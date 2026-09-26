# CareScribe Judge Demo Runbook — 3 Minutes

Use fictional content only. CareScribe is a simulated-data, clinician-reviewed
documentation-support prototype: it is not an EHR, not approved for PHI, and does not
claim HIPAA compliance.

> “Julie started Leo’s evaluation, but it is not complete. Maya should still leave knowing
> what happened, what comes next, who owns it, and when.”

## Choose the presentation mode before starting

### Local live backend — the only mode with `/api/*`

Start the local server:

```sh
export AWS_REGION=us-east-1
PYTHONPATH=src python -m carescribe.live_server --host 127.0.0.1 --port 8080
```

Use these local URLs, all with `?room=JUDGES`:

- `http://127.0.0.1:8080/provider.html?room=JUDGES`
- `http://127.0.0.1:8080/caregiver.html?room=JUDGES`
- `http://127.0.0.1:8080/child.html?room=JUDGES`
- `http://127.0.0.1:8080/projector.html?room=JUDGES`
- `http://127.0.0.1:8080/models.html?room=JUDGES`
- `http://127.0.0.1:8080/replay.html?room=JUDGES`
- `http://127.0.0.1:8080/slides.html`

This is a loopback, synthetic-only demo server. It can expose the local health response
and one process-memory, identifier-keyed room feed; it does not create authenticated,
private, durable, or real multi-device rooms.

### Public static Pages — no local backend

Use the same dedicated paths under `https://biobitworks.github.io/carescribe/`, for
example:

- `https://biobitworks.github.io/carescribe/provider.html`
- `https://biobitworks.github.io/carescribe/caregiver.html`
- `https://biobitworks.github.io/carescribe/child.html`
- `https://biobitworks.github.io/carescribe/projector.html`
- `https://biobitworks.github.io/carescribe/models.html`
- `https://biobitworks.github.io/carescribe/replay.html`
- `https://biobitworks.github.io/carescribe/slides.html`

Pages is a static presentation surface. Its `/api/health` and `/api/room` endpoints are
not present, so it cannot demonstrate a Python server, model invocation, synchronized
room feed, or cross-device backend. Its status card should read “Static presentation
mode”; do not describe it as live inference. Use these public URLs only after verifying
that the deployed revision includes the current focused pages and replay asset.

## LIVE — local-backend run-of-show (0:00–3:00)

| Time | Page and action | Say |
| --- | --- | --- |
| 0:00–0:20 | Open `slides.html`, then `projector.html?room=JUDGES`. | Use the opening line. “This is a shared, reviewable handoff—not a final record or diagnosis.” |
| 0:20–0:45 | Show `caregiver.html?room=JUDGES`: the Action Card. | “Maya leaves with Today: evaluation started, not complete; Next: capture two or three examples of HELP, MORE, or STOP; Who: Maya observes and Julie reviews; When: before and at the second evaluation visit.” |
| 0:45–1:05 | Show `child.html?room=JUDGES`. | “Leo may communicate with words, gestures, actions, sounds, or loud vocalizations. We label the event and preserve UNKNOWN meaning; we do not infer a cause, intent, or diagnosis.” |
| 1:05–1:30 | Show `provider.html?room=JUDGES`: the Evidence Card. | “Julie sees the attributed caregiver report, direct observations, uncertainty, missing evidence, and questions still needing a second visit. Julie alone makes clinical decisions.” |
| 1:30–2:00 | Show `projector.html?room=JUDGES`, including the room feed if the local server has an event. | “The feed is a synthetic, in-memory demo projection. It accepts only the bounded public room shape—`room`, `role`, `public_update`, `uncertainty`, and `synthetic: true`—not proof of approval, identity, confidentiality, or semantic de-identification.” |
| 2:00–2:35 | Show `models.html?room=JUDGES`. | State the model boundary below. If a live request fails, keep the static disclosure visible and say it is unavailable; do not substitute a recording as a live result. |
| 2:35–3:00 | Return to `projector.html` or `slides.html`. | “CareScribe does not decide what Leo’s observations mean. It gives Julie evidence and uncertainty to review, and gives Maya a clear, correctable next step.” |

If the local room feed is empty, say so plainly: “The server is connected, but no
synthetic public event has been added.” Do not invent a synchronization result.

## PROJECTOR — page-to-purpose guide

| Dedicated page | Projector purpose |
| --- | --- |
| `projector.html` | The shared story: Maya and Leo’s context, Julie’s review boundary, and any locally available synthetic room event. |
| `caregiver.html` | Maya’s correctable Action Card: Today, Next, Who, and When. |
| `child.html` | Leo’s bounded observation view; nonverbal events retain unknown meaning. |
| `provider.html` | Julie’s Evidence Card: source, uncertainty, missing evidence, and follow-up questions. |
| `models.html` | Model locations, proof status, and what was not demonstrated. |
| `slides.html` | Opening and closing framing. |
| `replay.html` | Clearly labeled recorded fallback. |

## Exact claim ceiling — use this wording

- **Laptop/server local gate:** “LiquidAI LFM2.5 was installed, invoked, and benchmarked
  on synthetic input as a privacy-gate adapter on the Python server host/laptop; the
  browser sends role, speaker label, and exact text to that host before room-sharing
  approval, so this is not on-phone inference.”
- **Room shape:** “The room endpoint accepts only a synthetic bounded field shape and
  rejects extra fields; that is syntactic payload minimization, not authorization,
  caregiver-signature proof, confidentiality, or semantic de-identification.”
- **Bedrock text:** “Nova Micro has a verified synthetic Bedrock invocation, and the Nova
  Pro synthesis route was observed with untrusted prose; approved atomization is minimized,
  while handoff synthesis sends the full role-tagged synthetic transcript through the
  server-side Bedrock `Converse` boundary.”
- **Status labels:** “A model label in the UI or `/api/health` response is routing metadata,
  not a runtime probe or execution receipt.”
- **Voice paths:** “Nova Sonic was not run; OpenAI `gpt-realtime-2.1` has client-secret
  access verified, but browser WebRTC is not implemented and no realtime voice path is
  demonstrated.”
- **Custody:** “Self-hashed FCOs, edges, MMR roots, and checkpoints demonstrate
  deterministic local self-consistency, not identity, clinical truth, immutability,
  non-repudiation, or durable external custody.”
- **Deletion:** “Deletion resets ordinary browser state and generation-aware work, but
  does not prove cancellation of every asynchronous callback, verified erasure, or
  deletion from browser vendors, server memory, logs, caches, backups, model providers,
  or cloud systems.”

Roles, room IDs, and review controls are user-selected and unauthenticated. Use only
synthetic material; never call a room private, secure, authorized, or HIPAA compliant.

## RECORDED FALLBACK — exactly 60 seconds

Say first: “The local live backend is unavailable, so this is a clearly labeled,
60-second recorded synthetic replay—not a current model invocation or synchronized room.”

1. Open `replay.html` and play the complete **60-second** video.
2. The replay tells the same narrow story: Julie did not complete Leo’s evaluation; Maya
   needs clarity that the second visit continues evaluation; Julie reviews evidence and
   uncertainty; and the handoff states Today, Next, Who, and When.
3. With the remaining two minutes, open `models.html` or `slides.html` and state the
   exact claim ceiling above. The recording does not prove a local gate, Bedrock call,
   room synchronization, or model execution.

## Recovery lines

- **Static Pages only:** “This public URL is the static presentation surface; the local
  backend and model endpoints are not deployed here.”
- **Local model unavailable:** “The laptop/server gate is unavailable or using its
  deterministic minimization fallback; no on-phone inference or automatic remote
  escalation is being claimed.”
- **Bedrock unavailable:** “Remote text is unavailable, so we retain the synthetic
  review boundary rather than fabricate a result.”
