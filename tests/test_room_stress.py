import json
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pytest

from carescribe.live_server import MAX_ROOM_EVENTS, create_server


def _request(url: str, body: dict[str, object] | None = None) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as exc:
        return exc.code, json.load(exc)


def _public_event(room: str, number: int) -> dict[str, object]:
    return {
        "room": room,
        "role": "caregiver",
        "public_update": f"Approved public update {number}",
        "uncertainty": "KNOWN",
        "synthetic": True,
    }


@contextmanager
def _running_server(web_root: Path):
    server = create_server("127.0.0.1", 0, web_root)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def _read_room(base_url: str, room: str) -> list[dict[str, object]]:
    status, result = _request(
        f"{base_url}/api/room?{urlencode({'room': room})}"
    )
    assert status == 200
    return result["events"]


def test_concurrent_approved_public_posts_are_all_retained(tmp_path: Path):
    total = 64
    with _running_server(tmp_path) as base_url:
        with ThreadPoolExecutor(max_workers=16) as workers:
            results = list(
                workers.map(
                    lambda number: _request(
                        f"{base_url}/api/room", _public_event("SHARED", number)
                    ),
                    range(total),
                )
            )

        assert results == [(200, {"accepted": True})] * total
        events = _read_room(base_url, "SHARED")
        assert len(events) == total
        assert {event["public_update"] for event in events} == {
            f"Approved public update {number}" for number in range(total)
        }


def test_concurrent_posts_remain_isolated_by_room(tmp_path: Path):
    per_room = 32
    submissions = [
        (room, number)
        for room in ("ALPHA", "BETA")
        for number in range(per_room)
    ]
    with _running_server(tmp_path) as base_url:
        with ThreadPoolExecutor(max_workers=16) as workers:
            results = list(
                workers.map(
                    lambda item: _request(
                        f"{base_url}/api/room", _public_event(*item)
                    ),
                    submissions,
                )
            )

        assert all(status == 200 for status, _ in results)
        for room in ("ALPHA", "BETA"):
            events = _read_room(base_url, room)
            assert len(events) == per_room
            assert {event["room"] for event in events} == {room}
            assert {event["public_update"] for event in events} == {
                f"Approved public update {number}" for number in range(per_room)
            }


def test_concurrent_posts_preserve_bounded_retention(tmp_path: Path):
    overflow = 24
    with _running_server(tmp_path) as base_url:
        for number in range(MAX_ROOM_EVENTS):
            status, _ = _request(
                f"{base_url}/api/room", _public_event("BOUNDED", number)
            )
            assert status == 200

        with ThreadPoolExecutor(max_workers=12) as workers:
            results = list(
                workers.map(
                    lambda number: _request(
                        f"{base_url}/api/room",
                        _public_event("BOUNDED", MAX_ROOM_EVENTS + number),
                    ),
                    range(overflow),
                )
            )

        assert all(status == 200 for status, _ in results)
        events = _read_room(base_url, "BOUNDED")
        retained = {event["public_update"] for event in events}
        assert len(events) == MAX_ROOM_EVENTS
        assert retained == {
            f"Approved public update {number}"
            for number in range(overflow, MAX_ROOM_EVENTS + overflow)
        }


def test_identical_posts_are_independent_without_an_idempotency_key(tmp_path: Path):
    event = _public_event("DUPLICATES", 7)
    stored_event = {key: value for key, value in event.items() if key != "synthetic"}
    with _running_server(tmp_path) as base_url:
        first = _request(f"{base_url}/api/room", event)
        second = _request(f"{base_url}/api/room", event)

        assert first == second == (200, {"accepted": True})
        events = _read_room(base_url, "DUPLICATES")
        assert len(events) == 2
        assert events[0]["event_id"] != events[1]["event_id"]
        assert [
            {key: value for key, value in item.items() if key != "event_id"}
            for item in events
        ] == [stored_event, stored_event]


@pytest.mark.parametrize(
    "private_field",
    ["private_summary", "raw", "name", "speaker", "text", "audio", "voice_features"],
)
def test_private_fields_are_rejected_without_mutating_the_room(
    tmp_path: Path, private_field: str
):
    payload = {
        **_public_event("PRIVATE-REJECTION", 1),
        private_field: "must remain device-private",
    }
    with _running_server(tmp_path) as base_url:
        status, result = _request(f"{base_url}/api/room", payload)

        assert status == 400
        assert result == {"error": "private_fields_forbidden"}
        assert _read_room(base_url, "PRIVATE-REJECTION") == []
