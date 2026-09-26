"""Reference roots for ordered datasets and canonical source trees."""

from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
from typing import Iterable


def _h(data: bytes) -> bytes:
    return sha256(data).digest()


def leaf(content: bytes) -> str:
    return sha256(b"\x00" + _h(content)).hexdigest()


def node(left_hex: str, right_hex: str) -> str:
    return sha256(b"\x01" + bytes.fromhex(left_hex) + bytes.fromhex(right_hex)).hexdigest()


def merkle(leaves: list[str]) -> str:
    if not leaves:
        return sha256(b"\x02").hexdigest()
    level = list(leaves)
    while len(level) > 1:
        nxt = []
        for i in range(0, len(level), 2):
            if i + 1 < len(level):
                nxt.append(node(level[i], level[i + 1]))
            else:
                nxt.append(level[i])
        level = nxt
    return level[0]


def ordered_sequence_root(payloads: Iterable[bytes]) -> str:
    """Bind payload bytes and their exact sequence position."""
    leaves = []
    for index, payload in enumerate(payloads):
        indexed = (
            b"FCO-ORDERED-SEQUENCE-V1\x00"
            + index.to_bytes(8, "big")
            + len(payload).to_bytes(8, "big")
            + payload
        )
        leaves.append(leaf(indexed))
    return merkle(leaves)


def canonical_source_tree_root(root: Path, relative_paths: Iterable[str]) -> str:
    """Bind path, file length, and bytes through a canonical manifest."""
    entries = []
    for rel in sorted(relative_paths):
        path = root / rel
        data = path.read_bytes()
        entries.append({
            "path": rel.replace("\\", "/"),
            "size": len(data),
            "sha256": sha256(data).hexdigest(),
        })
    canonical = json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()
    return "sha256:" + sha256(canonical).hexdigest()
