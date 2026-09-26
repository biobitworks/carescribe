# Judging guide

## Current status

This repository contains a minimal Amazon Bedrock Runtime inference boundary and offline
tests. It does not yet contain a user-facing CareScribe workflow.

| Check | Status |
| --- | --- |
| Bedrock-only inference boundary | Implemented; offline tested |
| Bedrock `Converse` request shape | Implemented; offline tested |
| Live AWS inference | **OBSERVED PASS** on 2026-09-26; see `validation/bedrock-smoke.json` |
| End-to-end CareScribe workflow | **NOT IMPLEMENTED** |

## Review path

1. Read the project and safety scope in `README.md`.
2. Inspect `src/carescribe/bedrock.py` for the inference boundary.
3. Run `pytest` for offline request-shape validation.
4. Run `carescribe-bedrock-smoke` with authorized AWS credentials for live validation.

## Verification policy

Only checks demonstrated by committed tests or reproducible commands are described as
validated. A mocked test verifies our request construction, not AWS connectivity, IAM
access, model availability, or a successful model response. Secrets and sensitive health
information must never be included in judging data.

The committed smoke receipt records only public configuration and the response hash. It
does not contain AWS credentials, account identifiers, or session data.
