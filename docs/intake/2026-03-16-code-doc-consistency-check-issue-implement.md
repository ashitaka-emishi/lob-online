---
issue: 46
title: Add code-doc consistency check step to issue-implement workflow
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The `issue-implement` workflow has no mechanism to detect drift between code changes and documentation (CLAUDE.md, `high-level-design.md`, agent design docs, skill prompts). After implementation, doc references to file paths, API shapes, and agent behaviour can silently become stale. A new `doc-sync` step — inserted between `test` and `gate-impl` — should compare the set of changed files against known documentation anchors and surface specific update requirements before HCP 2 approval.

## Acceptance criteria

- A new skill `.claude/commands/doc-sync.md` is created that:
  - Reads `git diff --name-only origin/master...HEAD` to obtain the set of changed source files
  - For each changed file, checks for doc references in `CLAUDE.md`, `docs/high-level-design.md`, and any `docs/agents/*/design.md` that mention the file path or the subsystem it belongs to
  - Reports a structured findings table: `File changed | Docs that reference it | Action required (update / ok / n/a)`
  - Exits non-zero (reports as warning) when any doc requires an update; exits zero when all docs are consistent
- `.claude/commands/issue-implement.md` is updated to invoke `/doc-sync` between Step 3 (implement) and Step 4 (build), and to include doc-sync findings in the HCP 2 report
- `docs/workflows/issue-implement/issue-implement.workflow.json` is updated to add a `doc-sync` step between `implement` and `build`, with `onError: "continue_with_warning"`
- `docs/workflows/issue-implement/issue-implement.states.md` is updated to include `doc-sync` in the state diagram and gate checkpoint table
- The new skill is also runnable standalone (i.e., `claude /doc-sync` in any feature branch produces a valid report)
- At least one Vitest test covers the logic that maps changed file paths to documentation anchors (if any server-side logic is extracted); otherwise a manual smoke-test script suffices and is documented in the AC

## Files to create/modify

- `.claude/commands/doc-sync.md` — new skill
- `.claude/commands/issue-implement.md` — add `/doc-sync` step
- `docs/workflows/issue-implement/issue-implement.workflow.json` — add `doc-sync` step node
- `docs/workflows/issue-implement/issue-implement.states.md` — update state diagram and gate table

## Tests required

- If any parsing/mapping logic is extracted to server or client code: a Vitest unit test that given a list of changed paths returns the correct set of documentation anchors needing review
- Smoke test: run `/doc-sync` on the feature branch implementing this issue itself and verify the report includes `CLAUDE.md` as a doc requiring update (since CLAUDE.md mentions `issue-implement.md`)

## Rules / data dependencies

None — this issue does not touch game mechanics or data models.

## Depends on

none

## Milestone

v1.0 — MVP
