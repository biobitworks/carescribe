# Skill Expansion Governance Loop

## Purpose

GettingScienceDone, Ollarma, and Antigence may expand their capabilities by adding packages, prompts, tools, agents, models, APIs, SOPs, or human expertise. Capability growth must not silently expand authority.

## Loop

```text
capability gap detected
    ↓
skill request FCO
    ↓
source, license, and identity review
    ↓
Anticube admission
    ↓
isolated sandbox installation
    ↓
capability and failure tests
    ↓
risk and permission scope
    ↓
human approval
    ↓
versioned skill release FCO
    ↓
bounded Ollarma execution
    ↓
receipt and outcome review
    ↓
retain, restrict, update, expire, or revoke
```

## Skill object fields

- skill ID and version
- type: human, package, prompt, model, tool, API, SOP, or agent
- source and author
- license and use restrictions
- content or package hash
- dependencies
- requested permissions
- approved permissions
- allowed project types
- prohibited actions
- validation tests
- failure tests
- Anticube classification
- approving authority
- effective date
- expiration or review date
- observed failures
- superseded versions
- revocation reason

## Rules

1. A new skill begins as non-self until admitted.
2. A previously admitted skill can become self/non-safe after an update, context change, or observed failure.
3. Skill competence and skill authority are separate.
4. Passing a unit test does not authorize clinical, publication, security, or release decisions.
5. Skills receive minimum necessary permissions.
6. Skills used in consequential work must be pinned by version and hash.
7. The exact skill set used in a run becomes part of the run FCO.
8. Revocation blocks new runs but does not invalidate historical custody.
9. Historical claims are reassessed when a revoked skill materially supported them.
10. Public skill mirrors must be derived from a reviewed private release.
