# CareScribe: 3-minute pitch and demo run-of-show

> Use simulated encounter content only. The public Pages build is static; use
> `http://127.0.0.1:8080/voice.html` plus the local bridge for live Nova Sonic proof and
> label the replay when used.

## 0:00–0:25 — Problem

**Speaker:** Julie

“A clinical conversation can be rich and human, but converting it into clear
documentation creates extra cognitive and administrative work. That burden can pull a
clinician’s attention away from the patient. CareScribe explores a focused question: can
AI help organize a simulated encounter into a useful draft while keeping the clinician
firmly in control?”

**On screen:** Title slide: “CareScribe — more attention for care, less for clerical work.”

## 0:25–0:45 — Product and safety boundary

**Speaker:** Byron

“CareScribe is clinician-reviewed documentation support. It is not a medical device, and
it does not autonomously diagnose, prescribe, choose treatment, or replace clinical
judgment. Its job is to help turn encounter information into a draft that a clinician
must review, edit, and approve.”

**On screen:** Three labels: “Draft,” “Clinician review,” “Human decision.”

## 0:45–1:50 — Live demo

**Driver:** Byron
**Narrator:** Julie

1. **0:45–0:55 — Open**

   “Here is the supervised laptop-local CareScribe voice demo. The public link is our
   judge-accessible static interaction and evidence package.”

   Open http://127.0.0.1:8080/voice.html after running `./scripts/demo-doctor.sh`.

2. **0:55–1:15 — Provide simulated input**

   “We’ll use a fictional encounter—no patient data or protected health information.”

   Start a consented simulated session with Julie, Maya, and Leo. Use the prepared
   fictional transcript fallback, or say: “Is the next visit therapy, or more
   evaluating? What should I notice at home?”

3. **1:15–1:35 — Generate**

   “CareScribe first uses the laptop-local privacy gate. Only a caregiver-approved,
   minimized room event is sent to the atomization path.”

   Show the transcript and switch among provider, caregiver, child, and uncertain roles.
   Use `projector.html` for the shared story and `models.html` for exact route status.
   If using the public static build, say that it does not call the local or AWS backend.

4. **1:35–1:50 — Review**

   Show the evidence-linked observation cards and follow-up questions, then approve one
   observation as the clinician and say:

   “The result is explicitly a draft. The clinician reviews and edits it; CareScribe
   does not make the clinical decision.”

## 1:50–2:15 — What is validated

**Speaker:** Byron

“Under the hood, LiquidAI LFM2.5 runs on the laptop for the synthetic privacy-gate path;
Nova Micro and Nova Pro use Amazon Bedrock for event atomization and handoff review; and
Nova 2 Sonic provides the local bidirectional voice path. We committed bounded receipts
for synthetic model and bridge checks. Voxtral Mini also transcribed our consented team
rehearsal recordings as a media workflow. Those receipts prove only the recorded
checks—not physical-microphone reliability, clinical validity, public availability,
security completeness, or compliance.”

**On screen:** Architecture slide or `validation/bedrock-smoke.json`.

## 2:15–2:45 — Impact and path forward

**Speaker:** Julie

“The near-term opportunity is to reduce documentation time and correction burden while
preserving clinician oversight. Next, we would co-design with clinicians, evaluate note
quality and usability on consented or synthetic data, measure time saved and edits
required, and complete the privacy, security, auditability, integration, and regulatory
work needed before any clinical use.”

## 2:45–3:00 — Close

**Speaker:** Byron

“CareScribe keeps the promise deliberately narrow: AI helps structure the draft; the
clinician owns the judgment. Our goal is more attention available for care, with a clear
human review boundary at every step.”

**On screen:** Project name, repository, and QR code/link:
https://github.com/biobitworks/carescribe

## Demo fallback plan

If the deployed app fails, say: “The live interface is unavailable, so we’ll use our
recorded path and show the validated inference evidence rather than imply a successful
live workflow.”

1. Switch immediately to
   https://biobitworks.github.io/carescribe/replay.html.
2. If the video also fails, show pre-captured screenshots of the simulated workflow:
   https://biobitworks.github.io/carescribe/slides.html.
3. Open `validation/bedrock-smoke.json` in the repository and explain its narrow claim:
   one successful synthetic Bedrock `Converse` call.
4. Show `src/carescribe/bedrock.py` and `tests/test_bedrock.py` to establish the Bedrock
   boundary and offline request-shape coverage.
5. Never describe screenshots, a recording, mocked tests, or the smoke receipt as a
   currently live end-to-end demo.

## Five-minute preflight

- [ ] Team names and speaking roles are assigned.
- [ ] All placeholders are resolved.
- [ ] Local room and Sonic services pass `./scripts/demo-doctor.sh`; public static links
  open from a logged-out browser.
- [ ] Only simulated, non-PHI content is loaded.
- [ ] Slides and video open without requesting access.
- [ ] Backup video is downloaded locally as well as linked.
- [ ] Browser zoom, notifications, credentials, and unrelated tabs are handled.
- [ ] A timer is visible to a non-speaking teammate.
- [ ] Speakers can state the safety boundary without qualification: clinician-reviewed
  documentation support; never autonomous diagnosis or prescription.
