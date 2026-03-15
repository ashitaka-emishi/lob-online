---
description: Guide the creation of a well-formed, AI-actionable GitHub issue
allowed-tools: Bash, Read, Glob, Grep
---

You are running the **issue-intake** skill for the lob-online project. Your job is to turn a raw
requirement into a filed, milestone-assigned GitHub issue that an AI coding agent can implement
without follow-up questions.

**Two human control points are required before the issue is filed:**
1. **Milestone approval** — if the proposed milestone does not yet exist in GitHub, pause and ask
   the user to confirm before creating it.
2. **Issue draft approval** — always show the full draft and wait for explicit user confirmation
   before calling `gh issue create`.

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

## Step 5 — Milestone check

Verify the milestone exists in GitHub:

```bash
gh api /repos/{owner}/{repo}/milestones --jq '.[].title'
```

> **HUMAN CONTROL POINT** — If the milestone does not exist, **stop here** and report:
> "The milestone `<name>` does not exist yet. Shall I create it, or assign a different milestone?"
> Do not create milestones or proceed until the user explicitly approves.

## Step 6 — Show draft and confirm

Display the complete issue draft (all fields) and ask the user to confirm or request changes.

> **HUMAN CONTROL POINT** — Do not call `gh issue create` until the user replies with an
> explicit approval ("yes", "looks good", "confirm", or equivalent). If the user requests
> edits, revise the draft and show it again before asking for confirmation.

## Step 7 — Create the issue

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

## Step 8 — Report

Output the issue URL.
