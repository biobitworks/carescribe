import base64

import pytest

from carescribe.sonic_server import (
    BrowserProtocolError,
    MODEL_ID,
    SonicRuntimeState,
    create_app,
    decode_browser_input,
    encode_browser_output,
)


def test_audio_input_is_strictly_bounded_and_decoded():
    audio = b"\x00\x01\x02\x03"
    decoded = decode_browser_input(
        {
            "type": "bidi_audio_input",
            "audio": base64.b64encode(audio).decode(),
            "format": "pcm",
            "sample_rate": 16_000,
            "channels": 1,
        }
    )
    assert decoded == {
        "audio_delta": {"format": "pcm", "source": {"bytes": audio}}
    }

    with pytest.raises(BrowserProtocolError, match="unexpected_audio_fields"):
        decode_browser_input(
            {
                "type": "bidi_audio_input",
                "audio": base64.b64encode(audio).decode(),
                "format": "pcm",
                "sample_rate": 16_000,
                "channels": 1,
                "speaker_name": "must-not-cross",
            }
        )


@pytest.mark.parametrize(
    "payload,error",
    [
        ({"type": "unknown"}, "unsupported_event_type"),
        ({"type": "bidi_text_input", "text": ""}, "text_required"),
        (
            {
                "type": "bidi_audio_input",
                "audio": "not base64!",
                "format": "pcm",
                "sample_rate": 16_000,
                "channels": 1,
            },
            "invalid_base64",
        ),
        (
            {
                "type": "bidi_audio_input",
                "audio": "AA==",
                "format": "pcm",
                "sample_rate": 16_000,
                "channels": 1,
            },
            "invalid_audio_size",
        ),
    ],
)
def test_invalid_browser_events_fail_closed(payload, error):
    with pytest.raises(BrowserProtocolError, match=error):
        decode_browser_input(payload)


def test_output_mapping_releases_only_browser_protocol_fields():
    outgoing = encode_browser_output(
        {
            "type": "bidi_transcript_stop",
            "transcript": "Synthetic result.",
            "role": "assistant",
            "content_id": "private-upstream-id",
            "debug": "must-not-cross",
        }
    )
    assert outgoing == {
        "type": "bidi_transcript_stream",
        "text": "Synthetic result.",
        "role": "assistant",
        "is_final": True,
    }
    assert encode_browser_output({"type": "bidi_usage", "totalTokens": 9}) is None


def test_ping_and_websocket_connection_use_content_free_runtime_state():
    from fastapi.testclient import TestClient

    state = SonicRuntimeState()

    class FakeAgent:
        async def run(self, inputs, outputs, invocation_state):
            assert invocation_state == {"synthetic_only": True}
            await outputs[0](
                {
                    "type": "bidi_connection_start",
                    "model": MODEL_ID,
                    "connection_id": "not-released",
                }
            )

        async def stop(self):
            return None

    with TestClient(create_app(lambda: FakeAgent(), state)) as client:
        ping = client.get("/ping")
        assert ping.status_code == 200
        assert ping.json()["model_id"] == MODEL_ID
        assert ping.json()["evidence_status"] == "live-smoke-verified"
        assert ping.json()["transcript_events"] == 0
        assert "transcript_text" not in ping.json()

        with client.websocket_connect(
            "/ws?synthetic=true&consent=true",
            headers={"origin": "http://127.0.0.1:8080"},
        ) as websocket:
            assert websocket.receive_json() == {
                "type": "bidi_connection_start",
                "model": MODEL_ID,
            }

    assert state.model_connections == 1
    assert state.completed_sessions == 1
    assert state.active_sessions == 0


def test_websocket_rejects_missing_consent_before_agent_creation():
    from fastapi.testclient import TestClient
    from starlette.websockets import WebSocketDisconnect

    created = []
    with TestClient(create_app(lambda: created.append(True))) as client:
        with pytest.raises(WebSocketDisconnect) as error:
            with client.websocket_connect(
                "/ws?synthetic=true",
                headers={"origin": "http://127.0.0.1:8080"},
            ):
                pass
    assert error.value.code == 4403
    assert created == []
