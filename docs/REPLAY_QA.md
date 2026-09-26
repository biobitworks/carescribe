# Replay QA — CareScribe Three-Actor Demo

Review date: 2026-09-26
Reviewed deliverable: `output/video/carescribe-three-actor-demo.mp4`
Reviewed sources: `docs/DEMO_REPLAY_SCRIPT.md`, `web/assets/replay-captions.vtt`, `validation/replay-voice-manifest.json`, and `validation/screenshots/`
Scope: media, caption, script, and presented-UI evidence review. This QA does **not** provide clinical validation.

## Overall: PARTIAL

The rebuilt MP4 is technically valid and matches the script's stated 60-second duration. It has H.264 video, AAC audio, and an English timed-text subtitle stream, with six contiguous, correctly ordered caption intervals. The supplied screenshots and sampled frames show the Julie/Maya/NARRATOR caregiver/provider storyline and an explicit non-diagnostic boundary. The final MP4 has one mixed stereo audio stream, however: actor separation is documented by synthetic-voice assignment and sequential captions, not independently verifiable per-actor output tracks. The script and VTT are word-for-word aligned for the six spoken turns and use `NARRATOR` for the third speaking role.

## Exact media evidence

`ffprobe -show_format -show_streams -of json output/video/carescribe-three-actor-demo.mp4` reported:

| Item | Result | Status |
|---|---|---|
| Container | QuickTime/MOV-family MP4 (`mov,mp4,m4a,3gp,3g2,mj2`); probe score `100`; `1,548,189` bytes | PASS |
| Total duration | `60.000000` seconds | PASS |
| Video | Stream 0: H.264/AVC (`avc1`), High profile, `1920x1080`, 1:1 SAR, 16:9 DAR, `yuv420p`, progressive, `30/1` fps, `1800` frames, duration `60.000000` seconds, bit rate `122972` b/s | PASS |
| Audio | Stream 1: AAC-LC (`mp4a`), 48 kHz, stereo, duration `60.000000` seconds, bit rate `74270` b/s | PASS, with track-separation limitation |
| Embedded subtitles | Stream 2: English (`language=eng`) `mov_text`/`tx3g`, duration `60.000000` seconds; `nb_frames=7` | PASS |
| File-level rate | Format bit rate `206425` b/s | PASS |

The embedded subtitle packets are six consecutive 10-second packets: 00:00–00:10 (106 bytes), 00:10–00:20 (104), 00:20–00:30 (85), 00:30–00:40 (82), 00:40–00:50 (92), and 00:50–01:00 (108).

## Script, captions, and voice evidence

| Check | Status | Exact evidence |
|---|---|---|
| Duration/timeline alignment | PASS | The script is titled “60 Seconds” and specifies six ten-second intervals from 0:00 through 1:00. The VTT, extracted embedded subtitles, and MP4 duration use that same schedule. |
| Speaker order/non-overlap | PASS | Julie is at 00:00–00:10 and 00:30–00:40; Maya at 00:10–00:20 and 00:40–00:50; narration at 00:20–00:30 and 00:50–01:00. No VTT/subtitle intervals overlap. |
| Fallback voice assignment | PASS as documented presentation evidence | The voice manifest identifies a fully fictional scenario and assigns Julie/Samantha (`en_US`), Maya/Karen (`en_AU`), and Narrator/Daniel (`en_GB`) to the matching turns. It identifies macOS local speech synthesis, no network requirement, and synthetic fallback audio. |
| Final-audio separation | PARTIAL | The final MP4 has **one** audio stream: AAC-LC stereo. It contains no separate Julie, Maya, or Leo/Narrator streams. Separate build inputs exist—`01-julie.aiff`, `02-maya.aiff`, `03-narrator.aiff`—as mono PCM 22.05 kHz files of 10.764717 s, 11.421950 s, and 12.319728 s respectively, but they are not discrete deliverable tracks. |
| Script/VTT dialogue and role alignment | PASS | The six script dialogue turns match the VTT word-for-word (apart from caption line wrapping and typographic apostrophe rendering), and the third speaking role is `NARRATOR` in both. |

## Julie, Maya, and Leo caregiver/provider content

| Role/segment | Evidence reviewed | Finding |
|---|---|---|
| Julie — 00:00–00:10 | Script/VTT state that Leo's evaluation began but was not completed and Julie is due for the next visit. | PASS: establishes unfinished evaluation and follow-up context. |
| Maya — 00:10–00:20 | Script/VTT state that a return is needed but Maya does not yet know what today means or what to do beforehand. | PASS: states the caregiver information/action need. |
| NARRATOR — 00:20–00:30 | Script/VTT introduce the four anchors: Today, Next, Who, When. | PASS: presents a shared plan rather than a diagnosis. |
| Julie — 00:30–00:40 | Script/VTT say the second visit continues the evaluation and explicitly say, “We are not naming a diagnosis.” | PASS: clear non-diagnostic boundary. |
| Maya — 00:40–00:50 | Script/VTT direct Maya to observe HELP, MORE, and STOP communication using words, gestures, or actions. | PASS: concrete caregiver observation task. |
| NARRATOR — 00:50–01:00 | Script/VTT say, “A shared, clinician-reviewed plan preserves evidence, uncertainty, responsibilities, and timing.” | PASS: shared-plan/provider-evidence theme. |

## Presented UI and visual evidence

Frames were extracted at 00:05, 00:15, 00:25, 00:35, 00:45, and 00:55. The sequence samples the CareScribe developmental-visit workspace and reviewed caregiver/provider handoff. Current screenshots provide legible corroboration:

| Evidence | Status | Observed content |
|---|---|---|
| `validation/screenshots/final-judge-deck.png` (1440x1000) | PASS | Julie started Leo's evaluation but it is not complete; Maya should know what happened, next, who owns it, and when. It states “Clinician-reviewed support · simulated data · never diagnosis.” |
| `validation/screenshots/final-room-actors.png` (1113x510) | PASS | “One room, three voices, one reviewed record,” identifying Julie, SLP; Maya, caregiver; and Leo, with a prompt for what to notice before the second evaluation visit. |
| `validation/screenshots/final-caregiver-provider-handoff.png` (1113x833) | PASS | Caregiver card: incomplete evaluation; capture 2–3 HELP/MORE/STOP examples; Maya observes/Julie reviews; timing before/at the second evaluation visit. Provider card separates caregiver report, direct observation, uncertainty, and follow-up needs; it says “No diagnosis inferred” and shows caregiver-card approval/provider review. |
| `validation/screenshots/final-three-context-room-sync.png` (1113x86) | PASS | Only caregiver-approved, minimized updates synchronize; raw audio and names are excluded. |
| `validation/screenshots/final-model-routing.png` (1113x284) | PASS | Shows “Support, never diagnosis” and model-status display. This is product-state evidence, not a clinical claim. |

## Conclusion

The rebuilt deliverable passes technical media checks and its 60-second schedule. It clearly presents the fictional Julie/Maya/NARRATOR scenario, caregiver actions and responsibilities, provider evidence/review context, and an explicit non-diagnostic boundary. Do not represent it as having separately verifiable actor tracks, voice identification, diarization, or clinical validation.
