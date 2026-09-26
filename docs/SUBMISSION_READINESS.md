# Submission readiness

Audit date: 2026-09-26 (America/Los_Angeles)

Scope: `TEAM.md`, `SUBMISSION.md`, `README.md`, the current implementation, and
read-only checks of the public demo, repository, and linked issue titles. This file
records readiness; it does not change the submission source documents.

## Deadline accuracy

**Team-provided deadline: 3:00 PM Pacific on 2026-09-26.** This time came from team
coordination supplied during implementation; it was not independently verified against
an organizer site. Submitter confirmation remains required.

Issue mapping is now aligned: issue 1 submission, issue 2 slides/video, and issue 3 AWS
hosting.

## Presentation

### Completed

- A three-minute pitch/run-of-show exists in `PITCH.md`.
- The pitch states the clinician-review boundary and uses a fictional encounter.
- The repository contains an architecture description, safety material, and a narrow
  Bedrock smoke receipt that can be shown as supporting evidence.
- The public static demo and public repository both returned HTTP 200 during this audit.

### Missing or not verified

- Public slide and replay paths are prepared but must be verified after the final push.
- No authoritative presentation slot, duration confirmation, check-in time, or time zone
  appears in the audited documents.
- The final deck was checked locally for legibility and claim boundaries; logged-out
  public verification remains pending until deployment.
- The presentation must not imply that current local, uncommitted functionality is in
  the public deployment.

## Live demo

### Completed and supportable

- The public static browser demo is reachable:
  <https://biobitworks.github.io/carescribe/>.
- The deployed page labels itself as a fictional, non-diagnostic demonstration, exposes
  clinician-review concepts, uses local browser storage, and offers local-session
  deletion.
- The committed implementation contains browser speech-recognition support with a
  fictional fallback, explicit speaker-role controls, evidence-linked observations,
  follow-up questions, clinician approval controls, local persistence, and local deletion.
- The Python implementation has an Amazon Bedrock Runtime `Converse` boundary.
- `validation/bedrock-smoke.json` supports exactly one successful synthetic Amazon
  Bedrock invocation on 2026-09-26. It does not support an end-to-end deployment claim.
- Verification during this audit passed 44 Python tests with
  `PYTHONPATH=src PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q` and 11 JavaScript tests with
  `node --test web/fco-core.test.mjs`.

### Missing, local-only, or unsafe to claim

- AWS-hosted end-to-end operation is not implemented or evidenced. The public URL is a
  static hosting fallback and must not be called AWS-hosted.
- The public static demo is not connected to Bedrock or a clinical system.
- Current changes remain local until the final commit, push, and Pages run complete.
- Full-duplex voice is not implemented. Do not claim real-time duplex voice, a voice
  fallback, or production voice-agent operation.
- `/api/health` statuses are evidence metadata, not live probes. Use the committed
  LiquidAI benchmark, Nova Micro receipt, local Nova Pro route observation, and explicit
  Nova Sonic/OpenAI limitations.
- Browser speech recognition is browser/vendor dependent; transcription quality,
  diarization accuracy, biometric protections, and stop behavior have not been clinically
  or independently validated.
- Browser-local deletion does not prove deletion from vendors, logs, caches, backups, or
  cloud systems.
- There is no authentication, tenant isolation, EHR integration, clinical export, or
  production audit trail.
- A normal bare `pytest` invocation is not currently reproducible in this machine’s global
  environment because an unrelated auto-loaded plugin fails. The explicit clean command
  above passes; use an isolated project environment for the final rehearsal.

## Replay / backup demo

### Completed locally

- A 60-second H.264/AAC replay with captions and three distinct synthetic voices exists.
- Separate replay and presentation pages are implemented.
- The replay is labeled as recorded synthetic fallback, not current model execution.

### Still required

- Verify the final replay and page bytes from a logged-out public browser after deploy.

## Exact submission claims

### Claims safe to make now

- “CareScribe is an early prototype for clinician-reviewed documentation support using
  simulated content.”
- “The public demonstration is a static browser workflow and is not connected to clinical
  systems.”
- “The repository implements an Amazon Bedrock Runtime `Converse` inference boundary.”
- “One synthetic Bedrock smoke invocation succeeded on 2026-09-26.”
- “The browser workflow includes explicit speaker roles, evidence-linked draft
  observations, follow-up prompts, review controls, browser-local persistence, and
  browser-local deletion.”
- “Outputs are drafts requiring clinician review; the prototype does not autonomously
  diagnose, prescribe, refer, or choose treatment.”

### Claims that are missing evidence or must not be made

- AWS-hosted application or AWS-hosted end-to-end workflow.
- Production-ready, clinically validated, secure, private, safe, accurate, or reliable.
- HIPAA compliant, HIPAA certified, HIPAA ready, or suitable for protected health
  information.
- Accurate speaker identification, validated diarization, or biometric privacy.
- Full-duplex or real-time voice-agent operation.
- EHR integration, chart submission, production authentication, verified cloud deletion,
  or production auditability.
- Multiple model paths “live verified” based only on the single-model smoke receipt.
- Clinical benefit, reduced documentation time, improved outcomes, or diagnostic accuracy
  as measured results. These are future evaluation goals, not demonstrated findings.

## Final-link checklist

- [ ] Confirm the official submission deadline, time zone, and presentation schedule from
  the authoritative event source.
- [ ] Open the public demo from a private/logged-out browser and complete the exact
  presentation path using fictional content.
- [ ] Open the repository link from a private/logged-out browser.
- [ ] Replace the slide placeholder with a final judge-accessible link.
- [ ] Replace the backup-video placeholder with a final judge-accessible link.
- [ ] Test slide and video links from a private/logged-out browser with no access request.
- [ ] Download the backup video locally and verify playback without network access.
- [ ] Confirm every QR code resolves to the intended final public link.
- [ ] Confirm the submitted demo is the same deployed revision rehearsed by the team.
- [ ] Remove every placeholder from submitted copy, slides, and presenter notes.
- [ ] Check that no submitted artifact contains credentials, access tokens, private
  configuration, real patient information, protected health information, identifying
  recordings, private contact details, or internal access values.
- [ ] Ensure the final form is submitted once by an authorized team representative and
  retain a non-sensitive submission confirmation.

## HIPAA wording guardrail

Use:

> This is a simulated-data prototype and does not claim HIPAA compliance. It must not
> receive protected health information. Any clinical deployment would require a
> context-specific legal, privacy, security, vendor, and organizational review, including
> applicable agreements and technical and administrative safeguards.

Do not use “HIPAA certified,” “HIPAA compliant,” “HIPAA ready,” “HIPAA-safe,” or “meets
HIPAA requirements.” A cloud service’s eligibility, a business associate agreement, or
use of encryption alone does not establish compliance, product safety, or authorization
to process protected health information.
