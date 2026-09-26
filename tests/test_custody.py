import json

import pytest

from carescribe.custody import (
    PRESERVED_VALUES,
    CustodyLedger,
    FCO,
    FCGEdge,
    MMRAccumulator,
    canonical_bytes,
)


BASE = {
    "timestamp": "2026-09-26T19:00:00Z",
    "speaker": "caregiver",
    "role": "caregiver",
    "statement": "The recorded time was incorrect.",
    "observation": "CAREGIVER_CORRECTION",
    "confidence": "NEEDS_REVIEW",
    "source": "local transcript",
    "clinical_relevance": "UNKNOWN",
    "status": "UNCERTAIN",
}


def test_canonical_bytes_are_stable_across_mapping_order_and_unicode():
    left = {"z": "café", "a": {"b": 2, "a": 1}}
    right = {"a": {"a": 1, "b": 2}, "z": "café"}

    assert canonical_bytes(left) == canonical_bytes(right)
    assert canonical_bytes(left) == '{"a":{"a":1,"b":2},"z":"café"}'.encode()


def test_fco_hash_is_deterministic_and_integrity_detects_mutation():
    first = FCO.create(**BASE)
    second = FCO.create(**dict(reversed(list(BASE.items()))))

    assert first.id == second.id
    assert first.hash == first.id
    assert first.verify_integrity()
    assert not FCO.from_dict({**first.to_dict(), "status": "VERIFIED"}).verify_integrity()


def test_ledger_correction_appends_successor_and_keeps_predecessor():
    ledger = CustodyLedger()
    original = ledger.append_fco(FCO.create(**BASE))
    correction = ledger.correct(
        original.id,
        timestamp="2026-09-26T19:05:00Z",
        speaker="caregiver",
        role="caregiver",
        statement="The corrected time remains unconfirmed.",
        observation="CAREGIVER_CORRECTION",
        confidence="NEEDS_REVIEW",
        source="local transcript",
        clinical_relevance="UNKNOWN",
        status="UNCERTAIN",
    )

    assert len(ledger.fcos) == 2
    assert ledger.fcos[0] is original
    assert correction.predecessor_id == original.id
    assert ledger.edges[-1] == FCGEdge(
        source=original.id, target=correction.id, kind="CAREGIVER_CORRECTION"
    )


def test_fcg_rejects_edge_types_outside_the_closed_vocabulary():
    with pytest.raises(ValueError, match="edge kind"):
        FCGEdge(source="a", target="b", kind="DIAGNOSIS")


def test_preserved_uncertainty_values_round_trip_without_coercion():
    for value in PRESERVED_VALUES:
        fco = FCO.create(**{**BASE, "statement": value, "observation": value})
        restored = FCO.from_dict(json.loads(json.dumps(fco.to_dict())))
        assert restored.statement == value
        assert restored.observation == value


def test_mmr_peaks_are_append_only_and_root_is_order_sensitive():
    ids = [FCO.create(**{**BASE, "timestamp": f"2026-09-26T19:0{i}:00Z"}).id for i in range(3)]
    mmr = MMRAccumulator()

    roots = [mmr.append(item) for item in ids]

    assert mmr.size == 3
    assert len(mmr.peaks) == 2
    assert len(set(roots)) == 3
    reversed_mmr = MMRAccumulator(ids=reversed(ids))
    assert reversed_mmr.root != mmr.root
    assert MMRAccumulator(ids=ids).root == mmr.root


def test_ledger_rejects_replacement_and_missing_correction_target():
    ledger = CustodyLedger()
    item = ledger.append_fco(FCO.create(**BASE))

    with pytest.raises(ValueError, match="already exists"):
        ledger.append_fco(item)
    with pytest.raises(KeyError):
        ledger.correct("0" * 64, **BASE)
