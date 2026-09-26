# CareScribe submission copy

> Final owner: verify every public link and use simulated data only.

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

We built a three-role CareScribe Room for a fictional incomplete pediatric speech
evaluation. Julie, Maya, and Leo can be named in the room; the active speaker is
highlighted; verbal, nonverbal, and loud child events remain explicitly uncertain. The
projector view combines a role-labeled transcript, caregiver advocate, evidence-linked
provider review, and append-only custody checkpoints.

At closeout, Maya receives a correctable **Today / Next / Who / When** Action Card while
Julie receives a separate Evidence Card with source, uncertainty, missing observations,
and decisions still needed. Both people must approve the exact handoff before it can be
finalized.

The local-server demo includes a benchmarked LiquidAI LFM2.5 privacy-gate adapter on the
laptop, Amazon Nova Micro for synthetic event atomization, Amazon Nova Pro for synthetic
handoff review, bounded in-memory room synchronization, and model-invocation custody
events. Nova Sonic has not been run. OpenAI Realtime client-secret access was verified as
a possible fallback, but browser WebRTC/full-duplex voice is not implemented. The public
GitHub Pages site is a static interaction and recorded-replay fallback; it is not the
model or room backend and is disconnected from clinical systems.

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

- Slides: https://biobitworks.github.io/carescribe/slides.html
- Demo video: https://biobitworks.github.io/carescribe/assets/carescribe-three-actor-demo.mp4

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

- [ ] Keep every model claim at its documented evidence ceiling; Nova Sonic and browser
  full-duplex voice are not implemented.
- [ ] Paste each answer into the matching numbered form field.
- [ ] Open every submitted link from a private/logged-out browser window.
- [ ] Submit one response for the team before the deadline.
