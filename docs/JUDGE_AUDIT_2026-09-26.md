# Independent judge audit — 2026-09-26

Six parallel read-only reviews assessed the required submission and five equally
weighted judging criteria against the repository, public site, videos, deck, tests, and
receipts. Scores are evidence-based estimates, not official judge results.

| Criterion | Score | Verified strengths | Main gap |
| --- | ---: | --- | --- |
| Problem significance and potential impact | 3/5 | Specific incomplete pediatric-evaluation handoff; distinct caregiver and provider needs | No user-discovery evidence, baseline, or measured benefit |
| Innovation and use of AI | 4/5 | Bounded multi-model roles, local/cloud split, uncertainty preservation, and provenance | No single comparative evaluation or unified end-to-end model receipt |
| Technical execution | 4/5 | Local room and Sonic services, 52 Python tests, 23 browser tests, signed artifacts, replay/deck package | Public deployment is static; no authenticated production room |
| Real-world viability | 3/5 | Clear clinical-review boundary and plausible SLP workflow | Buyer discovery, pilot evidence, production controls, and cost model remain future work |
| Strength of demonstration | 4/5 | Three roles, clear outputs, local capture, 60-second fallback, team rehearsal, and runbook | Public experience cannot demonstrate live models and remains information-dense |
| **Estimated total** | **18/25** | Strong one-day prototype with unusually explicit evidence ceilings | Impact and viability need external validation |

## Submission-form audit

Fields 1–8 are present. All submitted public links returned HTTP 200 in logged-out-style
checks. No Tandem or OpenScribe names, code, or claims were found in tracked submission
copy; those projects remain examples only.

The final hackathon confirmation is intentionally not marked complete in
`SUBMISSION.md`. An authorized team representative must confirm ownership, licensing,
and the exact form attestation before submission.

## Claim-lint corrections applied

- Unified the project name as **CareScribe**.
- Replaced measured-benefit implications with hypotheses and proposed metrics.
- Reconciled stale “Nova Sonic not run” text with the bounded committed receipt.
- Distinguished public static presentation from supervised laptop-local model services.
- Labeled actor roles as manually selected, not speaker identification.
- Added Voxtral as a receipt-backed media workflow, not the live runtime.
- Narrowed Nova Pro from “live verified” to “synthetic route observed; prose untrusted.”
- Preserved the no-PHI, no-HIPAA-compliance, no-clinical-validation boundaries.

## Highest-value next evidence

1. Obtain team ownership/licensing confirmation and submit the form.
2. Run a no-PHI formative study with 5–8 pediatric SLPs and scripted encounters.
3. Measure documentation time, edits, unsupported statements, source attribution, and
   caregiver recall of Today / Next / Who / When.
4. Add a content-free physical-microphone receipt.
5. Treat authentication, tenant isolation, retention/deletion, EHR integration, and
   clinical/privacy/security evaluation as deployment gates.
