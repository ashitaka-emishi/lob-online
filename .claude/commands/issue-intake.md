---
description: Guide the creation of a well-formed, AI-actionable GitHub issue without any branch, artifact commit, or PR lifecycle
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

You are running the **issue-intake** skill for the lob-online project. Your job is to turn a
raw requirement into a filed, milestone-assigned GitHub issue. The issue itself is the
authoritative record — no branch, no artifact, no PR.

**One human control point is required:**

1. **Issue filing** — always show the full draft and wait for explicit engineer approval before
   calling `gh issue create`.

Work through these steps in order.

---

## Step 1 — Gather, classify, and iteratively refine

### 1a — Gather

Ask the user (or read from context) for the raw requirement: what should be built and why.
Accept free text, notes, or a reference to a gap in `docs/high-level-design.md`.

### 1b — Classify

Determine the issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, or `chore`.

### 1c — Rules gate

Check whether the issue touches any of: game mechanics, movement, LOS, combat, morale,
orders, artillery, or data models (`map.json`, `oob.json`, `leaders.json`, `scenario.json`).

**If yes:** invoke the `rules-lawyer` agent with a concise description of the feature.
Summarize any rule conflicts, SM overrides, or errata that must appear in the acceptance
criteria. Record "rules-lawyer consulted on YYYY-MM-DD" in the Rules/data dependencies field.

**If no:** skip this step.

### 1d — Draft the issue body

Use these fields (all required except Depends on):

**Title** — imperative phrase, ≤ 70 characters
(e.g., `Implement movement cost lookup for RSS trails`)

**Description** — 2–4 sentences: what the feature does and why it is needed

**Acceptance criteria** — bulleted list of specific, testable conditions; each criterion must
be verifiable by reading code or running tests without human judgment

**Files to create/modify** — explicit file paths where known

**Tests required** — what test cases must exist and what they assert

**Rules / data dependencies** — cite `LOB_RULES §X`, `SM_RULES §Y`, `SM_ERRATA`, etc.;
include rules-lawyer consultation note if the rules gate was triggered

**Depends on** — `#issue-number` or "none"

**Milestone** — `v1.0 — MVP`, `v2.0 — Enhanced`, or `v3.0 — Extended`
(match HLD phase: Phase 1 → MVP, Phase 2 → Enhanced, Phase 3 → Extended)

### 1e — Milestone check

Verify the milestone exists in GitHub:

```bash
gh api /repos/{owner}/{repo}/milestones --jq '.[].title'
```

If the milestone does not exist, stop and report:
"The milestone `<name>` does not exist yet. Shall I create it, or assign a different
milestone?" Do not create milestones or proceed until the user explicitly approves.

### 1f — Refinement loop

Display the complete issue draft (all fields) and ask the user to confirm or request changes.
If the user requests edits, revise the draft and show it again. Repeat until the user signals
ready ("yes", "looks good", "confirm", or equivalent).

---

## Step 2 — Create the GitHub issue (HCP 1)

> **HUMAN CONTROL POINT** — Do not call `gh issue create` until the user replies with an
> explicit approval. If the user requests edits, revise the draft and show it again first.

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

Report the issue URL.
