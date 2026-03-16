# Issue Intake Agent Design

## 1. Overview

The `issue-intake` agent promotes issue creation from a flat skill into a fully documented,
version-controlled workflow. It guides the engineer from a raw requirement through iterative
refinement, GitHub issue filing, and a branch/PR lifecycle that persists every intake session
as a committed artifact.

### Guiding Principles

- **Branch-first** — every intake session opens an `intake/{slug}` branch before touching any
  file, so the intake artifact is traceable and reviewable
- **Code-free scope** — this agent writes only documentation and configuration files
  (`docs/`, `.github/`, `.claude/` paths); source code changes are explicitly prohibited
- **Iterative refinement** — the issue draft is never filed until the engineer explicitly
  approves it; the agent loops as many times as needed
- **Human control points** — two explicit gates: (1) issue creation via `gh issue create`, and
  (2) PR merge via `/pr-merge`; the agent never advances past either gate without "proceed" /
  "merge" from the engineer

---

## 2. Workflow

### Step 1 — Open intake branch

Before any file is created, create branch `intake/{issue-slug}`:

```bash
git checkout -b intake/{slug}
```

The slug is a short kebab-case label derived from the issue title (e.g., `add-unit-morale-cap`).
Only files under `docs/`, `.github/`, and `.claude/` may be committed on this branch.

### Step 2 — Gather and refine

Collect the raw requirement (free text, HLD gap reference, or existing notes). Then:

1. **Classify** — determine issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`
2. **Rules gate** — if the issue touches game mechanics, movement, LOS, combat, morale, orders,
   artillery, or data models (`map.json`, `oob.json`, `leaders.json`, `scenario.json`), invoke
   the `rules-lawyer` agent; record "rules-lawyer consulted on YYYY-MM-DD" in the
   Rules/data dependencies field
3. **Draft** — produce a full issue body using all required template fields (see §2 fields below)
4. **Display and loop** — show the draft; accept engineer feedback; revise; repeat until the
   engineer signals ready ("looks good", "confirm", "proceed", or equivalent)

#### Required issue fields

- **Title** — imperative phrase, ≤ 70 characters
- **Description** — 2–4 sentences: what the feature does and why it is needed
- **Acceptance criteria** — specific, testable bulleted list
- **Files to create/modify** — explicit file paths where known
- **Tests required** — what cases must exist and what they assert
- **Rules / data dependencies** — cite `LOB_RULES §X`, `SM_RULES §Y`, `SM_ERRATA`, etc.;
  include rules-lawyer consultation note if the rules gate was triggered
- **Depends on** — `#issue-number` or "none"
- **Milestone** — `v1.0 — MVP`, `v2.0 — Enhanced`, or `v3.0 — Extended`

Verify the milestone exists before the HCP:

```bash
gh api /repos/{owner}/{repo}/milestones --jq '.[].title'
```

If it does not exist, stop and ask the engineer to confirm before creating it.

### Step 3 — Create GitHub issue (HCP 1)

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

> **HUMAN CONTROL POINT** — Display the full draft and wait for explicit approval before
> calling `gh issue create`. Do not proceed until the engineer replies with "proceed", "yes",
> "confirm", or equivalent. Report the issue URL after creation.

### Step 4 — Commit and push documentation artifacts

Write the intake artifact to `docs/intake/YYYY-MM-DD-{slug}.md` with the full issue body.
If any HLD or design documents were updated during the session, stage those too.

```bash
git add docs/intake/YYYY-MM-DD-{slug}.md [other docs...]
git commit -m "docs(intake): TITLE (#ISSUE_NUMBER)"
git push -u origin intake/{slug}
```

### Step 5 — Open PR (HCP 2)

Run `/pr-create` to write a devlog entry, run build checks, and open the pull request.
Display the PR URL.

> **HUMAN CONTROL POINT** — Wait for the engineer to say "merge" before continuing.

### Step 6 — Merge PR

Run `/pr-merge`. If CI fails, diagnose the failure, apply a fix, and re-run `/pr-merge`.
Do not mark the intake complete until the branch is merged and deleted.

---

## 3. Skills

This agent IS the skill. It owns no sub-skills of its own. It calls:

- `/pr-create` — in Step 5 to open the pull request
- `/pr-merge` — in Step 6 to merge the branch
- `rules-lawyer` agent — in Step 2 when game mechanics are involved

---

## 4. Agent Definition

<!-- KEY DESIGN RULE: This section heading must never be renamed.
     The /agent-regenerate and /agent-sync skills locate content here. -->

**File:** `.claude/agents/issue-intake.md`

```yaml
---
name: issue-intake
description: >
  Guide the creation of a well-formed, AI-actionable GitHub issue with a full branch/PR
  lifecycle. Opens an intake/{slug} branch, iteratively refines the issue draft with the
  engineer, files the issue (HCP), commits documentation artifacts, opens a PR (HCP), and
  merges. Code-file changes are prohibited — only docs/, .github/, and .claude/ paths.
tools: Bash, Read, Write, Edit, Glob, Grep
---
```

### Agent Responsibilities

- **Branch management** — create `intake/{slug}` before any file is written; scope all changes
  to `docs/`, `.github/`, `.claude/` only
- **Issue drafting** — gather raw requirement; classify type; invoke `rules-lawyer` for game
  logic; produce a complete, AI-actionable issue body with all required template fields
- **Iterative refinement** — loop with the engineer until the draft is approved
- **Milestone check** — verify the milestone exists in GitHub before filing; ask for approval
  if it needs to be created
- **Filing and tracking** — create the GitHub issue; report URL; write intake artifact to
  `docs/intake/YYYY-MM-DD-{slug}.md`; commit and push
- **PR lifecycle** — run `/pr-create` and await "merge"; run `/pr-merge`; handle CI failures
  before retrying

### What the Agent Does NOT Do

- Modify source code files (`.js`, `.vue`, `.json` data files, etc.)
- Override the `rules-lawyer`'s rulings on game mechanics
- Skip human control points or auto-merge without explicit "merge" signal

### Key Files

- `docs/agents/issue-intake/design.md` — this design spec
- `docs/agents/issue-intake/prompt.md` — design prompt used to author this agent
- `.claude/commands/issue-intake.md` — skill file (this agent IS the skill)
- `.github/ISSUE_TEMPLATE/feature.md` — required fields for AI-implementable tickets
- `docs/intake/` — committed intake artifacts, one file per session

---

## 5. Implementation Checklist

- [x] `docs/agents/issue-intake/design.md` — this file
- [x] `docs/agents/issue-intake/prompt.md`
- [x] `.claude/agents/issue-intake.md`
- [x] `.claude/commands/issue-intake.md` — updated 6-step workflow
- [x] `docs/agents/project-manager/design.md` — issue-intake removed from §3 Skills
- [x] `docs/agents/project-manager/prompt.md` — updated
- [x] `.claude/agents/project-manager.md` — updated
- [x] `.claude/README.md` — issue-intake added as own agent row
- [x] `docs/architecture.md` — issue-intake agent added
- [x] `CLAUDE.md` — reference issue-intake agent
- [x] `.claude/settings.local.json` — Agent(issue-intake) added
