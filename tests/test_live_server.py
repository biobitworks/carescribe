import json
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

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

    server = create_server("127.0.0.1", 0, tmp_path, fake_generate)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        status, health = request(f"{base}/api/health")
        assert status == 200
        assert health["inference_location"] == "remote"
        assert health["synthetic_only"] is True

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


def test_prompt_forbids_promoting_caregiver_concern_to_diagnosis():
    prompt = build_prompt(
        "synthesize",
        "Caregiver: I read this could be autism. Is that what this means?",
    )
    assert "Do not diagnose" in prompt
    assert "caregiver-reported" in prompt
    assert "concern" in prompt
    assert "Do not convert concerns into diagnoses" in prompt
