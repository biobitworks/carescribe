# CareScribe submission copy

> Final owner: verify every public link and use simulated data only.

## 1. Team Members Name (Please list individual names)

Byron P. Lee — product, engineering, safety, and demo media. Julie Marcel — deployment
and live-demo coordination.

## 2. Project name

CareScribe — clinician-reviewed pediatric speech-evaluation handoffs.

## 3. What problem are you solving, and why does it matter?

Clinical conversations contain important observations, context, and follow-up details, but
turning them into clear documentation can add cognitive and administrative burden.
CareScribe explores how AI can help a clinician organize a simulated encounter into a reviewable
draft, so the clinician can spend less attention on clerical work and more on the person
in front of them. It is clinician-reviewed documentation support—not an autonomous
diagnosis, prescription, treatment recommendation, or replacement for clinical judgment.

Our specific impact hypothesis is that a reviewed **Today / Next / Who / When** handoff
can improve caregiver clarity while preserving provider evidence and uncertainty. That
benefit has not yet been measured.

## 4. Describe what you built today

We built a three-role CareScribe Room for a fictional incomplete pediatric speech
evaluation. The workflow captures role-attributed observations, lets the caregiver
approve a minimized room update, preserves uncertainty for provider review, and produces
separate caregiver and provider handoffs. Role selection is manual; it is not biometric
speaker identification or validated diarization.

At closeout, Maya receives a correctable **Today / Next / Who / When** Action Card while
Julie receives a separate Evidence Card with source, uncertainty, missing observations,
and decisions still needed. Both people must approve the exact handoff before it can be
finalized.

The local-server demo includes a benchmarked LiquidAI LFM2.5 privacy-gate adapter on the
laptop, Amazon Nova Micro for synthetic event atomization, Amazon Nova Pro for synthetic
handoff review, bounded in-memory room synchronization, and model-invocation custody
events. Amazon Nova 2 Sonic completed a synthetic bidirectional Bedrock invocation and
local browser-bridge test using generated PCM; the browser implements microphone capture,
transcript display, returned audio, interruption, and explicit stop controls. This does
not prove physical-microphone reliability, public voice deployment, diarization, or
production operation. Mistral Voxtral Mini on Bedrock transcribed the consented team
rehearsal recordings as a media-preparation workflow, not the live product route. The
public GitHub Pages site is a static interaction and recorded-evidence fallback; it is
not the model or room backend and is disconnected from clinical systems.

## 5. What is the path to real-world impact?

The first-user hypothesis is pediatric speech-language pathologists, with caregivers as
the second user and pediatric therapy practices or health systems as the initial buyer
hypothesis. The near-term value hypothesis is less documentation and correction burden
plus a clearer caregiver handoff; neither benefit has been clinically validated.

Our next step would be a no-PHI formative study with 5–8 SLPs completing 10 scripted
encounters each. We would compare the current workflow with CareScribe and measure median
documentation time, provider edits, unsupported clinical statements, source-attribution
accuracy, and caregiver recall of Today / Next / Who / When. There would be no chart
export or autonomous clinical decision.

Before any clinical deployment, the product would need user and buyer validation,
authentication, tenant isolation, EHR integration, attributable approval, retention and
deletion controls, security testing, and organizational, legal, privacy, and regulatory
review. CareScribe would keep the clinician in control: it may organize observations and
surface evidence-linked considerations, but it must never autonomously diagnose,
prescribe, or choose treatment.

## 6. Live prototype or demo link

https://biobitworks.github.io/carescribe/

Public interactive static demo using simulated data. Model and synchronized-room services
run only in the supervised laptop demonstration.

## 7. Code repository link

https://github.com/biobitworks/carescribe

## 8. Slides or additional material (videos)

- Slides: https://biobitworks.github.io/carescribe/slides.html
- Revised PowerPoint: https://biobitworks.github.io/carescribe/assets/carescribe-revised-pitch-deck.pptx
- Primary Nova Sonic demo video: https://biobitworks.github.io/carescribe/assets/carescribe-live-nova-sonic-demo.mp4
- Synthetic fallback: https://biobitworks.github.io/carescribe/assets/carescribe-three-actor-demo.mp4

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
- [x] No credentials, patient data, protected health information, or non-consented
  recordings appear in the repository, demo, slides, or video.
- [x] Every team member name is present.
- [x] The public demo URL opens in a logged-out browser and the demonstrated workflow was
  tested with simulated data.
- [x] Repository, slides, and video links have the intended judge access.
- [x] The final copy consistently describes clinician-reviewed documentation support
  and makes no autonomous diagnosis, prescription, or treatment claim.
- [ ] An authorized team representative agrees the required confirmation is accurate
  before checking the box.

## Final paste checklist

- [x] Keep every model claim at its documented evidence ceiling; Nova Sonic is verified
  only for the committed synthetic invocation and local bridge evidence.
- [ ] Paste each answer into the matching numbered form field.
- [x] Open every submitted link from a private/logged-out browser window.
- [ ] Submit one response for the team before the deadline.
