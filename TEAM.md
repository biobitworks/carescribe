# CareScribe team board

Use the team lead's workspace for coordination. Use this repository as the durable source
for code, validation evidence, and judge-facing links.

## Add your work

Each teammate should:

1. Claim one area below by adding their name.
2. Create a branch from `main`: `git switch -c <name>/<feature>`.
3. Add code, tests, and a short README note for the feature.
4. Run the relevant checks and record the exact results.
5. Open a pull request with screenshots, demo links, and known limitations.

Never commit credentials, real patient audio, patient data, or protected health
information. Use simulated interactions only.

## Confirmed team

- Byron P. Lee
- Julie Marcel

## Owners and artifacts

| Area | Owner | Pull request | Demo or evidence | Status |
| --- | --- | --- | --- | --- |
| Responsive web interaction | Unassigned | Add URL | `web/` | Implemented locally |
| Live transcription and speaker roles | Unassigned | Add URL | `web/` | Implemented; verify deployed |
| Bedrock observations and summaries | Byron | Add URL | Tests and smoke receipt | Boundary validated |
| Real-time questions and duplex voice | Unassigned | Add URL | Questions in `web/`; voice pending | Partial |
| Session persistence and deletion | Unassigned | Add URL | Browser demo and tests | Implemented locally |
| AWS hosting and deployment | Unassigned | Add URL | Add AWS URL | Blocked by workshop IAM |
| Clinical safety and privacy review | Unassigned | Add URL | `docs/` | Draft complete |
| Slides and backup demo video | Unassigned | Add URL | Add URL | Not started |

## Shared links

- Repository: https://github.com/biobitworks/carescribe
- Live application: https://biobitworks.github.io/carescribe/
- Slides: Add shared URL
- Backup video: Add shared URL
- Team lead workspace: Add shared URL
- Submission form:
  https://docs.google.com/forms/d/e/1FAIpQLSfWlRj2fPWD0bdkF57VJxkKp49qtdzXR66z40jxxuC9HLsC4w/viewform

## Definition of done

A feature is `Done` only when:

- it works from a clean checkout or the published AWS URL;
- its behavior is demonstrated with simulated data;
- tests or repeatable manual checks are documented;
- uncertainty and failure states are visible instead of silently guessed;
- clinical output requires clinician review; and
- the pull request contains no secrets or sensitive health information.

CareScribe may organize observations and surface evidence-linked clinical considerations.
It must not autonomously diagnose, prescribe treatment, or select treatment frequency.
