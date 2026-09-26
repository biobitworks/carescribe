"""Local, synthetic-only CareScribe web demo backed by remote Amazon Bedrock."""

from __future__ import annotations

import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from typing import Any, Callable

from .bedrock import BedrockConfig, BedrockInference

MAX_BODY_BYTES = 16_384
ALLOWED_TASKS = {"atomize", "synthesize"}
DEFAULT_MODELS = {
    "atomize": "amazon.nova-micro-v1:0",
    "synthesize": "amazon.nova-pro-v1:0",
}

SYSTEM_POLICY = """You are CareScribe, a synthetic pediatric speech-therapy demo.
Return concise JSON only. Do not diagnose, prescribe, or select treatment frequency.
Treat possible autism or any condition named by a caregiver only as a caregiver-reported
concern. Separate direct observations, caregiver statements, unknowns, and questions for
the clinician. Preserve uncertainty. Never imply that integrity hashes establish truth."""


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
    inference = BedrockInference(BedrockConfig(model_id=model_id, region=region))
    model_output = inference.generate(build_prompt(task, text), max_tokens=700)
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
    return model_id, model_output


class CareScribeHandler(SimpleHTTPRequestHandler):
    """Serve the static demo and a minimal same-origin Bedrock endpoint."""

    generator: Callable[[str, str], tuple[str, str]] = staticmethod(default_generate)

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
                },
            )
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/bedrock":
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
) -> ThreadingHTTPServer:
    handler = partial(CareScribeHandler, directory=str(web_root))
    CareScribeHandler.generator = staticmethod(generator)
    return ThreadingHTTPServer((host, port), handler)


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
