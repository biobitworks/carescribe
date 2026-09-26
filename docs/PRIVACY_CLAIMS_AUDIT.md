# Privacy and Security Claims Audit

Re-audit date: 2026-09-26 (America/Los_Angeles)
Repository baseline: `f17929a51c05`, including the current shared worktree
Overall status: **NOT APPROVED for PHI, production privacy/security, or HIPAA claims**

This source-and-test re-audit focuses on the repaired room contract, local-gate
label, custody replay, and browser deletion lifecycle. It does not assess an
external deployment, AWS account configuration, contracts, or organizational
controls. Line references are to the audited worktree and may move after edits.

## Rating method and revised counts

- **PROVEN**: directly implemented and supported by focused source or test
  evidence, limited to the exact wording stated.
- **PARTIAL**: a mechanism exists, but a material enforcement boundary or
  guarantee remains missing.
- **NOT IMPLEMENTED**: no enforcing product mechanism exists, or current
  behavior contradicts the claim.

Ten implementation claims were audited: **3 PROVEN, 3 PARTIAL, and 4 NOT
IMPLEMENTED**. The prior room contract failure is fixed, browser deletion has
improved from NOT IMPLEMENTED to PARTIAL, and startup custody replay is now
implemented. No statistical claims, p-values, DOI citations, or PMID citations
are in scope.

## Claim-to-evidence matrix

| Topic and exact audited claim | Rating | Repository evidence | Exact claim ceiling |
|---|---|---|---|
| **LocalStorage persistence:** the browser serializes and restores client session state in same-origin `localStorage`. | **PROVEN** | State includes transcript, observations, participant labels, custody data, room identifier, and handoff review (`web/app.js:54-75`). It is loaded and saved as one JSON value (`web/app.js:79-96`), updated after transcript capture (`web/app.js:391-403`), and saved on unload (`web/app.js:1141-1147`). | May claim browser-local persistence. Must not claim encryption, isolation from scripts/extensions or other browser-profile users, automatic expiry, minimum retention, or secure storage. |
| **Browser deletion lifecycle:** delete resets current browser state and ledger and invalidates every queued operation. | **PARTIAL** | Delete increments a generation, removes the storage key, replaces state and the in-memory ledger, resets chain variables, and clears pending room state (`web/app.js:811-825`). Generation checks reject stale transcript-custody, local-gate, and remote-atomization results (`web/app.js:401-412`, `web/app.js:457-493`, `web/app.js:561-584`). However, assigning new Promise-chain variables does not cancel callbacks already attached to old chains. Actor initialization and model-checkpoint callbacks have no generation check (`web/app.js:299-334`), and startup replay is also not generation-bound (`web/app.js:1152-1160`). | May claim browser-state/ledger reset plus generation guards on the named paths. Must not claim cancellation of every asynchronous custody operation, verified erasure, or deletion from speech/model providers, logs, caches, backups, or other copies. |
| **Room publication field contract:** the client emits the required public fields plus `synthetic: true`, and the server rejects missing, false, or extra fields. | **PROVEN** | The client publication helper emits only the bounded contract (`web/fco-core.js:166-179`). The server requires the public fields, permits only those plus `synthetic`, requires that flag to be true, and stores only the public event projection (`src/carescribe/live_server.py:24-25`, `src/carescribe/live_server.py:256-297`). Focused tests cover the client shape, accepted server shape, and rejection of private/raw/identity extras (`web/fco-core.test.mjs:113-135`, `tests/test_live_server.py:140-200`). | May claim syntactic room-payload minimization and extra-field rejection for this endpoint. Must not claim semantic de-identification, content safety, provenance, authorization, or confidentiality. |
| **Authenticated/private room joins:** a participant securely joins a private room. | **NOT IMPLEMENTED** | There is no join or membership protocol. A URL room identifier selects client state (`web/app.js:236-249`); any caller can read events through GET (`src/carescribe/live_server.py:226-237`) or submit a syntactically accepted event through POST (`src/carescribe/live_server.py:240-297`). Polling uses only the room identifier (`web/app.js:611-632`). The default loopback bind limits default exposure but is not authentication (`src/carescribe/live_server.py:377-380`). | May claim an in-memory, identifier-keyed demo feed when the server is locally reachable. Must not claim private, authenticated, authorized, tenant-isolated, confidential, or access-controlled rooms. |
| **Actor authorization:** provider, caregiver, and child actions are bound to authorized identities and roles. | **NOT IMPLEMENTED** | Any browser user can switch roles (`web/app.js:858-864`); the server trusts any allowlisted role in the submitted body (`src/carescribe/live_server.py:272-285`); and actor custody validates only role vocabulary (`web/fco-core.js:292-299`). Observation and handoff approvals remain unauthenticated client-side toggles (`web/app.js:903-912`, `web/app.js:1117-1138`). | May claim user-selected temporary role labels and local review controls. Must not call them identity, authentication, authorization, guardian consent, clinician signatures, or attributable audit events. |
| **Bedrock payload boundary:** every Bedrock call receives only an approved, minimized, privacy-validated payload. | **PARTIAL** | The approved atomization path sends only the pending public update after room approval (`web/app.js:527-568`). The server also limits body size/tasks, requires a client-supplied synthetic flag, builds a text prompt, and invokes Bedrock Runtime server-side (`src/carescribe/live_server.py:21-25`, `src/carescribe/live_server.py:240-255`, `src/carescribe/live_server.py:326-355`, `src/carescribe/bedrock.py:52-78`). The handoff synthesis path still assembles and sends the full role-tagged transcript (`web/app.js:1089-1094`). There is no authentication, content inspection, identifier redaction, DLP, or server-verifiable synthetic-data provenance. | May claim a minimized approved atomization path and a server-side Bedrock `Converse` boundary. Must also disclose the full-transcript synthesis path. Must not claim a PHI-safe, de-identified, minimum-necessary, access-controlled, region-governed, or compliance-validated boundary. |
| **Local versus phone inference:** the privacy gate is correctly labeled and exact input remains on the phone until approval. | **NOT IMPLEMENTED** | The response now accurately labels the boundary `local-laptop` (`src/carescribe/live_server.py:313-323`), and the focused test asserts it (`tests/test_live_server.py:89-134`). Before approval, however, the browser sends role, speaker label, and exact text to the Python server (`web/app.js:468-480`), whose optional model call uses loopback on the server host (`src/carescribe/live_server.py:46-78`). | May claim a server-host/laptop-local privacy gate. Must not claim on-device/on-phone inference, that exact text never leaves a phone, or that raw content crosses no browser-to-server boundary. Browser-provided speech recognition is not demonstrated to be device-only. |
| **Custody checkpoint semantics:** persisted FCOs and edges replay at startup into an immutable, attributable chain of custody. | **PARTIAL** | Startup now re-appends persisted FCOs, restores edges, reconstructs the predecessor pointer, and persists the replayed ledger (`web/app.js:1152-1160`). Core replay is deterministic in the focused test (`web/fco-core.test.mjs:210-224`). Canonical self-hashes, the MMR, and linked checkpoints are implemented (`web/fco-core.js:65-129`, `web/fco-core.js:206-289`). The records remain unsigned, locally rewriteable, unanchored, and unbound to authenticated actors or a trusted clock. | May claim verified local replay and a deterministic hash/MMR checkpoint demonstrator relative to a previously trusted root. Must not claim immutability, non-repudiation, identity, truth, external timestamping, anti-rollback protection, durable provenance, or production chain of custody. |
| **Amazon Bedrock AgentCore status:** AgentCore is implemented or running as part of CareScribe. | **NOT IMPLEMENTED** | Outside this audit, the only repository mention is a developer command for registering an AgentCore MCP server (`docs/AGENT_TOOLKIT.md:11-24`). Product dependencies and entry points contain no AgentCore runtime (`pyproject.toml:11-18`); the product path invokes Bedrock Runtime directly (`src/carescribe/bedrock.py:52-78`). | May claim optional AgentCore developer-tool setup notes. Must not claim an AgentCore runtime, deployment, agent, gateway, memory, identity, policy, observability, evaluation, or product integration. External account state was not assessed. |
| **Exact repository claim ceiling:** the bounded language below is the strongest privacy/security description supported by this worktree. | **PROVEN** | This ceiling follows from the nine implementation findings above and the repository’s synthetic-only limitation (`docs/PRIVACY_THREAT_MODEL.md:3-7`). | Broader privacy, security, custody, phone-inference, deletion, or compliance language exceeds current evidence. |

## Fix disposition

- **Room client/server contract — verified fixed.** The emitted client shape and
  accepted server allowlist now align; focused positive and negative tests pass.
- **Local-gate label — verified fixed.** The API and test now say
  `local-laptop`. This corrects the label but does not create phone inference.
- **Startup FCO/edge replay — verified implemented.** Replay restores the local
  working ledger and verifies each FCO as it is appended. It does not create an
  external custody anchor.
- **Delete reset/generation — materially improved, still PARTIAL.** Ordinary
  state, the active ledger, pending updates, and generation-aware work are reset.
  Old Promise callbacks are not canceled merely by replacing the chain
  variable, and not every custody callback carries the generation.

## Residual highest-severity findings

### H-1 — Rooms and actor actions remain unauthenticated

Anyone who can reach the server and knows or guesses a room identifier can read
the room or submit an event by asserting `synthetic: true`. Roles and approvals
are browser-selected labels, not authenticated identities. The repaired payload
allowlist reduces exposed fields but does not prevent disclosure, injection,
role spoofing, or approval spoofing.

### H-2 — Full transcripts still cross the Bedrock boundary

The post-approval atomization path is minimized, but handoff generation sends
the complete assembled transcript to the Bedrock endpoint. The synthetic flag
is supplied by the same unauthenticated client and cannot detect sensitive
content. Redaction, DLP, minimum-necessary selection, and attributable approval
are not enforced.

### H-3 — The local privacy gate is server-hosted, not phone-resident

The corrected `local-laptop` label is accurate. Exact text and a speaker label
still leave the browser for the Python server before room-sharing approval.
This supports a laptop-local demo boundary, not an on-phone or no-network
privacy claim.

## Exact claim ceiling

The strongest supportable wording is:

> CareScribe is a synthetic-data prototype. The current local demo persists
> browser state in same-origin localStorage, replays self-hashed FCOs and edges
> into a local ledger, and resets ordinary browser state and generation-aware
> work on deletion. Its room API enforces a minimized public field shape, but
> rooms, roles, and review actions are unauthenticated. A local privacy gate runs
> on the Python server host/laptop, not demonstrably on a phone. One approved
> Bedrock atomization path is minimized, while handoff synthesis sends the full
> role-tagged transcript through a server-side Bedrock Runtime Converse path.
> Local hashes, MMR roots, and checkpoints demonstrate deterministic
> self-consistency, not identity, truth, immutability, durable custody, or
> non-repudiation. Amazon Bedrock AgentCore is not implemented.

Focused test PASS does not prove deployment security, provider configuration,
confidentiality, availability, deletion outside the browser, clinical safety,
or legal compliance. Health-response model statuses remain static metadata
rather than runtime probes (`src/carescribe/live_server.py:181-223`).

## Why HIPAA compliance cannot be claimed

HIPAA compliance is contextual and includes administrative, physical, and
technical safeguards plus organizational practices and, where applicable,
contracts and service configurations. It cannot be established by source code,
an eligible cloud service, encryption, a successful model call, or a business
associate agreement alone.

This repository still lacks evidence for authenticated access control, unique
attributable actors, tenant isolation, audited authorization, verified
end-to-end retention/deletion, deployment and vendor configuration, incident
response, risk analysis, workforce/process controls, and handling of protected
health information. The unauthenticated rooms, user-asserted roles and synthetic
flag, server-host boundary, and full-transcript synthesis path remain material
gaps.

Therefore the only supportable HIPAA wording is:

> This simulated-data prototype does not claim HIPAA compliance and must not
> receive protected health information. Any clinical deployment would require
> a context-specific legal, privacy, security, vendor, and organizational
> assessment and implementation of all applicable safeguards and agreements.

This is consistent with the repository limitation
(`docs/PRIVACY_THREAT_MODEL.md:43-45`) and deployment warning
(`docs/AWS_ARCHITECTURE.md:75-78`).

## Focused verification performed

- `PYTHONPATH=src PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q -p no:cacheprovider
  tests/test_live_server.py -k 'local_laptop_gate or shared_room'` — PASS
  (7 selected cases).
- `node --test --test-name-pattern='room publication|checkpoint replay'
  web/fco-core.test.mjs` — PASS (2 selected cases).
- Focused source tracing confirmed generation checks on transcript custody,
  local-gate response, and remote atomization paths, plus the unguarded custody
  callbacks identified above.
- Repo-wide AgentCore search found no product implementation evidence beyond
  the developer-tool note and this audit.

No full test suite or external service check was run for this re-audit.
