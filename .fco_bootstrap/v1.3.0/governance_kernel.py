"""Reference non-recursive governance admission state machine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from hashlib import sha256
import json
from typing import Iterable


class Decision(str, Enum):
    ALLOW_ONCE = "ALLOW_ONCE"
    ALLOW_UNTIL = "ALLOW_UNTIL"
    DENY_FINAL = "DENY_FINAL"
    HUMAN_REQUIRED = "HUMAN_REQUIRED"
    DEFER_UNTIL_STATE_CHANGE = "DEFER_UNTIL_STATE_CHANGE"
    QUARANTINE = "QUARANTINE"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


TERMINAL = {
    Decision.DENY_FINAL,
    Decision.HUMAN_REQUIRED,
    Decision.DEFER_UNTIL_STATE_CHANGE,
    Decision.QUARANTINE,
    Decision.COMPLETE,
    Decision.FAILED,
}


@dataclass(frozen=True)
class Request:
    subject_root: str
    requested_action: str
    actor_identity: str
    workload_identity: str
    policy_root: str
    evidence_bundle_roots: tuple[str, ...]
    trust_snapshot_root: str
    hop_count: int = 0
    max_hops: int = 4
    visited_authorities: tuple[str, ...] = ()
    retry_budget: int = 0

    def decision_key(self) -> str:
        payload = {
            "subject_root": self.subject_root,
            "requested_action": self.requested_action,
            "actor_identity": self.actor_identity,
            "workload_identity": self.workload_identity,
            "policy_root": self.policy_root,
            "evidence_bundle_roots": sorted(self.evidence_bundle_roots),
            "trust_snapshot_root": self.trust_snapshot_root,
        }
        encoded = json.dumps(
            payload, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")
        return "sha256:" + sha256(encoded).hexdigest()

    def visit(self, authority: str) -> "Request":
        if authority in self.visited_authorities:
            raise GovernanceCycle(authority, self.visited_authorities)
        if self.hop_count >= self.max_hops:
            raise HopBudgetExceeded(self.hop_count, self.max_hops)
        return Request(
            subject_root=self.subject_root,
            requested_action=self.requested_action,
            actor_identity=self.actor_identity,
            workload_identity=self.workload_identity,
            policy_root=self.policy_root,
            evidence_bundle_roots=self.evidence_bundle_roots,
            trust_snapshot_root=self.trust_snapshot_root,
            hop_count=self.hop_count + 1,
            max_hops=self.max_hops,
            visited_authorities=self.visited_authorities + (authority,),
            retry_budget=self.retry_budget,
        )


@dataclass(frozen=True)
class Result:
    decision: Decision
    decision_key: str
    reason_code: str
    resolver_role: str | None = None
    deferred_state_roots: tuple[str, ...] = ()
    cached: bool = False


class GovernanceCycle(RuntimeError):
    def __init__(self, authority: str, visited: Iterable[str]):
        super().__init__(f"Governance cycle at {authority}: {tuple(visited)}")
        self.authority = authority
        self.visited = tuple(visited)


class HopBudgetExceeded(RuntimeError):
    pass


@dataclass
class AdmissionKernel:
    _cache: dict[str, Result] = field(default_factory=dict)

    def admit(self, request: Request, *, blocker: str | None = None) -> Result:
        key = request.decision_key()
        if key in self._cache:
            existing = self._cache[key]
            return Result(
                decision=existing.decision,
                decision_key=existing.decision_key,
                reason_code=existing.reason_code,
                resolver_role=existing.resolver_role,
                deferred_state_roots=existing.deferred_state_roots,
                cached=True,
            )

        try:
            request = request.visit("admission-kernel")
        except (GovernanceCycle, HopBudgetExceeded):
            result = Result(
                decision=Decision.HUMAN_REQUIRED,
                decision_key=key,
                reason_code="GOVERNANCE_CYCLE_DETECTED",
                resolver_role="project-governance-owner",
            )
            self._cache[key] = result
            return result

        if blocker in {
            "RECOVERY_REQUIRED",
            "STRANDED_WORKTREE",
            "POSSIBLE_WORK_LOSS",
            "RECOVERY_SWEEP_REQUIRED",
        }:
            result = Result(
                decision=Decision.DEFER_UNTIL_STATE_CHANGE,
                decision_key=key,
                reason_code=blocker,
                deferred_state_roots=("recovery_root",),
            )
        elif blocker == "ANTIGENCE_BLOCK":
            result = Result(
                decision=Decision.DENY_FINAL,
                decision_key=key,
                reason_code=blocker,
            )
        elif blocker in {"SKILL_GAP", "DEPENDENCY_GAP", "EVIDENCE_GAP"}:
            result = Result(
                decision=Decision.DEFER_UNTIL_STATE_CHANGE,
                decision_key=key,
                reason_code=blocker,
                deferred_state_roots=("evidence_or_skill_release_root",),
            )
        elif blocker == "HUMAN_AUTHORITY_GAP":
            result = Result(
                decision=Decision.HUMAN_REQUIRED,
                decision_key=key,
                reason_code=blocker,
                resolver_role="named-human-authority",
            )
        else:
            result = Result(
                decision=Decision.ALLOW_ONCE,
                decision_key=key,
                reason_code="ADMISSION_PASSED",
            )

        self._cache[key] = result
        return result
