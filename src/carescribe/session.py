"""Privacy-conscious domain types for a time-limited transcription session."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


def _require_aware(value: datetime, field_name: str) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field_name} must be timezone-aware")


def _require_text(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must not be blank")


class Speaker(str, Enum):
    CHILD = "child"
    CAREGIVER = "caregiver"
    CLINICIAN = "clinician"
    UNCERTAIN = "uncertain"


@dataclass(frozen=True)
class TranscriptEvent:
    """A speaker-attributed transcript fragment with stable evidence identity."""

    event_id: str
    speaker: Speaker
    text: str
    occurred_at: datetime
    sequence: int
    is_final: bool = True

    def __post_init__(self) -> None:
        _require_text(self.event_id, "event_id")
        _require_text(self.text, "text")
        if not isinstance(self.speaker, Speaker):
            raise ValueError("speaker must be a Speaker")
        _require_aware(self.occurred_at, "occurred_at")
        if not isinstance(self.sequence, int) or isinstance(self.sequence, bool):
            raise ValueError("sequence must be an integer")
        if self.sequence < 0:
            raise ValueError("sequence must be non-negative")


class SessionUnavailableError(RuntimeError):
    """Base class for unavailable session states."""


class SessionExpiredError(SessionUnavailableError):
    pass


class SessionDeletedError(SessionUnavailableError):
    pass


class Session:
    """Owns transient transcript data and enforces its retention boundary."""

    def __init__(
        self, session_id: str, created_at: datetime, expires_at: datetime
    ) -> None:
        _require_text(session_id, "session_id")
        _require_aware(created_at, "created_at")
        _require_aware(expires_at, "expires_at")
        if expires_at <= created_at:
            raise ValueError("expires_at must be later than created_at")
        self.session_id = session_id
        self.created_at = created_at
        self.expires_at = expires_at
        self.deleted_at: datetime | None = None
        self._events: list[TranscriptEvent] = []

    @property
    def transcript(self) -> tuple[TranscriptEvent, ...]:
        return tuple(self._events)

    def require_active(self, now: datetime) -> None:
        _require_aware(now, "now")
        if self.deleted_at is not None:
            raise SessionDeletedError("session has been deleted")
        if now >= self.expires_at:
            raise SessionExpiredError("session has expired")

    def add_event(self, event: TranscriptEvent, *, now: datetime) -> None:
        self.require_active(now)
        if not isinstance(event, TranscriptEvent):
            raise TypeError("event must be a TranscriptEvent")
        if any(existing.event_id == event.event_id for existing in self._events):
            raise ValueError("event_id must be unique within a session")
        if self._events and event.sequence <= self._events[-1].sequence:
            raise ValueError("event sequence must increase")
        self._events.append(event)

    def delete(self, deleted_at: datetime) -> None:
        _require_aware(deleted_at, "deleted_at")
        if self.deleted_at is not None:
            raise SessionDeletedError("session has already been deleted")
        self._events.clear()
        self.deleted_at = deleted_at
