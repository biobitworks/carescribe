# Judging guide

## Current status

This repository contains a local live workflow, separate actor/projector/model pages,
privacy-bound domain contracts, and narrow model receipts. The public web demo is a
static presentation/replay fallback disconnected from model and clinical systems.

| Check | Status |
| --- | --- |
| Local LiquidAI privacy gate | **LIVE BENCHMARKED** on synthetic input |
| Bedrock text inference boundary | Implemented; offline tested |
| Bedrock `Converse` request shape | Implemented; offline tested |
| Nova Micro AWS inference | **OBSERVED PASS**; committed smoke receipt |
| Nova Pro AWS inference | **OBSERVED LIVE ROUTE**; untrusted synthetic handoff only |
| Browser interaction workflow | **IMPLEMENTED**; live transcription depends on browser support |
| Speaker-role controls and fictional fallback | **IMPLEMENTED**; browser-tested |
| Focused Provider/Caregiver/Child/Projector pages | **IMPLEMENTED** |
| Three-actor recorded fallback | **IMPLEMENTED**; 60 seconds with captions |
| Full-duplex voice / Nova 2 Sonic | **LOCAL SYNTHETIC INVOCATION + BRIDGE VERIFIED**; physical microphone reliability and public deployment not proven |
| Voxtral media transcription | **THREE CONSENTED TEAM RECORDINGS TRANSCRIBED**; media-preparation workflow, not live runtime |
| Authenticated private rooms / AgentCore | **NOT IMPLEMENTED** |
| AWS-hosted end-to-end workflow | **NOT IMPLEMENTED**; target architecture only |

## Review path

1. Read the project and safety scope in `README.md`.
2. Open the [public static demo](https://biobitworks.github.io/carescribe/) with simulated
   data.
3. Inspect `src/carescribe/bedrock.py` for the separate inference boundary.
4. Run `pytest` for offline request-shape and domain-contract validation.
5. Inspect `validation/nova-sonic-smoke.json` and
   `validation/real-team-audio-receipts.json` for the bounded voice/media evidence.
6. Run `carescribe-bedrock-smoke` with authorized AWS credentials for fresh text-model
   validation.

## Verification policy

Only checks demonstrated by committed tests or reproducible commands are described as
validated. A mocked test verifies our request construction, not AWS connectivity, IAM
access, model availability, or a successful model response. Secrets and sensitive health
information must never be included in judging data.

The committed smoke receipt records only public configuration and the response hash. It
does not contain AWS credentials, account identifiers, or session data.
