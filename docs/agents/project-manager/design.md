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
- **Human control points** — three explicit gates before an issue is filed: (1) rules-lawyer
  consultation when game mechanics are involved, (2) milestone existence confirmation before
  creating a new milestone, (3) full draft review and explicit user approval before calling
  `gh issue create`; the agent never writes code or opens PRs directly

---

## 2. GitHub Environment

### Milestones

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
```

### Issue Template — `.github/ISSUE_TEMPLATE/feature.md`

Fields required for AI-implementable tickets:

- **Title:** imperative phrase, ≤ 70 characters (e.g., `Implement movement cost lookup for RSS trails`)
- **Description:** 2–4 sentences — what the feature does and why
- **Acceptance criteria:** bulleted list of specific, testable conditions
- **Files to create/modify:** explicit file paths where known
- **Tests required:** what test cases must exist and what they must assert
- **Rules/data dependencies:** cite `LOB_RULES §X`, `SM_RULES §Y`, etc.; flag rules-lawyer consultation
- **Depends on:** `#issue-number` (optional)
- **Milestone:** `v1.0 — MVP` / `v2.0 — Enhanced` / `v3.0 — Extended`

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

---

## 3. Skills

### `issue-intake` — `.claude/commands/issue-intake.md`

**Purpose:** Guide the agent (or user) through creating a well-formed, AI-actionable GitHub
issue, with optional `rules-lawyer` consultation for game-logic features.

**Steps:**

1. Gather the raw requirement from the user (free text, existing notes, or a HLD gap)
2. Classify the issue type: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`
3. **Rules gate** — if the issue touches game mechanics, movement, LOS, combat, morale,
   orders, artillery, or data models: invoke `rules-lawyer`; record "rules-lawyer consulted on
   YYYY-MM-DD" in the Rules/data dependencies field
4. Draft the issue body using the feature template
5. **HUMAN CONTROL POINT** — verify the milestone exists; if not, ask the user to confirm
   before creating it; do not proceed until approved
6. **HUMAN CONTROL POINT** — show the full draft and wait for explicit user approval before
   filing; accept edits and redisplay if requested
7. Create the issue: `gh issue create --title "..." --body "..." --milestone "v1.0 — MVP"`
8. Report the issue URL

---

## 4. Agent Definition

**File:** `.claude/agents/project-manager.md`

```yaml
---
name: project-manager
description: >
  Manage the lob-online SDLC using GitHub as the source of truth. Owns the pipeline from raw
  idea → well-formed GitHub issue → milestone assignment. Use when asked to file an issue, plan
  a feature area, audit the backlog, or check that issues and documentation are in sync.
tools: Bash, Read, Glob, Grep
---
```

### Agent Responsibilities

- **Issue intake** — draft and file well-formed GitHub issues via `issue-intake` skill; consult
  `rules-lawyer` whenever game mechanics are involved; every filed issue must be implementable
  by a coding agent without follow-up questions
- **Milestone planning** — map new work to the correct HLD phase and milestone; create milestones
  via `gh api` if they do not exist yet; never create scope outside an existing phase without
  flagging it for human approval
- **Consistency enforcement** — audit that open issues reference the correct milestone, closed
  issues match CLAUDE.md/HLD status, and acceptance criteria align with rules-lawyer rulings

### What the Agent Does NOT Do

- Write code or create pull requests — that is the coding agent + `create-pr` skill
- Override the `rules-lawyer`'s rulings on game mechanics
- Merge or close pull requests

### Key Files

- `docs/high-level-design.md` — phased plan and implementation status
- `docs/agents/project-manager/design.md` — full design spec for this agent
- `CLAUDE.md` — project overview and coding standards
- `.github/ISSUE_TEMPLATE/feature.md` — required fields for AI-implementable tickets
- `.claude/commands/issue-intake.md` — issue creation skill

---

## 5. Implementation Checklist

- [x] `.github/ISSUE_TEMPLATE/feature.md` — issue template
- [x] `.github/pull_request_template.md` — PR template
- [x] `.claude/commands/issue-intake.md` — issue-intake skill
- [x] `.claude/agents/project-manager.md` — agent definition
- [x] `docs/agents/project-manager/prompt.md`
- [x] `docs/agents/project-manager/design.md`
- [x] `CLAUDE.md` updated
