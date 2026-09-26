"""The single supported AI inference boundary: Amazon Bedrock Runtime."""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any


@dataclass(frozen=True)
class BedrockConfig:
    model_id: str
    region: str
    fallback_model_ids: tuple[str, ...] = ()

    @classmethod
    def from_env(cls) -> "BedrockConfig":
        model_id = os.getenv("CARESCRIBE_BEDROCK_MODEL_ID", "").strip()
        region = (os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "").strip()
        fallback_model_ids = tuple(
            dict.fromkeys(
                candidate.strip()
                for candidate in os.getenv(
                    "CARESCRIBE_BEDROCK_FALLBACK_MODEL_IDS", ""
                ).split(",")
                if candidate.strip() and candidate.strip() != model_id
            )
        )
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
        return cls(
            model_id=model_id,
            region=region,
            fallback_model_ids=fallback_model_ids,
        )


@dataclass(frozen=True)
class BedrockResult:
    text: str
    model_id: str


class BedrockInference:
    """Invoke a text-capable model through Bedrock's Converse API."""

    def __init__(self, config: BedrockConfig, client: Any | None = None) -> None:
        self.config = config
        if client is None:
            import boto3

            client = boto3.client("bedrock-runtime", region_name=config.region)
        self._client = client

    def generate(self, prompt: str, *, max_tokens: int = 256) -> str:
        return self.generate_result(prompt, max_tokens=max_tokens).text

    def generate_result(self, prompt: str, *, max_tokens: int = 256) -> BedrockResult:
        if not prompt.strip():
            raise ValueError("prompt must not be empty")
        if max_tokens < 1:
            raise ValueError("max_tokens must be positive")
        model_ids = (self.config.model_id, *self.config.fallback_model_ids)
        for index, model_id in enumerate(model_ids):
            try:
                response = self._client.converse(
                    modelId=model_id,
                    messages=[{"role": "user", "content": [{"text": prompt}]}],
                    inferenceConfig={"maxTokens": max_tokens},
                )
            except Exception as error:
                if index == len(model_ids) - 1 or not _allows_model_fallback(error):
                    raise
                continue

            blocks = response["output"]["message"]["content"]
            text = "".join(block.get("text", "") for block in blocks).strip()
            if not text:
                raise RuntimeError("Amazon Bedrock returned no text content")
            return BedrockResult(text=text, model_id=model_id)

        raise RuntimeError("No Amazon Bedrock models were configured")


_FALLBACK_ERROR_CODES = {
    "InternalServerException",
    "ModelNotReadyException",
    "ModelTimeoutException",
    "ServiceUnavailableException",
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
}

_NO_FALLBACK_ERROR_CODES = {
    "AccessDenied",
    "AccessDeniedException",
    "IncompleteSignature",
    "InvalidClientTokenId",
    "InvalidSignatureException",
    "MissingAuthenticationToken",
    "NotAuthorized",
    "NotAuthorizedException",
    "UnauthorizedException",
    "UnrecognizedClientException",
    "ValidationException",
}


def _allows_model_fallback(error: Exception) -> bool:
    response = getattr(error, "response", None)
    if not isinstance(response, dict):
        return False
    error_details = response.get("Error", {})
    code = error_details.get("Code") if isinstance(error_details, dict) else None
    if code in _NO_FALLBACK_ERROR_CODES:
        return False
    if code in _FALLBACK_ERROR_CODES:
        return True
    metadata = response.get("ResponseMetadata", {})
    status = metadata.get("HTTPStatusCode") if isinstance(metadata, dict) else None
    return isinstance(status, int) and status >= 500
