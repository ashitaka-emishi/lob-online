---
issue: 36
title: "fix(issue-implement): add explicit issue-close step with HCP"
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The `issue-implement` skill and `issue-implement` workflow definition do not reliably close the GitHub issue after merge. The PR merge step squashes and deletes the branch but never calls `gh issue close`, leaving issues open even when all acceptance criteria are delivered. An explicit issue-close step guarded by a human control point is needed so the engineer can verify delivery before the issue is marked done.

## Acceptance Criteria

- [ ] `/issue-implement` (`.claude/commands/issue-implement.md`) gains a **Step 9 — Close issue** after the merge step: runs `gh issue close <number> --comment "..."` with a brief summary of the merged commit
- [ ] Step 9 is gated by **HCP 4**: after `/pr-merge` completes, display the merged commit SHA and issue URL, and wait for explicit "close" signal before calling `gh issue close`
- [ ] If the user does not say "close", the skill stops at HCP 4 and reports the issue URL so the engineer can close manually
- [ ] `docs/workflows/issue-implement/issue-implement.workflow.json` gains a `close-issue` step (agentId: `issue-close` or equivalent) after `gate-merged`, plus a `gate-close` gate step (HCP 4) before it
- [ ] `docs/workflows/issue-implement/issue-implement.states.md` updated: `gate-close` added to state diagram and gate checkpoint table
- [ ] `/dev-build` passes (format, lint, build)

## Files to Create / Modify

| File                                                           | Action                                            |
| -------------------------------------------------------------- | ------------------------------------------------- |
| `.claude/commands/issue-implement.md`                          | MODIFY — add Step 9 (HCP 4 + `gh issue close`)   |
| `docs/workflows/issue-implement/issue-implement.workflow.json` | MODIFY — add `gate-close` + `close-issue` steps   |
| `docs/workflows/issue-implement/issue-implement.states.md`     | MODIFY — update diagram and checkpoint table      |

## Tests Required

No unit tests — this is skill/workflow configuration only. Verification:

- `/dev-build` must pass (format no changes, lint clean, build succeeded)
- Manual: run `/issue-implement` on a test issue and confirm HCP 4 prompt appears before `gh issue close` is called

## Rules / Data Dependencies

None — no game mechanics involved.

## Depends On

None.

## Milestone

v1.0 — MVP
