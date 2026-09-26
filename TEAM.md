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
| Responsive web interaction | Byron | Main | `web/` | Implemented; public deployment browser-verified |
| Live transcription and speaker roles | Byron | Main | `web/` | Implemented; browser/vendor dependent |
| Bedrock observations and summaries | Byron | Main | Tests and receipts | Nova Micro and Pro paths live-verified |
| Real-time questions and duplex voice | Byron | Main | `web/voice.html`; `validation/nova-sonic-smoke.json` | Local synthetic Nova Sonic path implemented; public bridge and production operation not implemented |
| Session persistence and deletion | Byron | Main | Browser demo and tests | Browser-local only |
| AWS hosting and deployment | Julie | Issue 3 | GitHub Pages fallback below | Blocked by workshop IAM |
| Clinical safety and privacy review | Byron | Main | `docs/` | Prototype audit complete; not PHI-ready |
| Slides and backup demo video | Byron | Main | Public Pages paths below | Public and locally decoded; judge-accessible |

## Shared links

- Repository: https://github.com/biobitworks/carescribe
- Live application: https://biobitworks.github.io/carescribe/
- Slides: https://biobitworks.github.io/carescribe/slides.html
- Backup video: https://biobitworks.github.io/carescribe/assets/carescribe-three-actor-demo.mp4
- Submission form:
  https://docs.google.com/forms/d/e/1FAIpQLSfWlRj2fPWD0bdkF57VJxkKp49qtdzXR66z40jxxuC9HLsC4w/viewform

## Remaining deadline issues

- [Final form submission](https://github.com/biobitworks/carescribe/issues/1)
- [Slides and backup video](https://github.com/biobitworks/carescribe/issues/2)
- [AWS hosting deployment](https://github.com/biobitworks/carescribe/issues/3)

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
