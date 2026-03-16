---
issue: 61
title: Add live editor review gate to issue-implement workflow
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The `issue-implement` workflow moves from test results directly to push (HCP 2) with no opportunity to verify the implementation in a running environment. This enhancement inserts a `dev-start` step after tests pass, a new `gate-editor` human control point where the engineer reviews the live editor and provides explicit approval or feedback, and a `dev-stop` step before continuing. When the engineer signals "fix," their free-text feedback is captured and passed as context into the next `implement` invocation so the AI can plan targeted corrections.

## Acceptance Criteria

- After `dev-test`, the workflow automatically runs `dev-start` to launch the server and Vite dev client
- A new gate `gate-editor` is inserted after `dev-start` with the prompt: "Review the running editor. Approve to stop the server and continue, or provide fix feedback to stop the server and loop back to implementation."
- Gate choice "Approve" stops the dev server (`dev-stop`) and advances to HCP 2 (doc-sync → build → push)
- Gate choice "Fix" captures the engineer's written feedback, stops the dev server (`dev-stop`), and loops back to `implement` with the feedback text injected into the implementation context
- `dev-stop` is called on both paths before leaving the gate so the server is never left running
- `issue-implement.workflow.json` contains the new `dev-start`, `gate-editor`, and `dev-stop` steps in the correct position
- `issue-implement.states.md` state diagram and gate checkpoint table are updated to reflect the new gate and its two transitions
- `issue-implement.md` skill prompt documents the new step between Step 5 (Test) and HCP 2 and explains the feedback-capture mechanic

## Files to Create/Modify

- `docs/workflows/issue-implement/issue-implement.workflow.json` — add `dev-start`, `gate-editor`, `dev-stop` steps; update `gate-impl` prompt to reflect that editor review already occurred
- `docs/workflows/issue-implement/issue-implement.states.md` — update state diagram and gate table
- `.claude/commands/issue-implement.md` — add Step 5a (Launch Editor), `gate-editor` HCP description, and feedback-capture mechanic

## Tests Required

- No automated tests (declarative workflow config). Manual verification checklist in AC is sufficient.
- `issue-implement.workflow.json` must be valid JSON (CI will catch parse errors)

## Rules / Data Dependencies

None — SDLC tooling only.

## Depends On

None

## Milestone

v1.0 — MVP
