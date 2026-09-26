# Vitalogy → Vitaology Custody-Safe Migration

## Rule

Rename the active project and model namespace, not the immutable historical source.

## Preserve unchanged

- `vitalogy_1927.pdf`
- `vitalogy_1927_extracted.txt`
- existing source hashes
- `VITALOGY_PDF_SHA256`
- `VITALOGY_EXTRACTED_TEXT_SHA256`
- existing frozen dataset roots
- existing preregistration and result FCOs
- historical source citations
- legacy command-line arguments needed for replay

## Introduce

```text
VITAOLOGY_PROJECT_ID
VITAOLOGY_MODEL_FAMILY
vitaology-pythia-14m-msm-base
VitaologyModelManifest
VitaologyAdapterManifest
```

## Recommended API migration

### Historical source API

Preferred new explicit name:

```python
build_historical_vitalogy_1927_corpus(...)
```

Backward-compatible alias:

```python
def build_vitalogy_corpus(*args, **kwargs):
    warnings.warn(
        "build_vitalogy_corpus is a legacy historical-source API; "
        "use build_historical_vitalogy_1927_corpus",
        DeprecationWarning,
        stacklevel=2,
    )
    return build_historical_vitalogy_1927_corpus(*args, **kwargs)
```

Do not create `build_vitaology_corpus()` as an alias for the historical book.
That name should refer to a project-level dataset manifest composed from one or
more authorized source corpora.

### Project-level corpus API

```python
build_vitaology_dataset_release(
    source_manifests,
    ordered_sequence_manifest,
    tokenizer_manifest,
    split_manifest,
    policy_manifest,
)
```

### Environment variables

Retain:

```text
FCO_VITALOGY_PDF_PATH
```

Add an explicit source-qualified alternative:

```text
VITAOLOGY_SOURCE_VITALOGY_1927_PDF_PATH
```

Resolution order:

1. explicit function/CLI argument;
2. new source-qualified variable;
3. legacy variable;
4. fail closed.

## Migration FCO

Create one migration FCO containing:

- previous project name;
- new project name;
- effective date;
- scope of rename;
- immutable exclusions;
- old-to-new identifier map;
- compatibility aliases;
- deprecated interfaces;
- code commit;
- migration tests;
- reviewer;
- signature.

## Search classes

Classify each `vitalogy` match before changing it:

| Match type | Action |
|---|---|
| Historical book title | Preserve |
| PDF/extracted source filename | Preserve |
| Frozen FCO or preregistration | Preserve |
| Dataset source identifier | Preserve |
| Active project/UI/brand name | Rename to Vitaology |
| Model release namespace | Rename to Vitaology |
| Generic function that actually means historical source | Rename explicitly, retain alias |
| Filesystem path to active project | Rename to `vitaology` |
| Environment variable tied to historical source | Preserve or add source-qualified alias |
| Claim saying model was trained on “Vitaology” when source was Vitalogy 1927 | Correct to explicit source relationship |

## Migration tests

1. Existing Vitalogy-1927 dataset root recomputes unchanged.
2. Existing preregistration leaves recompute unchanged.
3. Legacy API produces byte-identical source corpus.
4. New explicit historical-source API produces the same bytes.
5. Vitaology project release uses a new project root.
6. No active UI or model release is branded Vitalogy.
7. No frozen artifact is modified in place.
