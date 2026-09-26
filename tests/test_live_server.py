import json
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest

from carescribe.live_server import build_prompt, create_server


def request(url, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=2) as response:
            return response.status, json.load(response)
    except HTTPError as exc:
        return exc.code, json.load(exc)


def test_health_and_synthetic_bedrock_route(tmp_path: Path):
    (tmp_path / "index.html").write_text("demo")
    calls = []

    def fake_generate(task, text):
        calls.append((task, text))
        return "amazon.nova-micro-v1:0", '{"status":"NEEDS_REVIEW"}'

    server = create_server(
        "127.0.0.1",
        0,
        tmp_path,
        fake_generate,
        runtime_inspector=lambda _model_id: {
            "status": "loaded-now",
            "checked_at": "2026-09-26T22:00:00+00:00",
            "detail": "test runtime",
        },
        sonic_inspector=lambda: {
            "status": "bridge-running",
            "detail": "test bridge",
            "evidence": "live-smoke-verified",
        },
    )
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, health = request(f"{base}/api/health")
        assert status == 200
        assert health["inference_location"] == "remote"
        assert health["synthetic_only"] is True
        assert [model["status"] for model in health["models"]] == [
            "loaded-now",
            "invocation-verified",
            "invocation-verified",
            "bridge-running",
            "access-verified",
        ]

        status, result = request(
            f"{base}/api/bedrock",
            {"task": "atomize", "text": "Caregiver wonders about autism.", "synthetic": True},
        )
        assert status == 200
        assert result["requires_clinician_review"] is True
        assert calls == [("atomize", "Caregiver wonders about autism.")]
    finally:
        server.shutdown()
        server.server_close()


def test_rejects_non_synthetic_or_invalid_requests(tmp_path: Path):
    (tmp_path / "index.html").write_text("demo")
    server = create_server(
        "127.0.0.1",
        0,
        tmp_path,
        lambda task, text: ("should-not-run", "no"),
    )
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, body = request(
            f"{base}/api/bedrock",
            {"task": "atomize", "text": "real encounter", "synthetic": False},
        )
        assert status == 403
        assert body["error"] == "synthetic_demo_only"

        status, body = request(
            f"{base}/api/bedrock",
            {"task": "diagnose", "text": "anything", "synthetic": True},
        )
        assert status == 400
        assert body["error"] == "invalid_request"
    finally:
        server.shutdown()
        server.server_close()


def test_local_laptop_gate_returns_separate_private_and_public_views(tmp_path: Path):
    (tmp_path / "index.html").write_text("demo")
    local_calls = []

    def fake_local_gate(role, speaker, text, approved):
        local_calls.append((role, speaker, text, approved))
        return {
            "private_summary": text,
            "public_update": "Child emitted a loud vocalization; meaning remains unknown.",
            "disclosure": "LOCAL_ONLY",
            "uncertainty": "UNKNOWN",
            "reason": "Exact event and name remain on the laptop host.",
            "model": "qwen2.5:1.5b",
        }

    server = create_server(
        "127.0.0.1",
        0,
        tmp_path,
        lambda task, text: ("should-not-run", "no"),
        local_generator=fake_local_gate,
    )
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, result = request(
            f"{base}/api/local-gate",
            {
                "role": "child",
                "speaker": "Ari",
                "text": "[Scream / loud vocalization]",
                "approved": False,
                "synthetic": True,
            },
        )
        assert status == 200
        assert result["boundary"] == "local-laptop"
        assert result["inference_location"] == "local"
        assert result["disclosure"] == "LOCAL_ONLY"
        assert result["public_update"] == (
            "Child emitted a loud vocalization; meaning remains unknown."
        )
        assert local_calls == [
            ("child", "Ari", "[Scream / loud vocalization]", False)
        ]
    finally:
        server.shutdown()
        server.server_close()


def test_shared_room_accepts_only_minimized_public_updates(tmp_path: Path):
    (tmp_path / "index.html").write_text("demo")
    server = create_server("127.0.0.1", 0, tmp_path)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, published = request(
            f"{base}/api/room",
            {
                "room": "ROOM4",
                "role": "child",
                "public_update": "Child vocalized; meaning remains unknown.",
                "uncertainty": "UNKNOWN",
                "synthetic": True,
            },
        )
        assert status == 200
        assert published["accepted"] is True

        status, room = request(f"{base}/api/room?room=ROOM4")
        assert status == 200
        assert room["room"] == "ROOM4"
        assert len(room["events"]) == 1
        event = room["events"][0]
        assert len(event.pop("event_id")) == 32
        assert event == {
            "room": "ROOM4",
            "role": "child",
            "public_update": "Child vocalized; meaning remains unknown.",
            "uncertainty": "UNKNOWN",
        }
    finally:
        server.shutdown()
        server.server_close()


@pytest.mark.parametrize("forbidden_field", ["private_summary", "raw", "name", "speaker"])
def test_shared_room_rejects_private_raw_and_identity_fields(
    tmp_path: Path, forbidden_field: str
):
    (tmp_path / "index.html").write_text("demo")
    server = create_server("127.0.0.1", 0, tmp_path)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, rejected = request(
            f"{base}/api/room",
            {
                "room": "ROOM4",
                "role": "child",
                "public_update": "bounded",
                "uncertainty": "UNKNOWN",
                "synthetic": True,
                forbidden_field: "must remain local",
            },
        )
        assert status == 400
        assert rejected["error"] == "private_fields_forbidden"
    finally:
        server.shutdown()
        server.server_close()


def test_shared_room_history_is_bounded_and_isolated_by_room(tmp_path: Path):
    (tmp_path / "index.html").write_text("demo")
    server = create_server("127.0.0.1", 0, tmp_path)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        for number in range(101):
            status, _ = request(
                f"{base}/api/room",
                {
                    "room": "ROOM4",
                    "role": "provider",
                    "public_update": f"Update {number}",
                    "uncertainty": "KNOWN",
                    "synthetic": True,
                },
            )
            assert status == 200
        request(
            f"{base}/api/room",
            {
                "room": "OTHER",
                "role": "caregiver",
                "public_update": "Other room update",
                "uncertainty": "UNKNOWN",
                "synthetic": True,
            },
        )

        status, room = request(f"{base}/api/room?room=ROOM4")
        assert status == 200
        assert len(room["events"]) == 100
        assert room["events"][0]["public_update"] == "Update 1"
        assert room["events"][-1]["public_update"] == "Update 100"
        assert all(event["room"] == "ROOM4" for event in room["events"])
    finally:
        server.shutdown()
        server.server_close()


def test_prompt_forbids_promoting_caregiver_concern_to_diagnosis():
    prompt = build_prompt(
        "synthesize",
        "Caregiver: I read this could be autism. Is that what this means?",
    )
    assert "Do not diagnose" in prompt
    assert "caregiver-reported" in prompt
    assert "concern" in prompt
    assert "Do not convert concerns into diagnoses" in prompt
