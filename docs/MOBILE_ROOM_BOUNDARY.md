# Mobile room boundary

## What the current prototype proves

The current web prototype demonstrates a simulated room UI that can request
microphone access, consume browser-provided speech recognition, attach temporary
provider/caregiver/child role labels, keep canonical session state locally, and
send a bounded text prompt to Amazon Bedrock when configured. It supports
workflow demonstration with toy people and scripted or synthetic speech.

It does **not** prove reliable diarization, identity recognition, continuous
multi-device streaming, a phone-resident model, real-time Bedrock orchestration,
private participant channels, production authentication, retention/deletion
controls, clinical accuracy, or safe handling of real patient data.

## Proposed mobile-to-room architecture

Each Android or iPhone participant joins an authenticated, short-lived room.
After explicit microphone consent, the device's platform speech capabilities
and a small local model may produce an uncertain, ephemeral voice-role hint
such as `provider`, `caregiver`, `child`, or `unknown`. The app asks for a toy
display name at session start and permits correction; it must not infer or
persist identity from a voice.

Raw audio and device-specific voice features stay on the phone by default. The
device emits only a minimized shared-room event: opaque session/device IDs,
sequence and time, tentative role plus confidence/uncertainty, finality, and the
minimum transcript or nonverbal event needed for the interaction. A scream or
other nonverbal sound is represented as an uncertain event, not interpreted as
a diagnosis, intent, emotion, or identity.

An authenticated service validates ordering, authorization, and room policy,
then gives minimum-necessary events to a Bedrock-backed orchestrator. The room
avatar may coordinate turns and publish bounded public prompts. Participant-
private content remains in a separate authorized channel and is not promoted to
the shared room without an explicit policy and human-controlled release.
Bedrock output is untrusted draft output; it cannot start recording, reveal
private content, diagnose, export, or make clinical decisions. The provider
retains visible mute, stop, correction, and approval controls.

The local model is an assistive preprocessor, not an authority. Low confidence,
cross-talk, silence, changing devices, and nonverbal participants resolve to
`unknown` and require human confirmation. A live scripted local-model adapter
is acceptable for prototype testing but proves integration behavior only, not
on-device inference or speaker accuracy.

## Secure context

Browser microphone APIs require a secure context. `localhost` and loopback
addresses are generally treated as secure for same-device development, but a
phone opening a laptop's plain `http://` LAN address is not. Device testing
therefore requires HTTPS, for example:

- a trusted local-development certificate installed on each test device;
- an HTTPS reverse proxy or tunnel to the local server; or
- deployment to an authenticated HTTPS test environment.

The certificate must be valid for the hostname used by the device. HTTPS
enables microphone access; it does not by itself provide authentication,
authorization, privacy, or compliance.

## Claims boundary

Use synthetic people, invented names, and scripted content only. This design
does not create or claim voiceprints, biometric identification, voice
authentication, or validated speaker recognition. It is not PHI-ready and
makes no HIPAA, medical-device, clinical-safety, consent, child-safeguarding,
security, deletion, or production-readiness claim. Real patient audio, names,
transcripts, and other PHI must not enter the prototype.
