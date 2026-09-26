# Vitaology Pythia Model Substrate

## Purpose

Establish a custody-valid, mechanically testable, from-scratch language-model
substrate that can support research projects and bounded product adapters such as
the wound documentation application.

The substrate combines:

- FCO/FCG for identity, provenance, derivation, correction, and release custody;
- MSM, the Mechanical Scientific Method, for hypotheses, nulls, controls,
  falsification, claim ceilings, and next decisive tests;
- Anticube for independent self/non-self and safe/non-safe assessment;
- GettingScienceDone for governed work and skill-expansion loops;
- Ollarma for bounded local execution and deterministic receipts;
- BioSimulations-compatible standards for executable biomodel projects;
- a Pythia/GPT-NeoX-compatible small decoder-only transformer trained from
  random initialization.

## Naming boundary

### Vitaology

`Vitaology` is the active platform, model-family, and product namespace.

Recommended identifiers:

```text
project_id: vitaology
model_family: vitaology-pythia
base_model_id: vitaology-pythia-14m-msm-base
organization_namespace: biobitworks/vitaology
```

### Vitalogy 1927

`Vitalogy 1927` is an immutable historical source title and source-corpus identity.

It must remain:

```text
source_id: historical-vitalogy-1927
dataset_name: vitalogy-1927
legacy_env: FCO_VITALOGY_PDF_PATH
```

Do not rename source bytes, historical titles, hashes, existing FCOs, or frozen
dataset roots to Vitaology.

Vitaology may consume a Vitalogy-1927 source FCO, but it must not claim that the
historical corpus is the project itself.

## Model claim ceiling

Initial claim:

> A small, from-scratch, Pythia-compatible research model whose data, architecture,
> execution, checkpoints, evaluations, safety assessments, and transformations are
> custody-valid and mechanically reproducible within declared environment tiers.

Not claimed:

- equivalence to the EleutherAI pretrained Pythia weights;
- general scientific reliability;
- medical knowledge or clinical competence;
- autonomous scientific reasoning;
- wound diagnosis, staging, treatment, or prognosis;
- cross-platform bit identity unless demonstrated;
- semantic safety based solely on a deterministic training run.

## Architecture profile

Freeze a single architecture source.

Recommended 14M-compatible profile:

```yaml
architecture_family: gpt_neox
reference_family: EleutherAI Pythia
training_mode: from_scratch_random_initialization
num_hidden_layers: 6
hidden_size: 128
num_attention_heads: 4
head_dimension: 32
intermediate_size: 512
vocab_size: 50304
max_position_embeddings: 2048
rotary_pct: 0.25
tie_word_embeddings: false
use_parallel_residual: true
normalization: layer_norm
activation: gelu
```

The final values must be verified against the chosen official reference config and
frozen into an Architecture FCO. Do not infer architecture from parameter count.

The model should be described as `Pythia-compatible` unless the implementation,
configuration, tokenizer, initialization, optimizer, and training semantics match
the reference closely enough to support a stronger compatibility claim.

## Required FCO chain

```text
Project charter FCO
    ↓
Context-of-use FCO
    ↓
MSM research question FCO
    ↓
Hypothesis / null FCO
    ↓
Source corpus FCOs
    ↓
Dataset release FCO
    ↓
Ordered sequence manifest FCO
    ↓
Tokenizer FCO
    ↓
Architecture FCO
    ↓
Initialization FCO
    ↓
Training protocol/preregistration FCO
    ↓
Environment + hardware FCO
    ↓
Training run FCO
    ↓
Checkpoint FCO sequence
    ↓
Evaluation FCOs
    ↓
Anticube assessment FCOs
    ↓
Credibility assessment FCO
    ↓
Model release FCO
    ↓
Quantized / adapted derivative FCOs
```

## MSM-native training records

MSM should be represented in both the governance process and the training data.

A training record may contain:

```yaml
question:
operational_definitions:
context:
hypothesis:
null_hypothesis:
alternative_explanations:
inputs:
controls:
positive_controls:
negative_controls:
method:
measurement:
calibration:
exclusion_criteria:
failure_criteria:
observations:
results:
uncertainty:
falsification_status:
evidence_labels:
claim_ceiling:
next_mechanically_decisive_test:
source_fco_roots:
```

A model may be trained to emit this structure, but output validity must be checked
against deterministic schemas and source evidence. The model does not become an
MSM authority merely because it generates MSM-shaped text.

## Anticube integration

Use two independent outputs:

```text
identity axis: self | non-self | mixed | unknown
safety axis: safe | non-safe | conditional | unknown
```

Recommended layers:

1. Deterministic custody and authorization checks
2. Deterministic schema and data-quality checks
3. Learned anomaly/OOD heads
4. Project policy
5. Human review for consequential decisions

The learned model cannot determine consent, license rights, clinical authority, or
legal authorization without explicit external evidence.

## Base-model versus adapter boundary

### Base model

The base model should learn:

- structured MSM records;
- provenance vocabulary;
- evidence-label discipline;
- claim ceilings;
- contradiction and uncertainty representation;
- BioSimulations/COMBINE metadata patterns;
- deterministic workflow explanations;
- safe abstention and bounded escalation.

### Wound application adapter

The wound adapter should add:

- wound-workflow terminology;
- ruler-photo quality assessment;
- device and capture metadata;
- provider-review routing;
- FCO/FCG wound-object schemas;
- structured documentation assistance;
- Anticube capture classification.

The adapter must not place identifiable clinical images or PHI into the base model
unless an approved clinical-to-research release process creates a separate,
authorized research dataset.

Deterministic geometry, not the language model, remains the source of wound length,
width, area, perimeter, and visible optical depth calculations.

## Release tiers

### V0 — Custody demonstration

- Historical Vitalogy-1927 corpus retained as one bounded source
- Pythia-compatible random initialization
- Ordered dataset manifest
- CPU replay
- Model and checkpoint hashes
- No product claim

### V1 — Vitaology MSM base

- Multiple authorized corpora
- MSM structured training records
- Anticube advisory heads
- Independent replay
- BioSimulations-compatible model-credibility tasks
- Research-only release

### V2 — Domain adapter framework

- Adapter manifests
- Project-specific vocabularies and policies
- Frozen base-model root
- LoRA/full-fine-tune/quantization represented as derivative FCOs
- Wound adapter remains shadow/research use

### V3 — Wound shadow-trial adapter

- Local deployment
- No autonomous clinical decisions
- Provider-reviewed output
- FCO/FCG custody independent of EHR
- Trial-specific validation and human-factors evidence

### V4 — Design-controlled product candidate

- Intended use frozen
- Formal risk, verification, validation, security, usability, and regulatory path
- Supported device and EHR matrices
- Production key and update architecture

## Stop conditions

Stop promotion if:

- architecture source is missing or inconsistent;
- ordered dataset sequence cannot be reconstructed;
- tokenizer bytes or normalization cannot be verified;
- training code root does not bind all executed code and configuration;
- an environment cannot be recreated;
- a released checkpoint cannot be traced to one dataset sequence and run;
- public/private release roots cannot be reconciled;
- Anticube axes are collapsed;
- governance decisions recurse;
- clinical claims exceed validation.
