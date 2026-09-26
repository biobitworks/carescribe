# CareScribe failure and gap matrix

Audit date: 2026-09-26 (America/Los_Angeles)

Current result: **4 gates complete, 5 partial, 1 missing.** The prototype is
ready for a synthetic presentation and laptop-local rehearsal. It is not yet a
live, private, three-device voice room.

| Gate | Status | Failure or evidence gap | Smallest fill | Required proof |
|---|---|---|---|---|
| 1. LiquidAI install and benchmark | **Complete, operational warning** | The exact model is installed and a retry succeeded, but the first request timed out. The local router currently reports stale selection evidence and high swap use. | Preload LiquidAI before the demo and keep the deterministic fail-closed minimizer. Refresh the router benchmark after the submission-critical path. | Exact model name in `ollama ps`, a bounded invocation receipt, latency, and a visible current-runtime status. |
| 2. Three-device named room | **Partial** | Provider, caregiver, and child names/roles exist in the UI, but no reachable authenticated room accepts three physical devices. | Deploy one HTTPS room origin, add participant authentication and room membership, and route every page to it. | Three isolated physical devices join one room; unauthorized and wrong-room clients are rejected. |
| 3. Approved public transcript sync | **Partial** | Approved minimized events synchronize only through one laptop Python process using two-second polling. There is no acknowledgement, reconnect, ordering, deduplication, or shared store. | Add WSS/SSE transport, server event sequence IDs, acknowledgement/replay, expiry, and a shared store. | Disconnect/reconnect test preserves order with no duplicates; private fields never appear in network captures. |
| 4. Nova Sonic full duplex | **Missing / critical path** | `amazon.nova-2-sonic-v1:0` is active in the account, but CareScribe has no bidirectional stream, browser PCM transport, barge-in handling, or audio receipt. Python `boto3` does not expose the bidirectional method. | Use the official Strands bidirectional agent or AWS Node SDK bridge with server-side credentials, 16 kHz mono PCM, consent, mute/stop, and no raw-audio logging. | A synthetic browser microphone turn receives transcript and audio, handles interruption, then closes the stream; receipt identifies exact model and region. |
| 5. Private/public boundary | **Partial** | The local gate and minimized room schema reject extra fields. There is no participant authorization, semantic de-identification, provider-side erasure, or on-phone model. Nova Sonic would send raw audio to AWS by design. | Authenticate rooms, enforce policy server-side, minimize before room publication, document the separate Sonic audio boundary, and implement deletion propagation. | Adversarial payload and cross-room tests, packet inspection, authorization tests, and deletion receipts. |
| 6. Caregiver/provider cards | **Complete** | No blocking implementation gap. Clinical usefulness has not been validated. | Keep caregiver Today/Next/Who/When and provider source/uncertainty/incomplete-evaluation fields in the scripted demo. | Browser screenshots and scenario assertions. |
| 7. Projector dashboard/avatar | **Complete as presentation** | The avatar is animated presentation UI, not a live duplex orchestrator. | Connect avatar speaking/listening state only after Gate 4 emits real stream events. | UI state follows actual audio start, interruption, and stop events. |
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

1. Build and prove the local Nova Sonic bridge with synthetic audio.
2. Add authenticated WSS rooms with acknowledgement/reconnect and a shared store.
3. Bind stream events to the avatar and approved transcript pipeline.
4. Verify one laptop plus two phones, including interruption and deletion.
5. Deploy through an authorized AWS path and re-run the logged-out acceptance flow.

Until all five steps pass, use this exact boundary:

> Synthetic presentation and laptop-local rehearsal; static public fallback. Not
> approved for PHI, not HIPAA compliant, and not a production clinical system.
