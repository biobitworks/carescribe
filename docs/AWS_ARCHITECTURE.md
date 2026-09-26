# CareScribe AWS architecture

## Scope and safety boundary

CareScribe captures speaker-tagged transcript events and can draft descriptive,
evidence-linked observations for clinician review. It does **not** autonomously
diagnose, prescribe treatment, or turn model output into the clinical record.
Only an authenticated clinician can approve an observation.

## Current state

The repository currently contains a static, local-only browser demonstration, a
Python domain model, and a Bedrock smoke client. The browser can use the Web
Speech API or a fictional fallback and stores session state in browser storage.
There is no deployed AWS API, server-side streaming transcription pipeline,
persistent cloud store, authentication integration, or infrastructure-as-code.
The architecture below is therefore a deployable target, not a claim about the
prototype's current AWS capabilities.

## Planned deployable architecture

1. **Amplify Hosting** serves the web client. Amplify-managed Cognito
   authentication supplies short-lived user tokens; clinician roles are
   enforced server-side, never trusted from browser fields.
2. The client opens an **API Gateway WebSocket API**. Lambda authorizes the
   connection and stores a minimal connection-to-session mapping. Audio frames
   are relayed to **Amazon Transcribe Streaming** over a short-lived,
   server-controlled stream. Speaker labels and partial results may be shown
   live; only final transcript events become evidence.
3. Lambda validates ordered, idempotent transcript events and writes encrypted
   session records to **DynamoDB**. Payloads contain opaque subject/session
   identifiers rather than names where possible. CloudWatch logs exclude audio,
   transcript text, prompts, and model responses.
4. A separate Lambda sends only the minimum necessary final transcript excerpts
   to **Amazon Bedrock** with a prompt constrained to descriptive observation
   kinds and evidence event IDs. Bedrock output is untrusted input: Lambda
   validates its schema and stores it as `pending_review`.
5. The clinician UI displays each draft beside its cited transcript events.
   An authenticated approval command records clinician identity and timestamp.
   No draft is exported or treated as approved clinical documentation before
   this transition.

## Data protection and lifecycle

- DynamoDB tables use a customer-managed **KMS** key with key rotation and
  least-privilege grants. API Gateway, Lambda, Transcribe, Bedrock, DynamoDB,
  Cognito, and logs remain in an explicitly selected AWS Region.
- Each session item has an epoch-seconds `expires_at` attribute configured as
  **DynamoDB TTL**. TTL deletion is asynchronous and is not an exact-time
  privacy control, so application reads and writes reject sessions at or after
  expiry immediately.
- User-requested deletion uses an authenticated Lambda transaction to remove
  transcript, observation, and connection items immediately and records only a
  non-content deletion audit event. TTL remains defense in depth for abandoned
  sessions.
- Raw audio is not persisted by default. If later required, that is a separate
  reviewed feature with an explicit retention period, encrypted S3 storage,
  lifecycle deletion, and updated consent.
- Backups, point-in-time recovery, log retention, and deletion obligations must
  be configured consistently with the approved retention policy. DynamoDB TTL
  alone does not erase backups or accidental sensitive logs.
- IAM roles are split by connection, transcription, inference, review, and
  deletion paths. KMS encryption, TLS, CloudTrail, alarms, dependency scanning,
  and tested deletion/incident runbooks are release requirements.

## Message and item contracts

Transcript events carry `session_id`, stable `event_id`, speaker tag, UTC
`occurred_at`, monotonic `sequence`, finality, and text. Observations carry a
descriptive kind, summary, one or more `evidence_event_ids`, creation time, and
review state. Approval adds clinician ID and UTC approval time. Sensitive
content is never placed in WebSocket URLs, partition-key names, metrics, or
logs.

Before production use, the team must complete threat modeling, privacy and
clinical-safety review, regional service eligibility checks, load/failure
testing, and any required HIPAA agreements and configurations. AWS service use
does not itself make the application compliant.
