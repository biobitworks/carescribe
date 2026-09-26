# CareScribe submission copy

> Final owner: complete every bracketed item and use simulated data only.

## 1. Team Members Name (Please list individual names)

Byron P. Lee, Julie Marcel

## 2. Project name

CareScribe Live

## 3. What problem are you solving, and why does it matter?

Clinical conversations contain important observations, context, and follow-up details, but
turning them into clear documentation adds cognitive and administrative burden. CareScribe
explores how AI can help a clinician organize a simulated encounter into a reviewable
draft, so the clinician can spend less attention on clerical work and more on the person
in front of them. It is clinician-reviewed documentation support—not an autonomous
diagnosis, prescription, treatment recommendation, or replacement for clinical judgment.

## 4. Describe what you built today

We built the validated AI inference foundation for CareScribe. The repository provides a
single Amazon Bedrock Runtime boundary using the `Converse` API through `boto3`, with
configuration checks, deterministic generation settings, offline request-shape tests, and
an opt-in live smoke command. A committed receipt records one successful synthetic
Bedrock invocation on September 26, 2026 using Amazon Nova Micro in `us-east-1`.

We also built a privacy-first browser workflow that captures live speech when the browser
supports it, provides a clearly labeled fictional fallback, tracks provider, caregiver,
child, or uncertain speaker roles, and displays evidence-linked observations and
follow-up questions for clinician review. Its five-step journey includes separate
camera/microphone permissions, a bounded child story, caregiver-controlled advocate,
provider EHR-style review, and shared closeout. Sessions persist only in that browser and
can be deleted by the user. The public static demonstration remains disconnected from
clinical systems. A local MagicPro path invokes remote Amazon Nova Micro and Nova Pro
through server-side Bedrock credentials while local FCO/FCG/MMR custody preserves
append-only evidence and corrections.

## 5. What is the path to real-world impact?

The first practical use is reducing the time and attention clinicians spend converting
encounters into structured draft documentation. The path forward is to co-design with
clinicians, test usability and note quality on consented or synthetic data, measure
documentation time and correction burden, and add privacy, security, auditability, and
workflow integrations before any clinical deployment. Any real-world use would require
appropriate organizational, legal, security, and regulatory review. CareScribe would keep
the clinician in control: it may organize observations and surface evidence-linked
considerations, but it must never autonomously diagnose, prescribe, or choose treatment.

## 6. Live prototype or demo link

https://biobitworks.github.io/carescribe/

Hosting note: this is the public static fallback. The supplied AWS workshop role currently
denies hosting-service access, so do not describe this URL as AWS-hosted unless a separate
AWS deployment is completed and substituted before submission.

## 7. Code repository link

https://github.com/biobitworks/carescribe

## 8. Slides or additional material (videos)

- Slides: [PASTE SHAREABLE SLIDES URL]
- Demo video: [PASTE SHAREABLE VIDEO URL]

## Hackathon Submission Confirmation

Required checkbox text:

> By checking this box we confirm that this submission reflects work created during
> today’s Healthcare AI Hackathon; that our team has the right to use all code, content,
> data, and materials included; and that we have not knowingly used copyrighted or
> proprietary work without permission.

Do not check until every team member responsible for submission confirms:

- [ ] The listed work was created during the hackathon or clearly identified as
  permitted pre-existing material.
- [ ] The team has the right to use and submit all code, content, data, logos, media,
  models, and other materials.
- [ ] Third-party materials and dependencies are permitted by their licenses and have
  required notices or attribution.
- [ ] No copyrighted or proprietary material was knowingly used without permission.
- [ ] No credentials, patient data, protected health information, or non-consented
  recordings appear in the repository, demo, slides, or video.
- [ ] Every team member name is present.
- [ ] The public demo URL opens in a logged-out browser and the demonstrated workflow was
  tested with simulated data.
- [ ] Repository, slides, and video links have the intended judge access.
- [ ] The final copy consistently describes clinician-reviewed documentation support
  and makes no autonomous diagnosis, prescription, or treatment claim.
- [ ] An authorized team representative agrees the required confirmation is accurate
  before checking the box.

## Final paste checklist

- [ ] Replace all square-bracket placeholders.
- [ ] Keep the verified Bedrock claim narrow: one synthetic successful smoke invocation,
  not proof of clinical validity, availability, security completeness, or compliance.
- [ ] Paste each answer into the matching numbered form field.
- [ ] Open every submitted link from a private/logged-out browser window.
- [ ] Submit one response for the team before the deadline.
