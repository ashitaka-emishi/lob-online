---
description: Guide the creation of a well-formed, AI-actionable GitHub issue with a full branch/PR lifecycle
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

You are running the **issue-intake** skill for the lob-online project. Your job is to turn a
raw requirement into a filed, milestone-assigned GitHub issue backed by a committed intake
artifact on its own branch and pull request.

**Two human control points are required:**

1. **Issue filing** — always show the full draft and wait for explicit engineer approval before
   calling `gh issue create`.
2. **PR merge** — after `/pr-create`, wait for explicit "merge" signal before calling `/pr-merge`.

Work through these steps in order.

---

## Step 1 — Open intake branch

Before writing any file, derive a kebab-case slug from the proposed issue title and create a
branch. If the title is not yet known, ask for it first.

```bash
git checkout -b intake/{slug}
```

> **Scope guard** — only `docs/`, `.github/`, and `.claude/` paths may be committed on this
> branch. Source code changes (`.js`, `.vue`, `.json` data files) are explicitly prohibited.

---

## Step 2 — Gather, classify, and iteratively refine

### 2a — Gather

Ask the user (or read from context) for the raw requirement: what should be built and why.
Accept free text, notes, or a reference to a gap in `docs/high-level-design.md`.

### 2b — Classify

Determine the issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, or `chore`.

### 2c — Rules gate

Check whether the issue touches any of: game mechanics, movement, LOS, combat, morale,
orders, artillery, or data models (`map.json`, `oob.json`, `leaders.json`, `scenario.json`).

**If yes:** invoke the `rules-lawyer` agent with a concise description of the feature.
Summarize any rule conflicts, SM overrides, or errata that must appear in the acceptance
criteria. Record "rules-lawyer consulted on YYYY-MM-DD" in the Rules/data dependencies field.

**If no:** skip this step.

### 2d — Draft the issue body

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

### 2e — Milestone check

Verify the milestone exists in GitHub:

```bash
gh api /repos/{owner}/{repo}/milestones --jq '.[].title'
```

If the milestone does not exist, stop and report:
"The milestone `<name>` does not exist yet. Shall I create it, or assign a different
milestone?" Do not create milestones or proceed until the user explicitly approves.

### 2f — Refinement loop

Display the complete issue draft (all fields) and ask the user to confirm or request changes.
If the user requests edits, revise the draft and show it again. Repeat until the user signals
ready ("yes", "looks good", "confirm", or equivalent).

---

## Step 3 — Create the GitHub issue (HCP 1)

> **HUMAN CONTROL POINT** — Do not call `gh issue create` until the user replies with an
> explicit approval. If the user requests edits, revise the draft and show it again first.

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

Report the issue URL.

---

## Step 4 — Commit and push documentation artifacts

Write the issue body as an intake artifact:

**File:** `docs/intake/YYYY-MM-DD-{slug}.md`

The file must contain:

- A front-matter block with `issue`, `title`, `date`, `milestone`
- The full issue body (identical to what was filed in GitHub)

Stage the artifact and any other documentation files updated during the session, then commit
and push:

```bash
git add docs/intake/YYYY-MM-DD-{slug}.md
git commit -m "docs(intake): TITLE (#ISSUE_NUMBER)"
git push -u origin intake/{slug}
```

---

## Step 5 — Open PR (HCP 2)

Run `/pr-create` to write a devlog entry, run build checks, and open the pull request.
Display the PR URL.

> **HUMAN CONTROL POINT** — Wait for the user to say "merge" before running `/pr-merge`.
> Do not auto-merge.

---

## Step 6 — Merge the PR

Run `/pr-merge`.

If CI fails, diagnose the failure (read the failing check output), apply a targeted fix to
the affected documentation file, commit the fix, and re-run `/pr-merge`. Repeat until CI
passes and the branch is merged and deleted.
