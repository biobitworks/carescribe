# CareScribe

CareScribe is a simulated-data prototype for clinician-reviewed pediatric speech
evaluation handoffs. It helps a caregiver leave with **Today / Next / Who / When** while
the provider keeps source evidence, uncertainty, and clinical judgment.

- **Interaction demo:** https://biobitworks.github.io/carescribe/
- **Provider focus:** https://biobitworks.github.io/carescribe/provider.html?room=JUDGES
- **Caregiver focus:** https://biobitworks.github.io/carescribe/caregiver.html?room=JUDGES
- **Child focus:** https://biobitworks.github.io/carescribe/child.html?room=JUDGES
- **Projector:** https://biobitworks.github.io/carescribe/projector.html?room=JUDGES
- **Model proof:** https://biobitworks.github.io/carescribe/models.html?room=JUDGES
- **Judge deck:** https://biobitworks.github.io/carescribe/slides.html
- **Recorded fallback:** https://biobitworks.github.io/carescribe/replay.html

The public site is static: it demonstrates the interface, fictional sample, local browser
state, review controls, and recorded replay. It does not host the Python room backend,
invoke a model, or prove cross-device synchronization.

## Local live demo

```bash
export AWS_REGION=us-east-1
PYTHONPATH=src python -m carescribe.live_server --host 127.0.0.1 --port 8080
```

Open <http://127.0.0.1:8080>. The local-server path adds in-memory room polling, a
LiquidAI privacy-gate adapter on the laptop, and server-side Amazon Bedrock text
inference when credentials and model access are available. It accepts synthetic requests
only. See [docs/LIVE_BEDROCK_DEMO.md](docs/LIVE_BEDROCK_DEMO.md).

Use the direct focused pages above on the same local origin for the provider,
caregiver, child, projector, model proof, replay, and presentation surfaces. Each page
shows the live `/api/health` and room response locally, and an explicit static-only state
when hosted on GitHub Pages.

Run the Gum-powered laptop readiness check at any time:

```bash
./scripts/demo-doctor.sh
```

It verifies the core UI, actor pages, tests, local services, public presentation,
signed receipt, and prints the two-minute three-actor judge path.

## Model evidence

| Function | Model and location | Evidence ceiling |
| --- | --- | --- |
| Privacy gate | LiquidAI LFM2.5 1.2B, local laptop | Installed, invoked, and benchmarked on synthetic input |
| Event atomization | Amazon Nova Micro, Bedrock `us-east-1` | Live synthetic invocation verified |
| Handoff synthesis | Amazon Nova Pro, Bedrock `us-east-1` | Live synthetic route observed; model prose remains untrusted |
| Full-duplex audio | Amazon Nova Sonic | Not run |
| Realtime fallback | OpenAI `gpt-realtime-2.1` | Client-secret API access verified; browser WebRTC not implemented |

Receipts and limitations are in `validation/`, the
[gate-by-gate gap matrix](docs/GAP_MATRIX.md), [docs/RED_TEAM.md](docs/RED_TEAM.md), and
[docs/SUBMISSION_READINESS.md](docs/SUBMISSION_READINESS.md).

## Setup and validation

```bash
git clone https://github.com/biobitworks/carescribe.git
cd carescribe
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=src pytest -q
node --test web/fco-core.test.mjs
```

The explicit plugin setting avoids an unrelated broken global pytest plugin on the demo
laptop.

## Optional live Bedrock validation

Configure normal AWS credentials outside the repository. Then select a model or inference
profile available to that account:

```bash
export AWS_REGION=us-west-2
export CARESCRIBE_BEDROCK_MODEL_ID='<model-or-inference-profile-id>'
carescribe-bedrock-smoke
```

A `SUCCEEDED` result proves only that one synthetic command reached Amazon Bedrock and
received text. The caller needs `bedrock:InvokeModel` access.

## For judges and contributors

- [Agent Toolkit and Strands setup](docs/AGENT_TOOLKIT.md)

See [JUDGING.md](JUDGING.md) for an honest status matrix and [CONTRIBUTING.md](CONTRIBUTING.md)
for the pull-request workflow.

## Team collaboration

Teammates should claim an area and attach their pull request, validation evidence, and
shareable demo link in [TEAM.md](TEAM.md). The team lead's workspace remains the planning
hub; this repository is the durable source for code and judge-facing evidence.

## Privacy and clinical scope

Never commit AWS credentials, patient data, protected health information, or private
configuration. Use fictional content only.

This prototype is not a medical device, is not approved for PHI, and does not claim HIPAA
compliance. Browser deletion clears this app's `localStorage`; it does not prove deletion
from browser-vendor services, server memory, logs, caches, backups, or cloud systems.
Custody hashes demonstrate recorded-byte integrity and lineage, not clinical truth.
