# CareScribe: 3-minute pitch and demo run-of-show

> Use simulated encounter content only. Before presenting, replace every bracketed item.
> Do not make any line marked `[VERIFY BEFORE CLAIMING]` unless it has been demonstrated
> successfully in the final deployed build.

## 0:00–0:25 — Problem

**Speaker:** [NAME]

“A clinical conversation can be rich and human, but converting it into clear
documentation creates extra cognitive and administrative work. That burden can pull a
clinician’s attention away from the patient. CareScribe explores a focused question: can
AI help organize a simulated encounter into a useful draft while keeping the clinician
firmly in control?”

**On screen:** Title slide: “CareScribe — more attention for care, less for clerical work.”

## 0:25–0:45 — Product and safety boundary

**Speaker:** [NAME]

“CareScribe is clinician-reviewed documentation support. It is not a medical device, and
it does not autonomously diagnose, prescribe, choose treatment, or replace clinical
judgment. Its job is to help turn encounter information into a draft that a clinician
must review, edit, and approve.”

**On screen:** Three labels: “Draft,” “Clinician review,” “Human decision.”

## 0:45–1:50 — Live demo

**Driver:** [NAME]  
**Narrator:** [NAME]

1. **0:45–0:55 — Open**

   “Here is the public CareScribe Live browser demo.”

   Open https://biobitworks.github.io/carescribe/ after verifying the deployment.

2. **0:55–1:15 — Provide simulated input**

   “We’ll use a fictional encounter—no patient data or protected health information.”

   Start a consented simulated session. Use the prepared fictional transcript fallback,
   or live speech in a supported browser with: “Mom reports that Maya uses short phrases
   at home. Maya says, more bubbles.”

3. **1:15–1:35 — Generate**

   “CareScribe sends this content through our Amazon Bedrock inference boundary.”

   Show the transcript populating and switch among provider, caregiver, child, and
   uncertain speaker roles. Explain that this static demo does not call Bedrock; the
   separately tested Bedrock boundary is shown in the repository.

4. **1:35–1:50 — Review**

   Show the evidence-linked observation cards and follow-up questions, then approve one
   observation as the clinician and say:

   “The result is explicitly a draft. The clinician reviews and edits it; CareScribe
   does not make the clinical decision.”

## 1:50–2:15 — What is validated

**Speaker:** [NAME]

“Under the hood, all implemented AI inference crosses one boundary: Amazon Bedrock
Runtime’s `Converse` API through `boto3`. We added offline tests for the exact request
shape and configuration checks. We also committed a receipt for one successful synthetic
live invocation on September 26 using Amazon Nova Micro in `us-east-1`. That receipt
proves that smoke call succeeded—not clinical validity, production availability,
security completeness, or regulatory compliance.”

**On screen:** Architecture slide or `validation/bedrock-smoke.json`.

## 2:15–2:45 — Impact and path forward

**Speaker:** [NAME]

“The near-term opportunity is to reduce documentation time and correction burden while
preserving clinician oversight. Next, we would co-design with clinicians, evaluate note
quality and usability on consented or synthetic data, measure time saved and edits
required, and complete the privacy, security, auditability, integration, and regulatory
work needed before any clinical use.”

## 2:45–3:00 — Close

**Speaker:** [NAME]

“CareScribe keeps the promise deliberately narrow: AI helps structure the draft; the
clinician owns the judgment. Our goal is more attention available for care, with a clear
human review boundary at every step.”

**On screen:** Project name, repository, and QR code/link:
https://github.com/biobitworks/carescribe

## Demo fallback plan

If the deployed app fails, say: “The live interface is unavailable, so we’ll use our
recorded path and show the validated inference evidence rather than imply a successful
live workflow.”

1. Switch immediately to [PASTE SHAREABLE BACKUP VIDEO URL].
2. If the video also fails, show pre-captured screenshots of the simulated workflow:
   [PASTE SCREENSHOT/SLIDES LOCATION].
3. Open `validation/bedrock-smoke.json` in the repository and explain its narrow claim:
   one successful synthetic Bedrock `Converse` call.
4. Show `src/carescribe/bedrock.py` and `tests/test_bedrock.py` to establish the Bedrock
   boundary and offline request-shape coverage.
5. Never describe screenshots, a recording, mocked tests, or the smoke receipt as a
   currently live end-to-end demo.

## Five-minute preflight

- [ ] Team names and speaking roles are assigned.
- [ ] All `[VERIFY BEFORE CLAIMING]` markers and placeholders are resolved.
- [ ] AWS demo opens from a logged-out browser and the exact demo path succeeds.
- [ ] Only simulated, non-PHI content is loaded.
- [ ] Slides and video open without requesting access.
- [ ] Backup video is downloaded locally as well as linked.
- [ ] Browser zoom, notifications, credentials, and unrelated tabs are handled.
- [ ] A timer is visible to a non-speaking teammate.
- [ ] Speakers can state the safety boundary without qualification: clinician-reviewed
  documentation support; never autonomous diagnosis or prescription.
