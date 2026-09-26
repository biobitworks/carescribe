from governance_kernel import AdmissionKernel, Decision, Request


def req(**overrides):
    values = dict(
        subject_root="sha256:subject",
        requested_action="execute.validated_notebook",
        actor_identity="did:key:actor",
        workload_identity="sha256:workload",
        policy_root="sha256:policy",
        evidence_bundle_roots=("sha256:evidence",),
        trust_snapshot_root="sha256:trust",
    )
    values.update(overrides)
    return Request(**values)


def test_same_state_returns_cached_decision():
    kernel = AdmissionKernel()
    first = kernel.admit(req())
    second = kernel.admit(req())
    assert first.decision == Decision.ALLOW_ONCE
    assert second.decision == first.decision
    assert second.cached is True
    assert second.decision_key == first.decision_key


def test_recovery_is_terminal_defer():
    kernel = AdmissionKernel()
    result = kernel.admit(req(), blocker="RECOVERY_REQUIRED")
    assert result.decision == Decision.DEFER_UNTIL_STATE_CHANGE
    assert result.deferred_state_roots == ("recovery_root",)


def test_antigence_block_is_final():
    kernel = AdmissionKernel()
    result = kernel.admit(req(), blocker="ANTIGENCE_BLOCK")
    assert result.decision == Decision.DENY_FINAL


def test_skill_gap_requires_new_state_root():
    kernel = AdmissionKernel()
    result = kernel.admit(req(), blocker="SKILL_GAP")
    assert result.decision == Decision.DEFER_UNTIL_STATE_CHANGE


def test_changed_evidence_creates_new_decision_key():
    kernel = AdmissionKernel()
    first = kernel.admit(req(), blocker="SKILL_GAP")
    second = kernel.admit(
        req(evidence_bundle_roots=("sha256:evidence", "sha256:new-skill-release"))
    )
    assert first.decision_key != second.decision_key
    assert second.decision == Decision.ALLOW_ONCE


def test_visited_kernel_causes_human_required():
    kernel = AdmissionKernel()
    result = kernel.admit(req(visited_authorities=("admission-kernel",)))
    assert result.decision == Decision.HUMAN_REQUIRED
    assert result.reason_code == "GOVERNANCE_CYCLE_DETECTED"
