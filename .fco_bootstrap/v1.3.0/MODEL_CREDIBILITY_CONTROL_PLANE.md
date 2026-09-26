# Model Credibility Control Plane

## Core proposition

Technical reproducibility is necessary but insufficient.

A model can execute successfully and still be:

- based on inappropriate biology,
- calibrated to weak or circular data,
- numerically unstable,
- valid only in a narrow domain,
- unable to support the decision being made,
- unsafe outside its declared context of use,
- or impossible to audit back to its sources.

The system therefore evaluates **claim-specific model credibility**, not merely whether code runs.

There is no universal credibility score for a model. Credibility is always relative to:

1. a declared context of use;
2. a specific decision or claim;
3. the model's influence on that decision;
4. the consequence of the decision being wrong;
5. the evidence available for verification, validation, applicability, and uncertainty.

## System roles

### GettingScienceDone

GettingScienceDone is the governance and work-loop layer.

It should:

- decompose a scientific objective into mechanically testable work;
- identify missing skills, datasets, packages, instruments, and permissions;
- open bounded skill-expansion requests;
- prevent work from advancing when required evidence is missing;
- route tasks through MSM hypotheses, nulls, controls, and stop/go gates;
- require review before a claim or release changes state;
- preserve failed tasks and negative evidence;
- create the final credibility argument.

### Ollarma

Ollarma is the bounded local execution substrate.

It should:

- execute only admitted asset classes and scoped workflows;
- pin models, prompts, parameters, tools, environments, and seeds;
- emit typed receipts for admission, routing, execution, recovery, and failure;
- fail closed when work is stranded or custody is incomplete;
- provide deterministic or equivalence-tested reruns;
- return execution evidence to GettingScienceDone and FCO/FCG.

Ollarma does not decide scientific truth or authorize high-stakes claims.

### Antigence

Antigence is the admission, anomaly, and policy-enforcement layer.

It should keep the Anticube axes independent:

- self / non-self;
- safe / non-safe.

It should:

- evaluate whether an asset is recognized and authorized;
- evaluate whether an action is safe for the declared context;
- detect anomalous prompts, files, models, data, outputs, and behavior;
- quarantine non-self/non-safe objects;
- block self/non-safe objects even when they originate internally;
- permit non-self/safe assets only in bounded lanes;
- maintain memory of known failure patterns;
- escalate rather than silently convert uncertainty into approval.

Anomaly is not automatically danger, and familiarity is not automatically safety.

### FCO/FCG

FCO/FCG is the independent evidence and custody substrate.

It should preserve:

- source models and data;
- simulation specifications;
- exact software environments;
- prompts and skill versions;
- execution receipts;
- calibration and validation evidence;
- failed runs and contradictions;
- reviewer decisions;
- public/private release transformations;
- model credibility assessments;
- publication and portal exports.

FCO defines object identity. FCG defines custody and semantic relationships. Neither substitutes for verification or validation.

### MSM

The Mechanical Scientific Method governs how claims are made and challenged.

Every credibility claim must have:

- operational definitions;
- hypothesis and null;
- reference evidence;
- measurement method;
- controls;
- calibration;
- falsification conditions;
- uncertainty;
- decision threshold;
- next mechanically decisive test.

### BioSimulations compatibility

BioSimulations is the executable biomedical-model exchange and reproduction target.

Use established standards where applicable:

- COMBINE/OMEX for packaging;
- SED-ML for simulation experiments;
- SBML, CellML, BNGL, NeuroML/LEMS, or other supported model formats;
- KiSAO for algorithms and parameters;
- OMEX metadata for citations, taxa, licenses, and project metadata;
- HDF5 for reports;
- PDF, Vega, or supported formats for visualizations.

FCO/FCG should overlay custody and credibility without replacing these standards.

Maintain either:

1. a BioSimulations-compatible COMBINE/OMEX archive plus an FCO/FCG sidecar; or
2. declared custom FCO/FCG entries inside the archive after compatibility validation.

## Claim-specific credibility process

```text
question or decision
    ↓
context of use
    ↓
model influence and consequence
    ↓
required credibility tier
    ↓
executable reproduction package
    ↓
verification evidence
    ↓
validation and applicability evidence
    ↓
uncertainty and sensitivity evidence
    ↓
contradictions and failure sets
    ↓
Anticube decision
    ↓
claim-specific credibility assessment FCO
    ↓
release, restrict, revise, or reject
```

## Mandatory gates

A model cannot receive a positive decision-qualified status unless all applicable mandatory gates pass:

1. Identity and authorization
2. Data and model rights
3. Source custody
4. Executable package
5. Declared context of use
6. Declared claim and decision
7. Implementation verification
8. Numerical verification where relevant
9. Data provenance and calibration integrity
10. Validation appropriate to the claim
11. Applicability to the target domain
12. Uncertainty and limitations
13. No unresolved critical contradiction
14. Human approval at the required authority level

A weighted score must never override a failed mandatory gate.

## Credibility status vocabulary

- `UNASSESSED`
- `NON_EXECUTABLE`
- `EXECUTABLE_UNVERIFIED`
- `REPRODUCED`
- `VERIFIED_FOR_IMPLEMENTATION`
- `VALIDATED_FOR_BOUNDED_CONTEXT`
- `DECISION_QUALIFIED`
- `CONDITIONALLY_QUALIFIED`
- `OUTSIDE_CONTEXT`
- `CONTRADICTED`
- `REVOKED`
- `SUPERSEDED`

## Evidence dimensions

Each dimension receives:

- status;
- 0–4 maturity score;
- evidence grade;
- confidence;
- supporting FCO roots;
- contradicting FCO roots;
- limitations;
- next decisive test.

Scores are a navigation aid, not a universal truth metric.

### Maturity scale

- `0` — absent or unknown
- `1` — asserted or minimally documented
- `2` — internally demonstrated
- `3` — independently checked or externally validated
- `4` — decision-qualified for the declared context

### Evidence grades

- `A` — independent, traceable, directly applicable evidence
- `B` — strong internal evidence with bounded external support
- `C` — partial, indirect, or exploratory evidence
- `D` — assertion, opinion, or evidence with major unresolved limitations

## Required model-credibility dimensions

1. Context-of-use definition
2. Model and data provenance
3. Technical executability
4. Reproduction of reported outputs
5. Conceptual and biophysical appropriateness
6. Software implementation verification
7. Numerical and solver verification
8. Data quality and measurement credibility
9. Calibration integrity and identifiability
10. Validation against independent evidence
11. Sensitivity analysis
12. Uncertainty quantification
13. Robustness and failure-domain mapping
14. Applicability and population/domain coverage
15. Cross-tool or cross-platform corroboration
16. Independent replication
17. Transparency and reusability
18. Governance, review, and change control
19. Monitoring, drift, and credibility decay
20. Claim-to-evidence completeness

## Required credibility argument graph

Each model claim must be represented as a graph:

```text
Claim FCO
├── context_of_use → Context FCO
├── relies_on → Model FCO
├── supported_by → Evidence FCOs
├── reproduced_by → Reproduction Run FCOs
├── verified_by → Verification FCOs
├── validated_by → Validation FCOs
├── bounded_by → Limitation FCOs
├── contradicted_by → Contradiction FCOs
├── uncertain_due_to → Uncertainty FCOs
├── reviewed_by → Reviewer FCOs
└── authorized_by → Release Decision FCO
```

A relationship such as `related_to`, `cites`, or `similar_to` cannot substitute for `supports`, `verified_by`, or `validated_by`.

## Credibility decay

Credibility is not permanent.

Trigger reassessment when:

- source data are corrected or withdrawn;
- a dependency or simulator changes;
- a new solver version changes outputs;
- a model is quantized, fine-tuned, or transformed;
- the target population or context changes;
- a critical contradiction appears;
- validation data become stale;
- a security or custody incident occurs;
- a skill or tool permission changes;
- an independent replication fails.

The prior assessment remains in the graph and the new assessment supersedes it.

## Public/private release loop

Every public release is a new derived custody event.

The public mirror must record:

- private source release root;
- export policy;
- files included;
- files omitted;
- redactions and transformations;
- secrets scan;
- license scan;
- PHI/PII scan;
- model-weight and dataset decisions;
- public claim ceiling;
- public artifact hashes;
- reviewer and release authority;
- public repository commit.

A public repository is not the custody authority. It is a released projection of the governed private source.

## Completion criterion

The credibility control plane is working only when a third party can determine:

- what was claimed;
- which executable model and experiment produced the result;
- whether the result can be reproduced;
- which evidence supports and contradicts the model;
- for which context the model is considered credible;
- who approved that conclusion;
- what would revoke or narrow it;
- and how to rerun the decisive tests.
