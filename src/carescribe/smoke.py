"""Opt-in live Amazon Bedrock inference smoke test."""

import json
import sys

from .bedrock import BedrockConfig, BedrockInference


def main() -> int:
    try:
        config = BedrockConfig.from_env()
        result = BedrockInference(config).generate(
            "Reply with exactly CARESCRIBE_BEDROCK_OK.", max_tokens=32
        )
    except Exception as exc:
        print(json.dumps({"status": "FAILED", "provider": "amazon-bedrock", "error": str(exc)}))
        return 1
    print(json.dumps({"status": "SUCCEEDED", "provider": "amazon-bedrock", "region": config.region, "model_id": config.model_id, "response": result}))
    return 0


if __name__ == "__main__":
    sys.exit(main())

