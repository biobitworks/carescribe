# Governance Loop Breaker and Admission Kernel

## Problem

The current portfolio has several intentionally fail-closed systems:

- GettingScienceDone governs work and skill expansion.
- Ollarma gates recovery, KB state, bounded execution, routing, and escalation.
- Antigence reviews identity, anomaly, safety, and policy.
- FCO/FCG records the evidence and decisions.

Individually these controls are appropriate. A deadlock occurs when one control
returns a generic blocker or escalation that is synchronously routed through
another control, which then asks the original control to decide again.

Typical cycle:

```text
GettingScienceDone requests execution
  -> Ollarma checks admission
  -> Antigence requests more evidence or blocks
  -> Ollarma returns orchestrator_handoff/escalate
  -> GettingScienceDone invokes Ollarma Connect again
  -> same policy/evidence/trust state is evaluated
  -> same blocker is returned
  -> loop
```

The fix is not to weaken fail-closed behavior. The fix is to make governance
decisions **non-recursive, idempotent, state-rooted, and terminal**.

---

# 1. One admission authority

Create one deterministic **FCO Admission Kernel**.

Only this kernel may return an action authorization decision:

```text
admit(
  subject_root,
  requested_action,
  actor_identity,
  workload_identity,
  policy_root,
  evidence_bundle_roots,
  trust_snapshot_root
)
```

GettingScienceDone, Ollarma, and Antigence may produce evidence or recommendations,
but they cannot independently expand authority.

Roles:

| Component | Authority |
|---|---|
| GettingScienceDone | Creates work requests, MSM gates, skill-gap requests, and human-review tasks |
| Antigence | Returns Anticube assessment and policy evidence; may lower or block within declared policy |
| Admission Kernel | Returns the only authoritative action decision |
| Ollarma | Verifies a capability and executes; does not recursively seek approval |
| Human release authority | Resolves named human-required decisions |
| FCO/FCG | Records all requests, evidence, decisions, capabilities, and outcomes |

---

# 2. Terminal decision vocabulary

Remove generic `escalate` as an executable state.

Every governance decision must be exactly one of:

- `ALLOW_ONCE`
- `ALLOW_UNTIL`
- `DENY_FINAL`
- `HUMAN_REQUIRED`
- `DEFER_UNTIL_STATE_CHANGE`
- `QUARANTINE`
- `COMPLETE`
- `FAILED`

Definitions:

## ALLOW_ONCE

Issue a signed, one-use, action-specific capability token.

## ALLOW_UNTIL

Issue a signed capability bounded by expiry, action, subject, project, and resource limits.

## DENY_FINAL

No automatic retry under the same policy, evidence, and trust roots.

## HUMAN_REQUIRED

Name exactly one resolver role, the decision required, and the evidence packet.
The system must stop. It must not call another agent to reinterpret the same packet.

## DEFER_UNTIL_STATE_CHANGE

Retry is permitted only after a named state root changes, such as:

- recovery root;
- evidence bundle root;
- policy root;
- trust snapshot root;
- skill release root;
- dataset release root;
- operator approval root.

## QUARANTINE

Move the subject into a bounded non-executable lane.

## COMPLETE / FAILED

Final workflow outcomes.

---

# 3. Idempotent decision key

Compute:

```text
decision_key = SHA-256(
  canonical(
    subject_root,
    requested_action,
    actor_identity,
    workload_identity,
    policy_root,
    sorted(evidence_bundle_roots),
    trust_snapshot_root
  )
)
```

If the same `decision_key` is submitted again:

- return the stored decision;
- do not invoke Antigence again;
- do not invoke Ollarma routing again;
- do not create a new skill request;
- append a `decision_replayed` receipt referencing the original decision.

A new evaluation is allowed only when at least one keyed input changes.

---

# 4. Cycle and hop controls

Every request envelope must contain:

```yaml
governance_run_id:
root_action_id:
action_id:
parent_action_id:
correlation_id:
hop_count:
max_hops:
visited_authorities:
retry_budget:
decision_key:
state_roots:
```

Rules:

1. `max_hops` defaults to 4.
2. An authority may appear only once in `visited_authorities` for one decision key.
3. Re-entry into a visited authority returns `HUMAN_REQUIRED` with
   reason `GOVERNANCE_CYCLE_DETECTED`.
4. A repeated blocker code under the same decision key returns the cached blocker.
5. Exhausted retry budget returns `HUMAN_REQUIRED`.
6. Agents may not reset hop count, correlation ID, or decision key.
7. Child execution tasks inherit the root action ID but receive a new action ID.
8. Skill expansion is a new root workflow, not a recursive child execution attempt.

---

# 5. Separate governance from execution

Use two phases.

## Phase A — Admission

1. GettingScienceDone creates the requested action.
2. Required evidence is assembled.
3. Antigence produces a bounded advisory or blocking assessment.
4. The Admission Kernel decides.
5. An FCO decision and optional capability token are emitted.

## Phase B — Execution

1. Ollarma receives the capability token.
2. Ollarma verifies:
   - signature;
   - action;
   - subject;
   - workload;
   - project;
   - expiry;
   - nonce;
   - one-use status;
   - resource limits.
3. Ollarma executes without asking governance again.
4. Ollarma emits receipts and returns the result.
5. GettingScienceDone evaluates the result under MSM.

If execution discovers a missing dependency, permission, skill, or evidence, it
must terminate with a typed result. It must not install, expand, or reauthorize
itself.

---

# 6. Skill expansion without recursion

A blocked action may emit:

```text
SKILL_GAP
DEPENDENCY_GAP
DATA_GAP
EVIDENCE_GAP
HUMAN_AUTHORITY_GAP
```

This closes the original action as `DEFER_UNTIL_STATE_CHANGE`.

GettingScienceDone may then open a separate root workflow:

```text
skill request
  -> source/license review
  -> Anticube classification
  -> isolated install
  -> capability and failure tests
  -> permission scope
  -> human approval
  -> versioned skill release
```

After the skill release root changes, the original action may be resubmitted once
with the new root. It receives a new decision key.

No agent may recursively create a skill, validate it, approve it, and resume the
original high-stakes action in the same call chain.

---

# 7. Ollarma Connect rules

## Recovery blockers

`RECOVERY_REQUIRED`, `STRANDED_WORKTREE`, `POSSIBLE_WORK_LOSS`, and
`RECOVERY_SWEEP_REQUIRED` are terminal for the current action.

Do not send the blocker through `/route` or `route_prompt` for interpretation.
Render its deterministic reason and exact commands directly from the receipt.

After the operator changes repository state:

1. run a fresh recovery scan;
2. compute a new recovery root;
3. resubmit with the changed state root.

## Orchestrator handoff

`orchestrator_handoff` means “return control to the calling orchestrator.”
It must never mean “invoke the orchestrator from inside Ollarma.”

The caller records the handoff and either:

- chooses a bounded next action;
- creates a human task;
- or closes the workflow.

## Frontier/human lane

`frontier_or_human` must resolve to a named terminal target:

- `FRONTIER_REQUEST_REQUIRED`, with a prepared request packet; or
- `HUMAN_REQUIRED`, with a named resolver.

It cannot call Ollarma Connect again.

## Antigence verdicts

- `pass`: continue to Admission Kernel.
- `flag`: include warning evidence; Admission Kernel decides.
- `block`: terminal evidence for Admission Kernel; no explanatory agent loop.
- `escalate`: convert to `HUMAN_REQUIRED` or a named separate frontier request.
- `unavailable`: advisory read-only work may continue only if policy permits;
  execution/write/train/publish/key/egress actions remain fail-closed.

## Static reason catalog

All common blocker codes must map to deterministic, non-model-authored explanations
and next actions. Agents may summarize after the action is terminal, but summaries
cannot trigger another governance request.

---

# 8. Capability token

The Admission Kernel should issue a signed token such as:

```json
{
  "capability_version": "1",
  "capability_id": "uuid",
  "decision_fco": "sha256:...",
  "subject_root": "sha256:...",
  "requested_action": "execute.validated_notebook",
  "project_id": "project",
  "actor_identity": "did:key:...",
  "workload_identity": "sha256:...",
  "policy_root": "sha256:...",
  "trust_snapshot_root": "sha256:...",
  "not_before": "ISO-8601",
  "expires_at": "ISO-8601",
  "max_uses": 1,
  "resource_limits": {
    "wall_seconds": 900,
    "network": "none",
    "write_roots": ["runs/<run_id>/"]
  },
  "nonce": "random",
  "signature": "..."
}
```

Ollarma verifies the token locally. It does not ask the Admission Kernel to
reinterpret the policy during execution.

Any requested scope expansion requires a new admission request.

---

# 9. Deadlock packet

When a cycle, duplicate blocker, or exhausted budget is detected, emit:

```yaml
error: GOVERNANCE_DEADLOCK
decision_key:
root_action_id:
cycle_path:
repeated_decisions:
current_policy_root:
current_evidence_roots:
current_trust_snapshot_root:
missing_or_conflicting_evidence:
resolver_role:
resolver_decision_required:
allowed_next_actions:
prohibited_next_actions:
```

Allowed next actions should be finite and explicit, for example:

- inspect recovery worktree;
- approve or deny one named capability;
- supply one missing evidence object;
- close the action;
- open a separate skill-expansion workflow.

“Try again” is prohibited unless a state root changed.

---

# 10. Circuit breaker defaults

Recommended initial defaults:

```yaml
governance:
  max_hops: 4
  max_same_blocker_replays: 1
  automatic_retry_budget: 0
  skill_expansion_retry_budget: 1
  human_required_after_cycle: true
  cache_decisions_by_state_roots: true
  forbid_recursive_connect_calls: true
  capability_default_max_uses: 1
  capability_default_ttl_seconds: 900
```

High-stakes actions should use an automatic retry budget of zero.

---

# 11. FCO/FCG representation

Create FCOs for:

- action request;
- Antigence assessment;
- Admission Kernel decision;
- capability token;
- blocker;
- deadlock packet;
- human decision;
- skill-gap request;
- skill release;
- Ollarma execution receipt;
- MSM result;
- supersession or revocation.

Recommended edges:

```text
requests
evaluated_by
provides_evidence_to
decided_by
authorized_by
blocked_by
deferred_until
resolved_by
executes_under
produces
supersedes
revokes
replays_decision
```

The custody graph for governance must be acyclic by action version. Semantic
relationships may contain cycles, but they cannot trigger execution.

---

# 12. Minimal rollout

## Step 1

Add request envelope, decision key, visited authorities, and maximum hops.

## Step 2

Make `RECOVERY_REQUIRED`, KB blockers, Antigence `block`, and
`orchestrator_handoff` terminal.

## Step 3

Add a decision cache keyed by policy/evidence/trust roots.

## Step 4

Issue one-use capability tokens for Ollarma workflow and autopilot execution.

## Step 5

Move skill expansion into a separate root workflow.

## Step 6

Add deadlock fixtures and one end-to-end proof run.

---

# 13. Required tests

1. Same request submitted twice returns the same decision.
2. Same blocker does not invoke another model.
3. Ollarma never calls GettingScienceDone from inside a route or workflow request.
4. GettingScienceDone does not call Ollarma again after an unchanged terminal blocker.
5. Antigence `block` cannot be converted to `flag` by another agent.
6. `orchestrator_handoff` returns to the original caller.
7. Recovery retry is allowed only after recovery root changes.
8. Skill expansion has a separate root action ID.
9. Capability scope expansion is rejected.
10. Expired, replayed, or wrong-subject capability tokens are rejected.
11. A cycle emits one deadlock packet and stops.
12. Every decision and replay is represented in FCO/FCG.

---

# Conclusion

The governing invariant is:

> One request receives one state-rooted admission decision. Execution consumes a
> capability. Blockers terminate. Retries require changed evidence or state.
> No agent may recursively ask another agent to reinterpret the same decision.
