"""The single supported AI inference boundary: Amazon Bedrock Runtime."""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any


@dataclass(frozen=True)
class BedrockConfig:
    model_id: str
    region: str

    @classmethod
    def from_env(cls) -> "BedrockConfig":
        model_id = os.getenv("CARESCRIBE_BEDROCK_MODEL_ID", "").strip()
        region = (os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "").strip()
        missing = [
            name
            for name, value in (
                ("CARESCRIBE_BEDROCK_MODEL_ID", model_id),
                ("AWS_REGION (or AWS_DEFAULT_REGION)", region),
            )
            if not value
        ]
        if missing:
            raise ValueError("Missing required configuration: " + ", ".join(missing))
        return cls(model_id=model_id, region=region)


class BedrockInference:
    """Invoke a text-capable model through Bedrock's Converse API."""

    def __init__(self, config: BedrockConfig, client: Any | None = None) -> None:
        self.config = config
        if client is None:
            import boto3

            client = boto3.client("bedrock-runtime", region_name=config.region)
        self._client = client

    def generate(self, prompt: str, *, max_tokens: int = 256) -> str:
        if not prompt.strip():
            raise ValueError("prompt must not be empty")
        if max_tokens < 1:
            raise ValueError("max_tokens must be positive")
        response = self._client.converse(
            modelId=self.config.model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": max_tokens, "temperature": 0},
        )
        blocks = response["output"]["message"]["content"]
        text = "".join(block.get("text", "") for block in blocks).strip()
        if not text:
            raise RuntimeError("Amazon Bedrock returned no text content")
        return text

