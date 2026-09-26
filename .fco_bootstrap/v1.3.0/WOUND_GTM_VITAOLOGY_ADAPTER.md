# Wound GTM Adapter Profile for Vitaology

## Role

The wound product is a governed domain adapter over the Vitaology model substrate,
not the initial source of the base model's scientific authority.

## Base versus deterministic functions

### Deterministic clinical-data functions

- image and depth byte hashing;
- ruler/marker calibration;
- geometric measurement;
- quality thresholds;
- patient/wound/encounter reconciliation;
- FCO construction and signature verification;
- access control and retention;
- EHR/FHIR projection.

### Model-assisted functions

- contour proposal;
- capture-quality or OOD suggestion;
- structured observation normalization;
- retrieval of applicable documentation protocol;
- MSM-formatted trial analysis;
- Anticube advisory assessment;
- provider-review prioritization.

### Human-only or policy-authorized functions

- clinical diagnosis;
- infection determination;
- wound staging when clinically consequential;
- treatment recommendations;
- final measurement approval;
- research-data authorization;
- public release;
- model promotion.

## Adapter FCO chain

```text
Vitaology base-model release FCO
    ↓ adapted_by
Wound adapter dataset release FCO
    ↓
Wound adapter training/evaluation FCOs
    ↓
Quantized mobile model FCO
    ↓
Device qualification FCO
    ↓
Shadow-trial protocol FCO
    ↓
Provider-reviewed result FCOs
    ↓
Clinical credibility assessment FCO
```

## Privacy boundary

Clinical images remain in the clinical key domain.

Research derivatives require:

- authorization;
- identity separation;
- de-identification determination;
- project-specific encryption;
- new dataset-release roots;
- prohibited-use rules;
- withdrawal and revocation handling.

The base Vitaology model should not be retrained continuously from clinic data by
default.

## Initial mobile model

Use a small quantized derivative only after:

- the base and adapter roots are frozen;
- calibration data are separated from test data;
- pre/post quantization equivalence is measured;
- failure sets are compared;
- device-specific latency and memory are measured;
- output is advisory and clinician reviewed.

## Short trial claim ceiling

> Evaluate whether the custody-valid ruler-photo workflow and provider review can
> reduce duplicate documentation and produce reconstructable measurements.

Do not claim wound healing prediction, diagnosis, depth replacement, or treatment
benefit.
