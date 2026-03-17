# Issue Intake Agent Design

## 1. Overview

The `issue-intake` agent turns a raw requirement into a filed, milestone-assigned GitHub
issue through lightweight interactive conversation. It gathers and refines the issue draft
with the engineer, then files the issue on GitHub after explicit approval (HCP 1).

No branch is opened, no artifact is committed, and no PR is created. The filed GitHub issue
is the authoritative record.

### Guiding Principles

- **Conversation-only** — the agent holds the draft in memory during refinement; nothing is
  written to disk until `gh issue create` is called
- **Code-free** — this agent never modifies source code or data files
- **Iterative refinement** — the issue draft is never filed until the engineer explicitly
  approves it; the agent loops as many times as needed
- **Single human control point** — one explicit gate: issue creation via `gh issue create`;
  the agent never calls it without "proceed" / "yes" / "confirm" from the engineer

---

## 2. Workflow

### Step 1 — Gather and refine

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

### Step 2 — Create GitHub issue (HCP 1)

```bash
gh issue create --title "TITLE" --body "BODY" --milestone "MILESTONE"
```

> **HUMAN CONTROL POINT** — Display the full draft and wait for explicit approval before
> calling `gh issue create`. Do not proceed until the engineer replies with "proceed", "yes",
> "confirm", or equivalent. Report the issue URL after creation.

---

## 3. Skills

This agent IS the skill. It owns no sub-skills of its own. It calls:

- `rules-lawyer` agent — in Step 1 when game mechanics are involved

---

## 4. Agent Definition

<!-- KEY DESIGN RULE: This section heading must never be renamed.
     The /agent-regenerate and /agent-sync skills locate content here. -->

**File:** `.claude/agents/issue-intake.md`

```yaml
---
name: issue-intake
description: >
  Guide the creation of a well-formed, AI-actionable GitHub issue. Gathers and refines
  the draft iteratively with the engineer, then files the issue (HCP). No branch is
  opened, no artifact is committed, and no PR is created — the filed issue is the record.
tools: Bash, Read, Glob, Grep
---
```

### Agent Responsibilities

- **Issue drafting** — gather raw requirement; classify type; invoke `rules-lawyer` for game
  logic; produce a complete, AI-actionable issue body with all required template fields
- **Iterative refinement** — loop with the engineer until the draft is approved
- **Milestone check** — verify the milestone exists in GitHub before filing; ask for approval
  if it needs to be created
- **Filing** — create the GitHub issue; report URL

### What the Agent Does NOT Do

- Open branches, commit files, or create pull requests
- Modify source code files (`.js`, `.vue`, `.json` data files, etc.)
- Override the `rules-lawyer`'s rulings on game mechanics
- Skip the human control point or auto-file without explicit engineer approval
- Create GitHub milestones without explicit engineer approval

### Key Files

- `docs/agents/issue-intake/design.md` — this design spec
- `docs/agents/issue-intake/prompt.md` — design prompt used to author this agent
- `.claude/commands/issue-intake.md` — skill file (this agent IS the skill)
- `.github/ISSUE_TEMPLATE/feature.md` — required fields for AI-implementable tickets

---

## 5. Implementation Checklist

- [x] `docs/agents/issue-intake/design.md` — this file
- [x] `docs/agents/issue-intake/prompt.md`
- [x] `.claude/agents/issue-intake.md`
- [x] `.claude/commands/issue-intake.md` — simplified 2-step workflow
- [x] `docs/agents/project-manager/design.md` — issue-intake removed from §3 Skills
- [x] `docs/agents/project-manager/prompt.md` — updated
- [x] `.claude/agents/project-manager.md` — updated
- [x] `.claude/README.md` — issue-intake added as own agent row
- [x] `docs/architecture.md` — issue-intake agent added
- [x] `CLAUDE.md` — reference issue-intake agent
- [x] `.claude/settings.json` — Agent(issue-intake) added
