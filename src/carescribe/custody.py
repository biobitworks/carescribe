"""Deterministic, local-only custody records and append-only hash peaks."""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import math
from typing import Any, Iterable, Mapping


FCG_EDGE_TYPES = frozenset(
    {
        "SYMPTOM",
        "QUESTION",
        "ANSWER",
        "MEDICATION",
        "TEST",
        "DECISION",
        "FOLLOW_UP",
        "CONCERN",
        "CONTRADICTION",
        "UNRESOLVED",
        "CAREGIVER_CORRECTION",
    }
)
PRESERVED_VALUES = frozenset(
    {"UNKNOWN", "NOT_ANSWERED", "UNCERTAIN", "NEEDS_REVIEW"}
)


def canonical_bytes(value: Any) -> bytes:
    """Return deterministic UTF-8 JSON bytes; floats are intentionally excluded."""

    def validate(item: Any) -> None:
        if isinstance(item, float):
            if not math.isfinite(item):
                raise ValueError("canonical JSON does not allow non-finite numbers")
            raise TypeError("canonical JSON for custody records does not allow floats")
        if item is None or isinstance(item, (str, bool, int)):
            return
        if isinstance(item, Mapping):
            if not all(isinstance(key, str) for key in item):
                raise TypeError("canonical JSON object keys must be strings")
            for child in item.values():
                validate(child)
            return
        if isinstance(item, (list, tuple)):
            for child in item:
                validate(child)
            return
        raise TypeError(f"unsupported canonical JSON value: {type(item).__name__}")

    validate(value)
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")


def _digest(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


@dataclass(frozen=True, slots=True)
class FCO:
    id: str
    hash: str
    timestamp: str
    speaker: str
    role: str
    statement: str
    observation: str
    confidence: str
    source: str
    clinical_relevance: str
    status: str
    predecessor_id: str | None = None

    @classmethod
    def create(
        cls,
        *,
        timestamp: str,
        speaker: str,
        role: str,
        statement: str,
        observation: str,
        confidence: str,
        source: str,
        clinical_relevance: str,
        status: str,
        predecessor_id: str | None = None,
    ) -> FCO:
        payload = {
            "timestamp": timestamp,
            "speaker": speaker,
            "role": role,
            "statement": statement,
            "observation": observation,
            "confidence": confidence,
            "source": source,
            "clinical_relevance": clinical_relevance,
            "status": status,
        }
        if predecessor_id is not None:
            payload["predecessor_id"] = predecessor_id
        record_hash = _digest(payload)
        return cls(id=record_hash, hash=record_hash, **payload)

    @classmethod
    def from_dict(cls, value: Mapping[str, Any]) -> FCO:
        return cls(
            id=value["id"],
            hash=value["hash"],
            timestamp=value["timestamp"],
            speaker=value["speaker"],
            role=value["role"],
            statement=value["statement"],
            observation=value["observation"],
            confidence=value["confidence"],
            source=value["source"],
            clinical_relevance=value["clinical_relevance"],
            status=value["status"],
            predecessor_id=value.get("predecessor_id"),
        )

    def payload(self) -> dict[str, Any]:
        result = {
            "timestamp": self.timestamp,
            "speaker": self.speaker,
            "role": self.role,
            "statement": self.statement,
            "observation": self.observation,
            "confidence": self.confidence,
            "source": self.source,
            "clinical_relevance": self.clinical_relevance,
            "status": self.status,
        }
        if self.predecessor_id is not None:
            result["predecessor_id"] = self.predecessor_id
        return result

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "hash": self.hash, **self.payload()}

    def verify_integrity(self) -> bool:
        expected = _digest(self.payload())
        return self.id == self.hash == expected


@dataclass(frozen=True, slots=True)
class FCGEdge:
    source: str
    target: str
    kind: str

    def __post_init__(self) -> None:
        if self.kind not in FCG_EDGE_TYPES:
            raise ValueError(f"unsupported FCG edge kind: {self.kind}")


def _hash_node(prefix: bytes, *parts: bytes) -> bytes:
    return hashlib.sha256(prefix + b"".join(parts)).digest()


class MMRAccumulator:
    """Small MMR-style append-only peak/root demonstrator.

    Leaves, internal nodes, and peak bagging use separate domain bytes.
    """

    def __init__(self, ids: Iterable[str] = ()) -> None:
        self._peaks: list[tuple[int, bytes]] = []
        self.size = 0
        for item in ids:
            self.append(item)

    @property
    def peaks(self) -> tuple[str, ...]:
        return tuple(value.hex() for _, value in self._peaks)

    @property
    def root(self) -> str:
        if not self._peaks:
            return _hash_node(b"\x03").hex()
        bag = self._peaks[-1][1]
        for _, peak in reversed(self._peaks[:-1]):
            bag = _hash_node(b"\x02", peak, bag)
        return bag.hex()

    def append(self, item_id: str) -> str:
        try:
            raw = bytes.fromhex(item_id)
        except ValueError as exc:
            raise ValueError("MMR item id must be hexadecimal") from exc
        if len(raw) != 32:
            raise ValueError("MMR item id must be a 32-byte SHA-256 digest")
        height = 0
        node = _hash_node(b"\x00", raw)
        while self._peaks and self._peaks[-1][0] == height:
            _, left = self._peaks.pop()
            node = _hash_node(b"\x01", left, node)
            height += 1
        self._peaks.append((height, node))
        self.size += 1
        return self.root


@dataclass(slots=True)
class CustodyLedger:
    fcos: list[FCO] = field(default_factory=list)
    edges: list[FCGEdge] = field(default_factory=list)
    mmr: MMRAccumulator = field(default_factory=MMRAccumulator)
    _by_id: dict[str, FCO] = field(default_factory=dict, init=False, repr=False)

    @property
    def root(self) -> str:
        return self.mmr.root

    def append_fco(self, fco: FCO) -> FCO:
        if not fco.verify_integrity():
            raise ValueError("FCO integrity verification failed")
        if fco.id in self._by_id:
            raise ValueError(f"FCO already exists: {fco.id}")
        self.fcos.append(fco)
        self._by_id[fco.id] = fco
        self.mmr.append(fco.id)
        return fco

    def append_edge(self, edge: FCGEdge) -> FCGEdge:
        if edge.source not in self._by_id or edge.target not in self._by_id:
            raise KeyError("FCG edge endpoints must refer to appended FCOs")
        self.edges.append(edge)
        return edge

    def correct(self, predecessor_id: str, **fields: Any) -> FCO:
        if predecessor_id not in self._by_id:
            raise KeyError(predecessor_id)
        successor = FCO.create(predecessor_id=predecessor_id, **fields)
        self.append_fco(successor)
        self.append_edge(
            FCGEdge(
                source=predecessor_id,
                target=successor.id,
                kind="CAREGIVER_CORRECTION",
            )
        )
        return successor

