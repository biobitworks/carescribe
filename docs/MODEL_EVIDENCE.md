# Model evidence manifest

This is the canonical judge-facing model-status matrix. A status never extends beyond
the linked code and receipt.

| Function | Model and location | Product entry point | Evidence | Supported claim |
| --- | --- | --- | --- | --- |
| Laptop privacy gate | LiquidAI LFM2.5 1.2B, local Ollama | `src/carescribe/live_server.py` | `validation/liquid-local-benchmark.json` and custody sidecar | Exact local model was invoked and benchmarked on bounded synthetic input. Not phone inference or semantic de-identification. |
| Event atomization | Amazon Nova Micro, Bedrock `us-east-1` | `src/carescribe/bedrock.py` | `validation/bedrock-smoke.json` | One synthetic Bedrock invocation succeeded. Not current availability or clinical validity. |
| Handoff review | Amazon Nova Pro, Bedrock `us-east-1` | `src/carescribe/live_server.py` | `validation/browser-custody-proof.json` | Synthetic route was observed; model prose remained untrusted and was not treated as clinical truth. |
| Bidirectional voice | Amazon Nova 2 Sonic, Bedrock `us-east-1` | `src/carescribe/sonic_server.py`, `web/voice.js` | `validation/nova-sonic-smoke.json` | Synthetic bidirectional invocation and local browser bridge succeeded with generated PCM. Not proof of physical-mic reliability, public deployment, identity, diarization, or production operation. |
| Demo-media transcription | Mistral Voxtral Mini, Bedrock `us-east-1` | Offline media-preparation workflow | `validation/real-team-audio-receipts.json` | Three consented team recordings were transcribed. Not the live product runtime or model-accuracy validation. |
| Realtime alternative | OpenAI `gpt-realtime-2.1` | None | Access check only | Client-secret access was observed; browser WebRTC was not implemented. |

FCO/FCG/MMR and the Ed25519 release receipt provide deterministic byte lineage and
self-consistency. They do not prove model execution, actor identity, clinical truth,
immutability, regulatory compliance, or suitability for PHI.
