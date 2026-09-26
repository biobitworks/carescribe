"""Evidence-linked, clinician-reviewed descriptive observations."""

from dataclasses import dataclass, replace
from datetime import datetime
from enum import Enum


def _require_aware(value: datetime, field_name: str) -> None:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field_name} must be timezone-aware")


def _require_text(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must not be blank")


class ObservationKind(str, Enum):
    """Descriptive categories only; diagnoses and prescriptions are excluded."""

    REPORTED_SYMPTOM = "reported_symptom"
    REPORTED_HISTORY = "reported_history"
    CLINICAL_MEASUREMENT = "clinical_measurement"
    CARE_CONTEXT = "care_context"
    FOLLOW_UP_QUESTION = "follow_up_question"


class ObservationStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"


@dataclass(frozen=True)
class Observation:
    """A model- or human-drafted statement grounded in transcript evidence."""

    observation_id: str
    session_id: str
    kind: ObservationKind
    summary: str
    evidence_event_ids: tuple[str, ...]
    created_at: datetime
    status: ObservationStatus = ObservationStatus.PENDING_REVIEW
    approved_by: str | None = None
    approved_at: datetime | None = None

    def __post_init__(self) -> None:
        _require_text(self.observation_id, "observation_id")
        _require_text(self.session_id, "session_id")
        _require_text(self.summary, "summary")
        _require_aware(self.created_at, "created_at")
        if not isinstance(self.kind, ObservationKind):
            raise ValueError(
                "kind must be a descriptive ObservationKind; diagnosis and "
                "treatment prescription are not supported"
            )
        if not self.evidence_event_ids:
            raise ValueError("at least one evidence event is required")
        if len(set(self.evidence_event_ids)) != len(self.evidence_event_ids):
            raise ValueError("evidence event IDs must be unique")
        for event_id in self.evidence_event_ids:
            _require_text(event_id, "evidence event ID")
        if self.status is ObservationStatus.PENDING_REVIEW:
            if self.approved_by is not None or self.approved_at is not None:
                raise ValueError("pending observations cannot have approval metadata")
        elif self.status is ObservationStatus.APPROVED:
            _require_text(self.approved_by, "approved_by")  # type: ignore[arg-type]
            if self.approved_at is None:
                raise ValueError("approved_at is required for approval")
            _require_aware(self.approved_at, "approved_at")
        else:
            raise ValueError("invalid observation status")

    def approve(self, clinician_id: str, approved_at: datetime) -> "Observation":
        if self.status is not ObservationStatus.PENDING_REVIEW:
            raise ValueError("observation has already been approved")
        _require_text(clinician_id, "clinician_id")
        _require_aware(approved_at, "approved_at")
        return replace(
            self,
            status=ObservationStatus.APPROVED,
            approved_by=clinician_id,
            approved_at=approved_at,
        )

