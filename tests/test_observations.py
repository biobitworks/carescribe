from datetime import datetime, timezone

import pytest

from carescribe.observations import (
    Observation,
    ObservationKind,
    ObservationStatus,
)


NOW = datetime(2026, 9, 26, 18, 0, tzinfo=timezone.utc)


def draft(**overrides) -> Observation:
    values = {
        "observation_id": "obs-1",
        "session_id": "session-1",
        "kind": ObservationKind.REPORTED_SYMPTOM,
        "summary": "Patient reports knee pain for three days.",
        "evidence_event_ids": ("evt-1",),
        "created_at": NOW,
    }
    values.update(overrides)
    return Observation(**values)


def test_observation_requires_evidence_and_descriptive_kind():
    with pytest.raises(ValueError):
        draft(evidence_event_ids=())
    with pytest.raises(ValueError):
        draft(evidence_event_ids=("evt-1", "evt-1"))
    with pytest.raises(ValueError):
        draft(kind="diagnosis")
    with pytest.raises(ValueError):
        draft(kind="treatment_prescription")


def test_model_observation_starts_unapproved():
    observation = draft()

    assert observation.status is ObservationStatus.PENDING_REVIEW
    assert observation.approved_by is None
    assert observation.approved_at is None


def test_only_identified_clinician_can_approve_with_timezone_aware_time():
    observation = draft()

    with pytest.raises(ValueError):
        observation.approve("", NOW)
    with pytest.raises(ValueError):
        observation.approve("clinician-7", NOW.replace(tzinfo=None))

    approved = observation.approve("clinician-7", NOW)

    assert approved.status is ObservationStatus.APPROVED
    assert approved.approved_by == "clinician-7"
    assert approved.approved_at == NOW
    assert observation.status is ObservationStatus.PENDING_REVIEW


def test_approval_is_single_use():
    approved = draft().approve("clinician-7", NOW)

    with pytest.raises(ValueError):
        approved.approve("clinician-8", NOW)
