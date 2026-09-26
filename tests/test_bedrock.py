from unittest.mock import Mock

import pytest

from carescribe.bedrock import BedrockConfig, BedrockInference


def test_config_requires_model_and_region(monkeypatch):
    for name in ("CARESCRIBE_BEDROCK_MODEL_ID", "AWS_REGION", "AWS_DEFAULT_REGION"):
        monkeypatch.delenv(name, raising=False)
    with pytest.raises(ValueError, match="CARESCRIBE_BEDROCK_MODEL_ID"):
        BedrockConfig.from_env()


def test_generate_uses_bedrock_converse_only():
    client = Mock()
    client.converse.return_value = {"output": {"message": {"content": [{"text": "A clinical note draft"}]}}}
    inference = BedrockInference(BedrockConfig("example.model-v1", "us-west-2"), client=client)
    assert inference.generate("Draft a note") == "A clinical note draft"
    client.converse.assert_called_once_with(
        modelId="example.model-v1",
        messages=[{"role": "user", "content": [{"text": "Draft a note"}]}],
        inferenceConfig={"maxTokens": 256, "temperature": 0},
    )


def test_generate_rejects_empty_prompt():
    inference = BedrockInference(BedrockConfig("example.model-v1", "us-west-2"), client=Mock())
    with pytest.raises(ValueError, match="must not be empty"):
        inference.generate("  ")
