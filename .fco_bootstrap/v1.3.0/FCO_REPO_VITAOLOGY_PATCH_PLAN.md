# Repository Patch Plan: fractal-custody-objects → Vitaology Substrate

## Branch strategy

Create a dedicated branch, for example:

```text
feat/vitaology-model-substrate
```

Do not change frozen release artifacts or historical FCO bytes.

## Patch sequence

### 1. Inventory and migration map

- Enumerate all `vitalogy` matches.
- Classify each match using `VITALOGY_TO_VITAOLOGY_MIGRATION.md`.
- Freeze an inventory FCO before changing active namespace references.

### 2. Resolve architecture source discrepancy

- Confirm whether `build_pythia14m` exists in an unmerged worktree, generated file,
  or supplemental branch.
- Select one authoritative implementation.
- Add architecture conformance tests.
- Fail CI if `m3-pythia14m` is admitted without the builder and frozen config.

### 3. Split historical-source and project APIs

- Add `build_historical_vitalogy_1927_corpus`.
- Retain `build_vitalogy_corpus` as a deprecated byte-identical alias.
- Add `build_vitaology_dataset_release` for project-level corpora.

### 4. Add ordered identity

- Retain current order-independent multiset root for content inventory.
- Add ordered sequence root.
- Bind tokenizer input order, sample order, batch order, and split order.

### 5. Replace fixed code SHA

Create a canonical execution manifest covering:

- all imported project source files;
- CLI entrypoints;
- architecture config;
- tokenizer files;
- data contracts;
- preregistration;
- environment lock;
- evaluation scripts;
- adapter policies;
- dirty diff or untracked executed files.

### 6. Add model release schema

Adopt `vitaology_model_manifest.schema.json`.

### 7. Add MSM and Anticube schemas

Adopt:

- `msm_scientific_record.schema.json`
- `anticube_assessment.schema.json`

### 8. Integrate non-recursive governance

Adopt the Admission Kernel and terminal blocker rules from
`GOVERNANCE_LOOP_BREAKER.md`.

### 9. Add release gates

- CPU deterministic replay
- MPS/CUDA equivalence disclosure
- tokenizer golden vectors
- ordered dataset reconstruction
- checkpoint resume
- quantization equivalence
- public/private mirror reconciliation
- independent replay
- claim-specific credibility assessment

### 10. Add wound adapter without PHI

Use `WOUND_GTM_VITAOLOGY_ADAPTER.md`.
