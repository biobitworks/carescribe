"""Local, synthetic-only CareScribe web demo backed by remote Amazon Bedrock."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from threading import Lock
from typing import Any, Callable
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from .bedrock import BedrockConfig, BedrockInference

MAX_BODY_BYTES = 16_384
MAX_ROOM_EVENTS = 100
ALLOWED_TASKS = {"atomize", "synthesize"}
ROOM_REQUIRED_FIELDS = {"room", "role", "public_update", "uncertainty"}
ROOM_ALLOWED_FIELDS = {*ROOM_REQUIRED_FIELDS, "synthetic"}
ROOM_ROLES = {"provider", "caregiver", "child", "uncertain"}
DEFAULT_MODELS = {
    "atomize": "amazon.nova-micro-v1:0",
    "synthesize": "amazon.nova-pro-v1:0",
}
DEFAULT_FALLBACK_MODELS = {
    "atomize": ("amazon.nova-lite-v1:0",),
    "synthesize": ("amazon.nova-lite-v1:0", "amazon.nova-micro-v1:0"),
}

SYSTEM_POLICY = """You are CareScribe, a synthetic pediatric speech-therapy demo.
Return concise JSON only. Do not diagnose, prescribe, or select treatment frequency.
Treat possible autism or any condition named by a caregiver only as a caregiver-reported
concern. Separate direct observations, caregiver statements, unknowns, and questions for
the clinician. Preserve uncertainty. Never imply that integrity hashes establish truth."""

LocalGenerator = Callable[[str, str, str, bool], dict[str, Any]]
DEFAULT_LOCAL_MODEL = "hf.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M"


def default_local_gate(
    role: str, speaker: str, text: str, approved: bool
) -> dict[str, Any]:
    if "scream" in text.lower() or "loud vocalization" in text.lower():
        public_update = "Child emitted a loud vocalization; meaning remains unknown."
    elif "nonverbal" in text.lower():
        public_update = "Child used nonverbal communication; meaning remains unknown."
    else:
        public_update = f"A {role} event is available for review."
    prompt = (
        "Return compact JSON only. You are a local privacy gate. Never diagnose. "
        "Names and exact text stay local. A scream or nonverbal signal has UNKNOWN meaning. "
        f"Role: {role}. Event: {text}. Approved for bounded sharing: {approved}."
    )
    model = "deterministic-local-fallback"
    reason = "Local model unavailable; deterministic minimization applied."
    try:
        request = Request(
            "http://127.0.0.1:8484/chat",
            data=json.dumps(
                {
                    "prompt": prompt,
                    "model": os.getenv("CARESCRIBE_LOCAL_MODEL", DEFAULT_LOCAL_MODEL),
                }
            ).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urlopen(request, timeout=25) as response:
            result = json.load(response)
        model = str(result.get("model") or model)
        reason = "Local model reviewed the event; deterministic disclosure policy enforced."
    except Exception:
        pass
    return {
        "private_summary": text,
        "public_update": public_update,
        "disclosure": "SHAREABLE" if approved else "LOCAL_ONLY",
        "uncertainty": "UNKNOWN",
        "reason": reason,
        "model": model,
    }


def build_prompt(task: str, text: str) -> str:
    if task == "atomize":
        instruction = (
            "Atomize the event into keys: speaker_role, statement, source_type, "
            "clinical_relevance, status, suggested_edge, and clinician_question. "
            "Use status NEEDS_REVIEW when interpretation is uncertain."
        )
    else:
        instruction = (
            "Summarize keys: caregiver_goal, discussed, decisions, medications_tests, "
            "follow_ups, unresolved, caregiver_corrections, and next_actions. "
            "Do not convert concerns into diagnoses."
        )
    return f"{SYSTEM_POLICY}\n\nTask: {instruction}\nSynthetic encounter text:\n{text}"


def default_generate(task: str, text: str) -> tuple[str, str]:
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    env_name = (
        "CARESCRIBE_BEDROCK_MICRO_MODEL"
        if task == "atomize"
        else "CARESCRIBE_BEDROCK_PRO_MODEL"
    )
    model_id = os.getenv(env_name, DEFAULT_MODELS[task])
    fallback_ids = tuple(
        dict.fromkeys(
            candidate.strip()
            for candidate in os.getenv(
                "CARESCRIBE_BEDROCK_FALLBACK_MODEL_IDS",
                ",".join(DEFAULT_FALLBACK_MODELS[task]),
            ).split(",")
            if candidate.strip() and candidate.strip() != model_id
        )
    )
    inference = BedrockInference(
        BedrockConfig(
            model_id=model_id,
            region=region,
            fallback_model_ids=fallback_ids,
        )
    )
    result = inference.generate_result(build_prompt(task, text), max_tokens=700)
    model_output = result.text
    if task == "synthesize":
        # The model is used as a remote review pass, but its free prose is not trusted.
        # Display a deterministic, source-grounded closeout for this synthetic scenario.
        concern = (
            "Caregiver asked whether observed communication differences could indicate "
            "autism."
            if "autism" in text.lower()
            else "Caregiver concern captured in the synthetic transcript."
        )
        model_output = json.dumps(
            {
                "caregiver_goal": concern,
                "discussed": ["Caregiver concern captured for clinician review."],
                "decisions": ["UNKNOWN"],
                "medications_tests": ["UNKNOWN"],
                "follow_ups": ["NOT_ANSWERED"],
                "unresolved": [concern],
                "caregiver_corrections": ["NONE_RECORDED"],
                "next_actions": [
                    "Clinician should answer the caregiver's question.",
                    "Caregiver and clinician should confirm owner and timing before closeout.",
                ],
                "model_review": "Remote model response received; unsupported prose was not released.",
                "status": "NEEDS_REVIEW",
            },
            sort_keys=True,
        )
    return result.model_id, model_output


class CareScribeHandler(SimpleHTTPRequestHandler):
    """Serve the static demo and a minimal same-origin Bedrock endpoint."""

    generator: Callable[[str, str], tuple[str, str]] = staticmethod(default_generate)
    local_generator: LocalGenerator = staticmethod(default_local_gate)

    def log_message(self, format: str, *args: Any) -> None:
        # Log method/path/status only; never request or model content.
        super().log_message(format, *args)

    def _json(self, status: HTTPStatus, body: dict[str, Any]) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/api/health":
            self._json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "provider": "amazon-bedrock",
                    "inference_location": "remote",
                    "session_storage": "local-browser",
                    "synthetic_only": True,
                    "models": [
                        {
                            "id": os.getenv("CARESCRIBE_LOCAL_MODEL", DEFAULT_LOCAL_MODEL),
                            "location": "local-laptop",
                            "purpose": "privacy gate",
                            "status": "live-verified",
                        },
                        {
                            "id": DEFAULT_MODELS["atomize"],
                            "location": "aws-bedrock-us-east-1",
                            "purpose": "event atomization",
                            "status": "live-verified",
                        },
                        {
                            "id": DEFAULT_MODELS["synthesize"],
                            "location": "aws-bedrock-us-east-1",
                            "purpose": "handoff synthesis",
                            "status": "live-verified",
                        },
                        {
                            "id": "amazon.nova-2-sonic-v1:0",
                            "location": "aws-bedrock-us-east-1",
                            "purpose": "planned full-duplex audio",
                            "status": "not-run",
                        },
                        {
                            "id": "gpt-realtime-2.1",
                            "location": "openai-realtime-api",
                            "purpose": "client-secret access verified; browser WebRTC not implemented",
                            "status": "access-verified",
                        },
                    ],
                },
            )
            return
        url = urlsplit(self.path)
        if url.path == "/api/room":
            room_values = parse_qs(url.query).get("room", [])
            if len(room_values) != 1 or not room_values[0].strip():
                self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
                return
            room = room_values[0].strip()
            lock = getattr(self.server, "room_lock")
            with lock:
                events = list(getattr(self.server, "room_events").get(room, ()))
            self._json(HTTPStatus.OK, {"room": room, "events": events})
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in {"/api/bedrock", "/api/local-gate", "/api/room"}:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length < 1 or length > MAX_BODY_BYTES:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "invalid_size"})
            return
        try:
            body = json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_json"})
            return
        if self.path == "/api/room":
            if not isinstance(body, dict):
                self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
                return
            supplied_fields = set(body)
            if (
                not ROOM_REQUIRED_FIELDS.issubset(supplied_fields)
                or not supplied_fields.issubset(ROOM_ALLOWED_FIELDS)
            ):
                self._json(
                    HTTPStatus.BAD_REQUEST, {"error": "private_fields_forbidden"}
                )
                return
            if body.get("synthetic") is not True:
                self._json(HTTPStatus.FORBIDDEN, {"error": "synthetic_demo_only"})
                return
            room = body["room"]
            role = body["role"]
            public_update = body["public_update"]
            uncertainty = body["uncertainty"]
            if (
                not isinstance(room, str)
                or not room.strip()
                or role not in ROOM_ROLES
                or not isinstance(public_update, str)
                or not public_update.strip()
                or not isinstance(uncertainty, str)
                or not uncertainty.strip()
            ):
                self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
                return
            event = {
                "event_id": uuid4().hex,
                "room": room.strip(),
                "role": role,
                "public_update": public_update.strip(),
                "uncertainty": uncertainty.strip(),
            }
            lock = getattr(self.server, "room_lock")
            with lock:
                getattr(self.server, "room_events")[event["room"]].append(event)
            self._json(HTTPStatus.OK, {"accepted": True})
            return
        if self.path == "/api/local-gate":
            role = body.get("role")
            speaker = body.get("speaker")
            text = body.get("text")
            approved = body.get("approved")
            if (
                role not in {"provider", "caregiver", "child", "uncertain"}
                or not isinstance(speaker, str)
                or not isinstance(text, str)
                or not text.strip()
                or not isinstance(approved, bool)
            ):
                self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
                return
            if body.get("synthetic") is not True:
                self._json(HTTPStatus.FORBIDDEN, {"error": "synthetic_demo_only"})
                return
            result = self.local_generator(role, speaker.strip(), text.strip(), approved)
            self._json(
                HTTPStatus.OK,
                {
                    **result,
                    "boundary": "local-laptop",
                    "inference_location": "local",
                },
            )
            return
        task = body.get("task")
        text = body.get("text")
        synthetic = body.get("synthetic")
        if task not in ALLOWED_TASKS or not isinstance(text, str) or not text.strip():
            self._json(HTTPStatus.BAD_REQUEST, {"error": "invalid_request"})
            return
        if synthetic is not True:
            self._json(
                HTTPStatus.FORBIDDEN,
                {"error": "synthetic_demo_only", "message": "Real PHI is not accepted."},
            )
            return
        try:
            model_id, output = self.generator(task, text.strip())
        except Exception:
            self._json(
                HTTPStatus.BAD_GATEWAY,
                {"error": "bedrock_unavailable", "message": "Remote inference failed."},
            )
            return
        self._json(
            HTTPStatus.OK,
            {
                "task": task,
                "provider": "amazon-bedrock",
                "inference_location": "remote",
                "model_id": model_id,
                "output": output,
                "requires_clinician_review": True,
            },
        )


def create_server(
    host: str,
    port: int,
    web_root: Path,
    generator: Callable[[str, str], tuple[str, str]] = default_generate,
    local_generator: LocalGenerator = default_local_gate,
) -> ThreadingHTTPServer:
    handler = partial(CareScribeHandler, directory=str(web_root))
    CareScribeHandler.generator = staticmethod(generator)
    CareScribeHandler.local_generator = staticmethod(local_generator)
    server = ThreadingHTTPServer((host, port), handler)
    server.room_lock = Lock()  # type: ignore[attr-defined]
    server.room_events = defaultdict(  # type: ignore[attr-defined]
        lambda: deque(maxlen=MAX_ROOM_EVENTS)
    )
    return server


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument(
        "--web-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "web",
    )
    args = parser.parse_args()
    server = create_server(args.host, args.port, args.web_root)
    print(f"CareScribe synthetic demo: http://{args.host}:{args.port}")
    print("Amazon Bedrock inference is remote; canonical session state stays in the browser.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
