# CareScribe deadline implementation plan

Date: 2026-09-26

## Release slices

1. **Actor pages:** publish separate Provider, Caregiver, Child, and Projector pages.
   Each page shows only the script, decisions, and evidence that actor needs.
2. **Model page:** show model, function, location, and evidence status from the local
   `/api/health` endpoint. On a static host, show a conspicuous static-only state.
3. **Live room:** keep the complete consent, transcript, role-selection, approval,
   room-event, and custody workflow on the main interaction page.
4. **Presentation and replay:** keep the judge deck and 60-second recorded fallback on
   separate URLs. Rebuild the replay from the current Julie/Maya/Leo screens.
5. **Audio handoff:** preserve three distinct synthetic fallback voices and make the
   final media build accept a replacement in-person recording without changing visuals.
6. **Evidence and release:** run Python, JavaScript, browser, media-decode, secret-scan,
   and public-link checks; commit and push the proven package.

## Model/function fan-out

| Function | Model/reviewer | Release boundary |
| --- | --- | --- |
| Laptop-local privacy gate | LiquidAI LFM2.5 1.2B GGUF | Synthetic local-server input only |
| Approved public event atomization | Amazon Nova Micro | Untrusted remote draft |
| Handoff synthesis | Amazon Nova Pro | Full synthetic transcript; human review required |
| Full-duplex audio | Amazon Nova 2 Sonic | Local synthetic invocation and browser bridge verified; public deployment not integrated |
| Realtime alternative | OpenAI gpt-realtime-2.1 | API access only; browser duplex not integrated |
| Privacy/claims review | GPT-5.6 Sol subagent | Claim ceiling and residual findings |
| Replay/demo review | GPT-5.6 Terra subagent | Media and judge-flow QA |

## Done criteria

- Every actor and presentation surface has a direct URL.
- A local browser displays real health and room responses; a static browser never
  implies that a backend or model is running.
- Caregiver actions and provider evidence match the incomplete-evaluation script.
- The replay is exactly 60 seconds, decodes fully, contains captions, and uses only
  fictional content.
- Model and custody claims do not exceed committed receipts or the privacy audit.
