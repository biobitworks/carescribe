# CareScribe

CareScribe is an early, public prototype for collaborative development and judging.

**Live static demo:** https://biobitworks.github.io/carescribe/

The public URL provides the five-step visual-story fallback. For the live synthetic
Bedrock path on MagicPro:

```bash
export AWS_REGION=us-east-1
PYTHONPATH=src python -m carescribe.live_server --host 127.0.0.1 --port 8080
```

Then open <http://127.0.0.1:8080>. Amazon Bedrock inference is remote; FCO/FCG/MMR
custody and canonical session state remain locally controlled. See
[docs/LIVE_BEDROCK_DEMO.md](docs/LIVE_BEDROCK_DEMO.md).

> **Validation status:** the Amazon Bedrock inference boundary has offline test coverage,
> and a live smoke invocation was observed successfully on 2026-09-26. Teammates and judges
> can reproduce that check with their own authorized AWS account.

## Amazon Bedrock inference

All AI inference must use Amazon Bedrock. The prototype calls the Bedrock Runtime
`Converse` API through `boto3`; it has no direct model-provider client or fallback path.

## Setup and offline validation

```bash
git clone https://github.com/biobitworks/carescribe.git
cd carescribe
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
```

## Live Bedrock validation

Configure normal AWS credentials outside the repository. Then select a model or inference
profile available to that account:

```bash
export AWS_REGION=us-west-2
export CARESCRIBE_BEDROCK_MODEL_ID='<model-or-inference-profile-id>'
carescribe-bedrock-smoke
```

A `SUCCEEDED` JSON result proves that the command reached Amazon Bedrock and received text.
Offline tests alone do not make that claim. The caller needs `bedrock:InvokeModel` access
for the selected resource.

## For judges and contributors

See [JUDGING.md](JUDGING.md) for an honest status matrix and [CONTRIBUTING.md](CONTRIBUTING.md)
for the pull-request workflow.

## Team collaboration

Teammates should claim an area and attach their pull request, validation evidence, and
shareable demo link in [TEAM.md](TEAM.md). The team lead's workspace remains the planning
hub; this repository is the durable source for code and judge-facing evidence.

## Security and clinical scope

Never commit AWS credentials, patient data, protected health information, or private
configuration. This prototype is not a medical device and must not be used for diagnosis,
treatment decisions, or unsupervised clinical documentation.
