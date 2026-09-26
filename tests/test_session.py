from datetime import datetime, timedelta, timezone

import pytest

from carescribe.session import (
    Session,
    SessionDeletedError,
    SessionExpiredError,
    Speaker,
    TranscriptEvent,
)


NOW = datetime(2026, 9, 26, 18, 0, tzinfo=timezone.utc)


def event(event_id: str = "evt-1", sequence: int = 1) -> TranscriptEvent:
    return TranscriptEvent(
        event_id=event_id,
        speaker=Speaker.CHILD,
        text="More bubbles.",
        occurred_at=NOW,
        sequence=sequence,
    )


def test_transcript_event_requires_timezone_and_nonblank_text():
    with pytest.raises(ValueError):
        TranscriptEvent("evt-1", Speaker.CHILD, " ", NOW, 1)
    with pytest.raises(ValueError):
        TranscriptEvent(
            "evt-1", Speaker.CHILD, "hello", NOW.replace(tzinfo=None), 1
        )


def test_speaker_roles_match_the_three_party_workflow():
    assert {speaker.value for speaker in Speaker} == {
        "child",
        "caregiver",
        "clinician",
        "uncertain",
    }


def test_session_accepts_ordered_unique_events_before_expiry():
    session = Session("session-1", NOW, NOW + timedelta(hours=1))

    session.add_event(event(), now=NOW)
    session.add_event(event("evt-2", 2), now=NOW)

    assert tuple(item.event_id for item in session.transcript) == ("evt-1", "evt-2")
    with pytest.raises(ValueError):
        session.add_event(event("evt-1", 3), now=NOW)
    with pytest.raises(ValueError):
        session.add_event(event("evt-3", 2), now=NOW)


def test_expired_session_rejects_access_and_mutation():
    session = Session("session-1", NOW, NOW + timedelta(minutes=30))
    session.add_event(event(), now=NOW)

    with pytest.raises(SessionExpiredError):
        session.require_active(NOW + timedelta(minutes=30))
    with pytest.raises(SessionExpiredError):
        session.add_event(event("evt-2", 2), now=NOW + timedelta(hours=1))


def test_delete_clears_sensitive_data_and_is_irreversible():
    session = Session("session-1", NOW, NOW + timedelta(hours=1))
    session.add_event(event(), now=NOW)

    session.delete(NOW + timedelta(minutes=1))

    assert session.deleted_at == NOW + timedelta(minutes=1)
    assert session.transcript == ()
    with pytest.raises(SessionDeletedError):
        session.add_event(event("evt-2", 2), now=NOW + timedelta(minutes=2))
