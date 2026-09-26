# Judging guide

## Current status

This repository contains a local-only browser workflow, privacy-first domain contracts,
and an independently validated Amazon Bedrock Runtime inference boundary. The static web
demo is intentionally disconnected from AWS inference and clinical systems.

| Check | Status |
| --- | --- |
| Bedrock-only inference boundary | Implemented; offline tested |
| Bedrock `Converse` request shape | Implemented; offline tested |
| Live AWS inference | **OBSERVED PASS** on 2026-09-26; see `validation/bedrock-smoke.json` |
| Browser interaction workflow | **IMPLEMENTED**; live transcription depends on browser support |
| Speaker-role controls and fictional fallback | **IMPLEMENTED**; browser-tested |
| Evidence-linked observations and review | **IMPLEMENTED IN STATIC DEMO**; deterministic, not Bedrock-connected |
| AWS-hosted end-to-end workflow | **NOT IMPLEMENTED**; target architecture only |

## Review path

1. Read the project and safety scope in `README.md`.
2. Open the [public static demo](https://biobitworks.github.io/carescribe/) with simulated
   data.
3. Inspect `src/carescribe/bedrock.py` for the separate inference boundary.
4. Run `pytest` for offline request-shape and domain-contract validation.
5. Run `carescribe-bedrock-smoke` with authorized AWS credentials for live validation.

## Verification policy

Only checks demonstrated by committed tests or reproducible commands are described as
validated. A mocked test verifies our request construction, not AWS connectivity, IAM
access, model availability, or a successful model response. Secrets and sensitive health
information must never be included in judging data.

The committed smoke receipt records only public configuration and the response hash. It
does not contain AWS credentials, account identifiers, or session data.
