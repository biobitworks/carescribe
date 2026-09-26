from unittest.mock import Mock

import pytest

from carescribe.bedrock import BedrockConfig, BedrockInference


class BedrockClientError(Exception):
    def __init__(self, code, *, status=400):
        super().__init__(code)
        self.response = {
            "Error": {"Code": code, "Message": code},
            "ResponseMetadata": {"HTTPStatusCode": status},
        }


class SequencedClient:
    def __init__(self, outcomes):
        self.outcomes = iter(outcomes)
        self.model_ids = []

    def converse(self, **kwargs):
        self.model_ids.append(kwargs["modelId"])
        outcome = next(self.outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return {"output": {"message": {"content": [{"text": outcome}]}}}


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


def test_config_reads_comma_separated_fallbacks_in_order(monkeypatch):
    monkeypatch.setenv("CARESCRIBE_BEDROCK_MODEL_ID", "primary")
    monkeypatch.setenv("CARESCRIBE_BEDROCK_FALLBACK_MODEL_IDS", " fallback-a, fallback-b, fallback-a ")
    monkeypatch.setenv("AWS_REGION", "us-west-2")

    assert BedrockConfig.from_env().fallback_model_ids == ("fallback-a", "fallback-b")


def test_generate_result_tries_primary_then_fallback_and_records_selected_model():
    client = SequencedClient(
        [BedrockClientError("ThrottlingException", status=429), "fallback response"]
    )
    inference = BedrockInference(
        BedrockConfig("primary", "us-west-2", ("fallback-a", "fallback-b")),
        client=client,
    )

    result = inference.generate_result("Draft a note")

    assert client.model_ids == ["primary", "fallback-a"]
    assert result.text == "fallback response"
    assert result.model_id == "fallback-a"


def test_access_denial_does_not_try_fallback():
    denied = BedrockClientError("AccessDeniedException", status=403)
    client = SequencedClient([denied, "must not be used"])
    inference = BedrockInference(
        BedrockConfig("primary", "us-west-2", ("fallback",)),
        client=client,
    )

    with pytest.raises(BedrockClientError) as raised:
        inference.generate("Draft a note")

    assert raised.value is denied
    assert client.model_ids == ["primary"]


def test_all_retryable_failures_raise_the_last_error_after_ordered_attempts():
    unavailable = BedrockClientError("ModelNotReadyException", status=429)
    service_failure = BedrockClientError("ServiceUnavailableException", status=503)
    client = SequencedClient([unavailable, service_failure])
    inference = BedrockInference(
        BedrockConfig("primary", "us-west-2", ("fallback",)),
        client=client,
    )

    with pytest.raises(BedrockClientError) as raised:
        inference.generate("Draft a note")

    assert raised.value is service_failure
    assert client.model_ids == ["primary", "fallback"]
