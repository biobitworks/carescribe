# Contributing to CareScribe

## Workflow

1. Create a branch from `main`.
2. Make a focused change and add or update tests.
3. Confirm no credentials, patient data, or protected health information are present.
4. Open a pull request describing what changed and how it was validated.

## AI provider constraint

AI inference must use Amazon Bedrock. Pull requests that add inference should document:

- the AWS region;
- the Bedrock model ID or inference profile ID;
- the Bedrock Runtime API used;
- a repeatable smoke-test command; and
- any IAM permissions required, without including credentials.

Do not add direct calls to model-provider APIs as a fallback or alternate path.

## Commit messages

Use short, imperative messages such as `Add Bedrock inference smoke test`.

