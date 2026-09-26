# Ollarma Connect Integration Patch Plan

## Immediate changes

### Ollarma

1. Add `governance_run_id`, `root_action_id`, `decision_key`,
   `visited_authorities`, and `hop_count` to route/workflow/gateway envelopes.
2. Make these responses terminal:
   - `RECOVERY_REQUIRED`
   - KB missing/stale blockers
   - `orchestrator_handoff`
   - `frontier_or_human`
   - Antigence `block`
3. Never call a project orchestrator from inside `/route`, `/workflow`,
   `/autopilot`, or Antigence review.
4. Require a signed capability for mutating or executing lanes.
5. Return static reason-catalog guidance rather than routing a blocker to a model.

### GettingScienceDone

1. Persist the decision key on every task.
2. Treat terminal Ollarma responses as completed governance events.
3. Do not resubmit unchanged blockers.
4. Open skill expansion as a separate root experiment/workflow.
5. Retry only after a declared state root changes.
6. Name one human resolver for every human-required state.

### Antigence

1. Return evidence and an Anticube assessment, not an orchestration command.
2. Convert `escalate` into:
   - `HUMAN_REQUIRED`, or
   - a prepared frontier-request packet.
3. Do not call Ollarma Connect to explain a block.
4. Preserve disagreement among antibody lanes.
5. Only calibrated, authorized blocking lanes may contribute blocking evidence.

### FCO/FCG

1. Store request, assessment, decision, capability, blocker, deadlock, and result.
2. Detect governance cycles on action-version edges.
3. Keep semantic graph cycles non-executable.
4. Record cached decision replays without duplicating evaluation.

## Proof run

Run one fixture for each:

- clean allow;
- recovery defer;
- Antigence deny;
- missing skill defer;
- changed skill root then allow;
- orchestrator handoff terminal;
- cycle detection;
- expired capability;
- capability replay;
- wrong-subject capability.

No fixture may exceed four governance hops.
