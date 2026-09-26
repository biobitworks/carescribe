# BioSimulations + FCO/FCG Export Profile

## Objective

Produce a standards-compatible executable biomodel package while preserving independent custody, credibility evidence, contradictions, and governance.

## Recommended package layout

```text
project.omex
├── manifest.xml
├── metadata.rdf
├── model/
│   └── model.xml                  # SBML, CellML, BNGL, etc.
├── simulation/
│   └── experiment.sedml
├── data/
│   └── declared-inputs.*
├── visualization/
│   └── figures or Vega specs
└── documentation/
    └── README.md

project.fco-fcg/
├── fco/
│   ├── objects.jsonl
│   ├── source-manifest.json
│   └── release-attestation.json
├── fcg/
│   └── edges.jsonl
├── credibility/
│   ├── context-of-use.json
│   ├── assessment.json
│   ├── claim-evidence-map.json
│   ├── contradictions.json
│   └── limitations.json
├── execution/
│   ├── environment-lock.*
│   ├── simulator-capabilities.json
│   ├── run-receipts.jsonl
│   └── failure-logs.jsonl
├── results/
│   ├── reports.h5
│   └── plots.zip
└── security/
    ├── CHECKSUMS.sha256
    ├── merkle-root.json
    └── signatures.json
```

## Compatibility rule

The COMBINE/OMEX archive is the executable interoperability artifact.

The FCO/FCG directory is the custody and credibility sidecar.

Custom FCO/FCG files may be placed inside a COMBINE/OMEX archive only after validating that:

- the manifest declares them correctly;
- the selected BioSimulations/BioSimulators tools tolerate them;
- static validation passes;
- execution output remains unchanged;
- publishing and retrieval preserve the files.

Until then, ship the OMEX archive and FCO/FCG sidecar as a signed release bundle.

## Minimum reproduction test

1. Validate the COMBINE/OMEX archive.
2. Execute all master SED-ML tasks.
3. Confirm simulator and algorithm compatibility.
4. Compare generated reports and plots against frozen expected outputs.
5. Record exact, numerical, or semantic agreement.
6. Store skipped and failed tasks.
7. Create a reproduction-run FCO.
8. Link the run to the model, simulation specification, environment, results, and claim.
9. Reassess credibility; do not automatically upgrade it solely because execution succeeded.

## Minimum credibility test

A published executable archive remains `REPRODUCED`, not `DECISION_QUALIFIED`, until the project also evaluates:

- conceptual and biophysical appropriateness;
- software and numerical verification;
- source-data credibility;
- calibration and identifiability;
- validation;
- sensitivity and uncertainty;
- domain applicability;
- contradictions;
- independent review;
- context-specific claim sufficiency.
