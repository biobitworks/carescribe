# CareScribe failure and gap matrix

Audit date: 2026-09-26 (America/Los_Angeles)

Current result: **5 gates complete, 5 partial.** The prototype is ready for a
synthetic presentation and laptop-local Nova Sonic rehearsal. It is not yet a
live, private, three-device production voice room.

| Gate | Status | Failure or evidence gap | Smallest fill | Required proof |
|---|---|---|---|---|
| 1. LiquidAI install and benchmark | **Complete, operational warning** | The exact model is installed and a retry succeeded, but the first request timed out. The local router currently reports stale selection evidence and high swap use. | Preload LiquidAI before the demo and keep the deterministic fail-closed minimizer. Refresh the router benchmark after the submission-critical path. | Exact model name in `ollama ps`, a bounded invocation receipt, latency, and a visible current-runtime status. |
| 2. Three-device named room | **Partial** | Provider, caregiver, and child names/roles exist in the UI, but no reachable authenticated room accepts three physical devices. | Deploy one HTTPS room origin, add participant authentication and room membership, and route every page to it. | Three isolated physical devices join one room; unauthorized and wrong-room clients are rejected. |
| 3. Approved public transcript sync | **Partial** | Approved minimized events synchronize only through one laptop Python process using two-second polling. There is no acknowledgement, reconnect, ordering, deduplication, or shared store. | Add WSS/SSE transport, server event sequence IDs, acknowledgement/replay, expiry, and a shared store. | Disconnect/reconnect test preserves order with no duplicates; private fields never appear in network captures. |
| 4. Nova Sonic full duplex | **Complete for local synthetic proof** | Strands bidirectional invocation, local WebSocket bridge, browser PCM transport/playback, interruption handling, consent, mute/stop, and content-free counters are implemented. Generated-PCM invocation and bridge receipts pass. Physical-microphone reliability, public deployment, three-device operation, and clinical validity remain unproven. | Run and retain a physical-microphone browser receipt, then deploy an authenticated bridge if public voice is required. | `validation/nova-sonic-smoke.json`, tests, local recording, and a future content-free physical-mic receipt. |
| 5. Private/public boundary | **Partial** | The local gate and minimized room schema reject extra fields. There is no participant authorization, semantic de-identification, provider-side erasure, or on-phone model. Nova Sonic would send raw audio to AWS by design. | Authenticate rooms, enforce policy server-side, minimize before room publication, document the separate Sonic audio boundary, and implement deletion propagation. | Adversarial payload and cross-room tests, packet inspection, authorization tests, and deletion receipts. |
| 6. Caregiver/provider cards | **Complete** | No blocking implementation gap. Clinical usefulness has not been validated. | Keep caregiver Today/Next/Who/When and provider source/uncertainty/incomplete-evaluation fields in the scripted demo. | Browser screenshots and scenario assertions. |
| 7. Projector dashboard/avatar | **Complete as presentation** | The voice-page avatar now follows local Sonic listening, audio start, interruption, and stop events; the separate projector remains a presentation surface. | Preserve the distinction between voice runtime and projector summary. | UI state tests plus local bridge demonstration. |
| 8. Synthetic replay video | **Complete** | No live-model claim is supported by the replay. | Keep it labeled recorded synthetic fallback. | Logged-out playback, 60-second duration, audio/video/caption decode, and byte match. |
| 9. Multi-context verification | **Partial** | Desktop/mobile static and local text paths were verified. Three physical phones, real microphone streaming, WSS reconnect, barge-in, and concurrent load were not. | Run the Gate 2–4 acceptance tests on a laptop plus two phones and archive redacted screenshots/receipts. | Three-device screenshots, console/network logs, interruption evidence, and a repeatable stress report. |
| 10. Package, push, final link | **Partial** | Source, tests, replay, commit, push, and public HTTPS static link exist. The link has no room or voice backend. | Deploy the backend and point the public frontend at it without weakening the static fallback. | Logged-out HTTPS join link completes join, consent, duplex turn, approved sharing, handoff, and teardown. |

## Infrastructure and tooling failures

- The current AWS workshop role can list the Nova 2 Sonic model but cannot list
  AgentCore runtimes or CloudFormation stacks. An AgentCore/CloudFront deployment
  therefore needs additional IAM authority or a separately authorized deployer.
- GitHub Pages is static hosting and cannot run the required persistent WebSocket
  or Python service.
- Three requested parallel model agents failed independently of the CareScribe
  product: one model identifier returned 404 and two model subscriptions returned
  401. A fourth agent was stopped after producing no result. No subagent output was
  treated as evidence.
- Browser deletion clears CareScribe browser state. It does not prove erasure from
  browser speech vendors, process memory, model providers, logs, caches, or backups.
- Browser FCO/MMR checkpoints provide local tamper evidence and lineage. They are
  not an externally anchored, durable chain of custody and do not establish that
  an observation is true.

## Fill order

1. Add authenticated WSS rooms with acknowledgement/reconnect and a shared store.
2. Verify a physical microphone plus one laptop and two phones, including interruption
   and deletion.
3. Deploy through an authorized public path and re-run the logged-out acceptance flow.
4. Complete representative usability, clinical-safety, privacy, and security evaluation.

Until all five steps pass, use this exact boundary:

> Synthetic presentation and laptop-local rehearsal; static public fallback. Not
> approved for PHI, not HIPAA compliant, and not a production clinical system.
