# Live Bedrock demo on MagicPro

This path is for a supervised hackathon demonstration using fictional content only.
Amazon Bedrock inference is remote. Canonical browser state and FCO/FCG/MMR custody remain
locally controlled.

## Start

```bash
export AWS_REGION=us-east-1
PYTHONPATH=src python -m carescribe.live_server --host 127.0.0.1 --port 8080
```

Open <http://127.0.0.1:8080> on the MagicPro machine.

The local server routes rapid event atomization to Amazon Nova Micro and the final
clinician-reviewed synthesis to Amazon Nova Pro. AWS credentials are resolved by the
server through the normal AWS credential chain and are never sent to browser JavaScript.

## Safety boundary

- Use the scripted fictional interaction only.
- A caregiver statement such as “Could this be autism?” is retained as a caregiver
  concern, not endorsed as a diagnosis.
- Direct observations, caregiver statements, model inferences, and clinician-approved
  conclusions remain distinct.
- The clinician—not CareScribe—determines assessment, diagnosis, treatment, referral, and
  treatment frequency.
- Stop the server after the demonstration. The endpoint deliberately refuses requests
  unless `synthetic` is exactly `true`.
