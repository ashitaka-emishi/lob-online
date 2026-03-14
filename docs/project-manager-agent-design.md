# Project Manager Agent Design

## 1. Overview

The `project-manager` agent manages the lob-online SDLC using GitHub as the source of truth.
It owns the pipeline from raw idea → well-formed GitHub issue → milestone assignment, and keeps
issues, documentation, and code in sync.

### Guiding Principles

- **Lightweight issues** — one issue per discrete, AI-implementable unit of work; a single
  coding session should be able to close one issue
- **AI-actionable tickets** — issues must be specific enough that a coding agent can implement
  them without follow-up questions: explicit file paths, testable acceptance criteria, and cited
  rule references where game logic is involved
- **Rules-lawyer gate** — any issue that touches game mechanics, movement, LOS, combat, morale,
  orders, artillery, or data models must be reviewed by the `rules-lawyer` agent before filing;
  rule conflicts and SM overrides must appear in the acceptance criteria
- **Human control point** — every code change flows through a pull request; the agent never
  writes code or opens PRs directly

---

## 2. GitHub Environment Setup

These artifacts must be created before the agent is fully useful.

### GitHub Milestones

Milestones map directly to HLD phases. Created via `gh api` (no `gh milestone` command exists).

| Milestone         | HLD Phase                     | Description                                       |
| ----------------- | ----------------------------- | ------------------------------------------------- |
| `v1.0 — MVP`      | Phase 1 — MVP                 | Full playable South Mountain scenario             |
| `v2.0 — Enhanced` | Phase 2 — Enhanced Experience | Discord bot DMs, replay viewer, mobile UX         |
| `v3.0 — Extended` | Phase 3 — Extended Content    | Additional scenarios, spectator mode, AI opponent |

**Create milestones:**

```bash
gh api /repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v1.0 — MVP" \
  --field description="Full playable South Mountain scenario"

gh api /repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v2.0 — Enhanced" \
  --field description="Discord bot DMs, replay viewer, mobile UX"

gh api /repos/{owner}/{repo}/milestones \
  --method POST \
  --field title="v3.0 — Extended" \
  --field description="Additional scenarios, spectator mode, AI opponent"
```

### Issue Template — `.github/ISSUE_TEMPLATE/feature.md`

Fields required for AI-implementable tickets:

- **Title:** imperative phrase, ≤ 70 characters
  (e.g., `Implement movement cost lookup for RSS trails`)
- **Description:** 2–4 sentences — what the feature does and why
- **Acceptance criteria:** bulleted list of specific, testable conditions
- **Files to create/modify:** explicit file paths where known
- **Tests required:** what test cases must exist and what they must assert
- **Rules/data dependencies:** which source document applies
  (cite `LOB_RULES §X`, `SM_RULES §Y`, etc.); flag if `rules-lawyer` consultation happened
- **Depends on:** `#issue-number` (optional)
- **Milestone:** `v1.0 — MVP` / `v2.0 — Enhanced` / `v3.0 — Extended`

Template file contents:

```markdown
---
name: Feature
about: A discrete, AI-implementable unit of work
---

## Description

<!-- 2–4 sentences: what the feature does and why it is needed -->

## Acceptance criteria

- [ ]
- [ ]

## Files to create/modify

<!-- List explicit paths where known, e.g. server/src/rules/movement.js -->

## Tests required

<!-- What test cases must exist and what they assert -->

## Rules / data dependencies

<!-- Cite LOB_RULES §X, SM_RULES §Y, SM_ERRATA, etc. -->
<!-- Note: "rules-lawyer consulted on YYYY-MM-DD" if applicable -->

## Depends on

<!-- #issue-number or "none" -->

## Milestone

<!-- v1.0 — MVP / v2.0 — Enhanced / v3.0 — Extended -->
```

### PR Template — `.github/pull_request_template.md`

```markdown
## Summary

-
-

## Closes

Closes #

## Test plan

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes
- [ ] Manual smoke test performed (describe briefly)

## Devlog

- [ ] Devlog entry written in `docs/devlog/YYYY-MM-DD.md`
```

### `settings.local.json` Additions Required

The following `gh` commands must be permitted in addition to those already configured:

```
gh issue create
gh issue edit
gh issue list
gh issue view
gh api              (for milestone create/list/query)
gh pr create        (already used by create-pr skill)
```

---

## 3. Skill — `issue-intake`

**File:** `.claude/commands/issue-intake.md`

**Purpose:** Guide the agent (or user) through creating a well-formed, AI-actionable GitHub
issue, with optional `rules-lawyer` consultation for game-logic features.

### Steps

1. **Gather** the raw requirement from the user (free text, existing notes, or a HLD gap)
2. **Classify** the issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`
3. **Rules gate** — if the issue touches game mechanics, movement, LOS, combat, morale,
   orders, artillery, or data models:
   - Invoke the `rules-lawyer` agent with a concise description of the feature
   - Summarize any rule conflicts, SM overrides, or errata that must appear in the
     acceptance criteria
   - Record "rules-lawyer consulted on YYYY-MM-DD" in the Rules/data dependencies field
4. **Draft** the issue body using the feature template:
   - Title (imperative, ≤ 70 chars)
   - Description (2–4 sentences)
   - Acceptance criteria (specific, testable)
   - Files to create/modify (explicit paths if known)
   - Tests required
   - Rules/data dependencies (include `rules-lawyer` output if consulted)
   - Depends-on links
   - Milestone assignment
5. **Show** the draft and ask for confirmation or edits
6. **Create** the issue:
   ```bash
   gh issue create --title "..." --body "..." --milestone "v1.0 — MVP"
   ```
7. **Report** the issue URL

---

## 4. Agent Definition

**File:** `.claude/agents/project-manager.md`
**Tools:** Bash, Read, Glob, Grep

### Responsibilities

**Issue intake**
Draft and file well-formed GitHub issues using the `issue-intake` skill. Consult `rules-lawyer`
whenever game mechanics are involved. Every filed issue must be implementable by a coding agent
without follow-up questions.

**Milestone planning**
Map new work to the correct HLD phase and milestone. Create milestones via `gh api` if they do
not exist yet. Never create scope that does not fit an existing phase without explicitly flagging
it as Phase 3+ or proposing a new milestone for human approval.

**Consistency enforcement**
On request, audit that:

- Open issues reference the correct milestone
- Closed issues whose feature is described in CLAUDE.md or the HLD Implementation Status block
  are actually marked closed in GitHub
- The HLD Implementation Status callout matches GitHub milestone completion state
- Issue acceptance criteria align with what the `rules-lawyer` says the rules require

### What the Agent Does NOT Do

- Write code or create pull requests — that is the coding agent + `create-pr` skill
- Override the `rules-lawyer`'s rulings on game mechanics
- Merge or close pull requests

---

## 5. Long-Term Planning Approach

When the user asks to plan a new feature area or audit the backlog:

1. Read `docs/high-level-design.md` — Implementation Status callout and Phased Development Plan
2. List open issues grouped by milestone:
   ```bash
   gh issue list --milestone "v1.0 — MVP"
   gh issue list --milestone "v2.0 — Enhanced"
   gh issue list --milestone "v3.0 — Extended"
   ```
3. Identify gaps between HLD "Planned" items and filed issues
4. For each gap, decide whether it needs one issue or several — grain size rule:
   a single AI coding session should be able to close one issue
5. File gap issues via the `issue-intake` skill with milestone assignments
6. Report a coverage summary: HLD items that have issues vs. those that do not

---

## 6. Implementation Checklist

Create in order:

- [ ] `.github/ISSUE_TEMPLATE/feature.md` — issue template
- [ ] `.github/pull_request_template.md` — PR template
- [ ] `.claude/commands/issue-intake.md` — issue-intake skill
- [ ] `.claude/agents/project-manager.md` — agent definition
- [ ] `settings.local.json` — add `gh issue create/edit/list/view` and `gh api` permissions
- [ ] Create the three GitHub milestones via `gh api` (see commands in §2)

No source code changes are required.
