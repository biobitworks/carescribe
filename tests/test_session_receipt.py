import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
RECEIPT_PATH = ROOT / "web" / "session-receipt.json"


def canonical_bytes(value):
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def test_observed_session_receipt_payload_hash_and_terminal_reset():
    receipt = json.loads(RECEIPT_PATH.read_text())

    assert hashlib.sha256(canonical_bytes(receipt["payload"])).hexdigest() == receipt["payload_sha256"]

    timeline = receipt["payload"]["visible_page_timeline"]
    active_counts = [event["checkpoint_events"] for event in timeline[1:-1]]
    assert active_counts == [2, 4, 6, 8, 9, 11]
    assert timeline[-1]["checkpoint_events"] == 0
    assert timeline[-1]["checkpoint_root"] == "none"


def test_observed_session_receipt_preserves_claim_boundary():
    payload = json.loads(RECEIPT_PATH.read_text())["payload"]

    assert payload["session_outcomes"]["public_minimized_update_approval_observed"] is False
    assert payload["session_outcomes"]["speaker_diarization_proved"] is False
    assert payload["runtime_observed"]["provider_deletion"] == "UNKNOWN"
    assert payload["backend_transport_corroboration"]["attribution"] == "CORROBORATING_ONLY"
