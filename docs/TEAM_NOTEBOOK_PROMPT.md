# CareScribe Team Notebook Synthesis

This document turns four handwritten team notebook pages into an MVP prompt. It
is a product interpretation, not a verbatim transcript. Unclear handwriting is
not treated as a confirmed requirement.

## Revised MVP goal prompt

Build a privacy-first, multi-device CareScribe room for a simulated pediatric
visit. A provider, caregiver, and child (verbal, nonverbal, mixed, or making
unstructured vocalizations) join from separate devices, enter a temporary
display name and role, and explicitly enable their own microphone.

The projector view tells the visit story in three columns:

1. **History / EHR context** — visit type, referral reason, relevant prior
   information, milestones, caregiver-reported concerns, observations,
   assessments, attachments, and longitudinal goals.
2. **Advocate avatar** — coordinates turns, highlights the currently selected
   speaker and role, asks for clarification when attribution is uncertain, and
   produces bounded full-duplex responses without diagnosing or acting
   autonomously.
3. **Live encounter** — role-attributed transcript, visual/nonverbal
   observations, questions, decisions, and follow-up items.

Translate the encounter into two distinct, reviewable outputs:

- **Caregiver Action Card:** show only quick, concrete items in the form
  `Today`, `Next`, `Who`, and `When`, plus how to help at home, scheduling or
  waitlist expectations, unanswered questions, and the provider-approved
  contact path. Use plain language. Do not expose provider-only differential
  considerations.
- **Provider Brief:** show visit type and referral context; participant roles;
  relevant history; caregiver reports; direct observations; milestones and
  behavioral or assessment constraints; prior interventions and standardized
  test results; source provenance; attachments; longitudinal patterns;
  questions requiring clinical judgment; follow-up, education, scheduling, and
  documentation needs.

Maintain private/public boundaries. Raw audio and private device context stay
local by default. A device may propose a minimized room update, but it becomes
public only after the participant approves, corrects, or dismisses it. Mark
speaker identity as uncertain instead of using biometric voice identification.
Keep caregiver reports, direct observations, model inferences, and
clinician-approved statements visibly distinct. Nothing enters an EHR, email,
care plan, or caregiver handout without provider review and explicit approval.

For the demo, use synthetic people and data. Show which model handles each
stage and where it runs: local laptop/phone classification and minimization,
plus the configured frontier model for approved room orchestration. If a model
is unavailable, identify the scripted fallback visibly rather than implying
that model inference occurred.

## Piecewise MVP acceptance criteria

- **Join and consent:** each device joins one room, chooses
  provider/caregiver/child/other caregiver, supplies a temporary name, and
  controls its own microphone.
- **Live attribution:** the projector highlights one selected speaker and role;
  uncertainty can be corrected without creating a voiceprint.
- **Visit translation:** planning/scheduling, visit type, today's encounter,
  and relevant past information feed a structured history.
- **Multimodal capture:** the UI can label caregiver reports, provider
  observations, nonverbal events, and references to video/PDF attachments.
- **Caregiver handoff:** a provider-reviewed Action Card answers what to do,
  who does it, and when.
- **Provider handoff:** a Provider Brief answers what context, evidence,
  constraints, unanswered questions, and follow-up are needed.
- **Longitudinal follow-up:** results, advice, education, goals, visit
  frequency, scheduling, and waitlist status can be tracked without claiming
  clinical correctness.
- **Boundary proof:** unapproved private content never appears on the projector
  or in frontier-model input; approved public updates are traceable to role,
  source type, and review state.
- **Model proof:** a visible status panel identifies model name, runtime
  location, connection state, and scripted-fallback state.

## Traceability to notebook pages

- **Image 1:** caregiver dashboard; provider/mother exchange; daily fields such
  as feeding, school/day, and setting; review/email workflow.
- **Image 2:** planning/scheduling; visit type; today's visit translating into
  history; clinician, parent, child, and other-caregiver roles; prior info.
- **Image 3:** language beyond words; visual clues and observations; daily
  communication; meaningful patterns; video/PDF inputs; follow-up, advice,
  scheduling, and possible billing support.
- **Image 4:** PCP/referral-to-specialist journey; unmet milestones; behavioral
  or assessment constraints; standardized/full evaluation; results; how to
  help and next steps; goals, waitlists, schedules, duration, more visits, and
  patient/caregiver education.

## Deliberately unresolved

Illegible notebook fragments—including one visit category, several acronyms,
and ambiguous references to billing, email review, and real-time
“disturbance”—need team confirmation before becoming implementation
requirements.
