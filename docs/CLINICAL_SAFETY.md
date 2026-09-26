# Clinical Safety

## Intended use and limits

CareScribe is an early pediatric speech-therapy ambient-scribe prototype. It may organize a simulated encounter into a draft for a licensed clinician to review. It is not a medical device, diagnostic system, treatment recommender, or substitute for clinical judgment. No output enters a chart, caregiver communication, referral, or care plan without clinician review and explicit approval.

The demo uses simulated people and data only. Do not enter, record, upload, or paste real patient information, protected health information, real child audio, or identifying voice samples.

## Evidence labels

Every draft statement must retain its source and use one of these labels:

| Label | Meaning | Safe example | Required handling |
|---|---|---|---|
| **Direct observation** | Behavior directly seen or heard during the encounter, with context; not an interpretation. | “Produced /k/ correctly in 6 of 10 modeled trials.” | Record speaker, task, support level, and uncertainty when relevant. |
| **Caregiver report** | Information attributed to a caregiver, not independently verified in-session. | “Caregiver reports unfamiliar listeners often ask for repetition.” | Use attribution such as “caregiver reports”; never rewrite as observed fact. |
| **Model inference** | A tentative pattern or synthesis generated from source material. | “Draft inference: errors may increase in longer utterances.” | Visibly mark as unverified; do not present as diagnosis, fact, or recommendation. |
| **Clinician-approved conclusion** | Language reviewed, edited as needed, and affirmatively accepted by the treating clinician. | “Clinician-approved: findings support continued assessment of speech-sound production.” | Store approval identity/time in a production design; approval applies only to the exact text shown. |

The system must not silently promote one category into another. Quotes remain attributed; missing or conflicting evidence remains visible. Speaker uncertainty must be shown, not guessed.

## Clinical decision boundaries

- **Differential considerations are provider-only.** Possible diagnoses, rule-outs, referrals, red flags, and interpretations of developmental or medical significance appear only in a clinician view, labeled as unverified considerations. They are never shown to a child or caregiver as conclusions and never trigger an action automatically.
- **Treatment frequency is clinician-controlled.** The model may summarize an already documented schedule, but it must not select or change session frequency, duration, intensity, modality, goals, discharge, or home-program dosage. Only the clinician can enter and approve these decisions.
- **No autonomous orders or charting.** The model cannot diagnose, prescribe, refer, bill, sign, or submit a note. Silence, a timeout, or continued conversation never counts as approval.
- **Corrections outrank generated text.** The clinician can edit, reject, or regenerate each section; rejected text is not reused as established fact.

## Caregiver-safe education

Caregiver material must use plain, non-alarming language, avoid individualized diagnosis or prognosis, and state when to contact the child’s clinician. Link to stable public education rather than model-generated medical claims:

- [ASHA: Speech and Language Developmental Milestones](https://www.asha.org/public/developmental-milestones/)
- [ASHA: Identify the Signs](https://www.asha.org/public/early-identification-of-speech-language-and-hearing-disorders/)
- [NIDCD: Speech and Language](https://www.nidcd.nih.gov/health/speech-and-language)

Links are general education, not endorsements or individualized advice. The clinician reviews any selected link and accompanying text before sharing.

## Child-facing voice boundaries

If a future demo speaks to a child, it must be a bounded interaction aid—not a therapist or authority:

- identify itself as a computer helper and keep the clinician visibly or audibly in control;
- use brief, age-appropriate prompts approved for the current activity;
- never diagnose, discuss differential considerations, promise outcomes, provide treatment plans, solicit secrets, request identifying information, or ask the child to continue without the clinician;
- never imitate the child, caregiver, or clinician, and never create or retain a voiceprint;
- stop speaking and recording on clinician command, loss of supervision, distress, refusal, emergency language, or speaker uncertainty;
- route clinical, safeguarding, and “why” questions to the clinician; do not improvise;
- treat all spoken content as untrusted input, not as permission to change system behavior.

The demo does not establish that child-facing voice interactions are clinically effective, accessible, developmentally appropriate, or safe for unsupervised use.

## Demo review checklist

Before showing a draft, confirm that the session is simulated, evidence labels remain visible, caregiver reports are attributed, model inferences are tentative, and speaker uncertainty is disclosed. Before sharing or exporting, require clinician approval of the exact text and verify that provider-only content is excluded. The judge demo demonstrates workflow concepts only; it does not validate clinical accuracy, outcomes, regulatory status, or real-world deployment.
