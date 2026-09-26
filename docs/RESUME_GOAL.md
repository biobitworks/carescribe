# CareScribe Deadline Resume Goal

Copy this prompt into a new Codex session if this session stops:

> Resume CareScribe in `/Users/byron/projects/active/carescribe`. Deliver a
> submission-ready synthetic pediatric speech-evaluation demo with three
> separate artifacts: (1) presentation materials, (2) a single-link live
> multi-device prototype, and (3) a narrated screenshot replay with distinct
> Julie, Maya, and narrator/child voices. Use the fictional “What Happened in
> There?” scenario. The caregiver handoff must clearly state Today, Next, Who,
> and When; the provider brief must preserve evidence source, uncertainty,
> incomplete evaluation, and follow-up needs. Keep local/private data separate
> from approved shared/public events. Every actor and model invocation must
> create a typed FCO and chained MMR checkpoint; session teardown must produce a
> lifecycle result. Show exact model, location, and evidence status.
> Never claim HIPAA compliance or “HIPAA-aligned” readiness. Say
> “simulated-data prototype, not approved for PHI.”
> Use synthetic data only. Never store or repeat workshop access codes,
> credentials, personal email addresses, or real patient information. Verify
> tests, logged-out links, phone/laptop behavior, screenshots, audio/video, and
> deletion. Update `TEAM.md`, `SUBMISSION.md`, and `README.md` only from current
> evidence. Commit and push only after secret scanning and final review.

## Delivery ledger

### Presentation

- Problem: the clinician cannot both evaluate, reassure, document, and stay on
  schedule; the caregiver leaves unsure what happened.
- Story: incomplete evaluation, known observations, unresolved questions, and
  clear next actions.
- Boundaries: clinician-reviewed documentation support; no diagnosis or
  autonomous treatment recommendation.

### Live prototype

- Separate Provider, Caregiver, Child, Projector, Models, Replay, and Presentation URLs.
- Named roles, device-controlled microphone, uncertain-speaker fallback.
- Local LiquidAI privacy gate and approved minimized room events.
- Visible model/runtime status and per-event custody checkpoints.
- Caregiver Action Card and Provider Evidence Brief.
- Explicit browser-session close and local deletion, with external deletion limits.

### Replay

- 60-second synthetic video made from verified screenshots.
- Distinct voices for Julie, Maya, and narrator/child.
- Captions and no real patient images, voices, or information.
- Scripted fallback clearly labeled whenever live inference is unavailable.

## Current verified baseline

- Local LiquidAI LFM2.5 1.2B Instruct invocation and benchmark receipt.
- Live Nova Micro and Nova Pro synthetic invocations.
- OpenAI `gpt-realtime-2.1` client-secret access verified; browser WebRTC
  integration is not yet complete.
- Typed actor/model FCOs and chained browser checkpoints implemented.
- Caregiver/provider handoff UI implemented.
- Python and browser test suites pass with third-party pytest plugin autoload
  disabled.

## Do not mark complete until

- The published HTTPS link contains the current source, not an older static
  build.
- Three isolated browser/device contexts exchange only approved public events.
- Full-duplex voice is demonstrated or explicitly labeled as scripted fallback.
- The replay video and presentation links open while logged out.
- Repository secret scan is clean and no access code appears in tracked files.
- Final commit is pushed and all submission claims match receipts.
