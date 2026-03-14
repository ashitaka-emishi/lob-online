---
description: Guide the creation of a well-formed, AI-actionable GitHub issue
allowed-tools: Bash, Read, Glob, Grep
---

You are running the **issue-intake** skill for the lob-online project. Your job is to turn a raw
requirement into a filed, milestone-assigned GitHub issue that an AI coding agent can implement
without follow-up questions.

Work through these steps in order.

## Step 1 — Gather

Ask the user (or read from context) for the raw requirement: what should be built and why. Accept
free text, notes, or a reference to a gap in `docs/high-level-design.md`.

## Step 2 — Classify

Determine the issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, or `chore`.

## Step 3 — Rules gate

Check whether the issue touches any of: game mechanics, movement, LOS, combat, morale, orders,
artillery, or data models (`map.json`, `oob.json`, `leaders.json`, `scenario.json`).

**If yes:** invoke the `rules-lawyer` agent with a concise description of the feature. Summarize
any rule conflicts, SM overrides, or errata that must appear in the acceptance criteria. Record
"rules-lawyer consulted on YYYY-MM-DD" in the Rules/data dependencies field.

**If no:** skip this step.

## Step 4 — Draft the issue body

Use these fields (all required except Depends on):

**Title** — imperative phrase, ≤ 70 characters
(e.g., `Implement movement cost lookup for RSS trails`)

**Description** — 2–4 sentences: what the feature does and why it is needed

**Acceptance criteria** — bulleted list of specific, testable conditions; each criterion must be
verifiable by reading code or running tests without human judgment

**Files to create/modify** — explicit file paths where known
(e.g., `server/src/rules/movement.js`, `server/src/rules/movement.test.js`)

**Tests required** — what test cases must exist and what they assert

**Rules / data dependencies** — cite `LOB_RULES §X`, `SM_RULES §Y`, `SM_ERRATA`, etc.;
include rules-lawyer consultation note if Step 3 was triggered

**Depends on** — `#issue-number` or "none"

**Milestone** — `v1.0 — MVP`, `v2.0 — Enhanced`, or `v3.0 — Extended`
(match HLD phase: Phase 1 → MVP, Phase 2 → Enhanced, Phase 3 → Extended)

## Step 5 — Show and confirm

Display the full draft and ask the user to confirm or request changes. Do not file until
confirmed.

## Step 6 — Create the issue

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

## Step 7 — Report

Output the issue URL.
