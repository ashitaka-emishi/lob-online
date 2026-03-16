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

Issue intake has been promoted to the standalone `issue-intake` agent. See
`docs/agents/issue-intake/design.md` for the full spec. The `project-manager` agent
delegates to `issue-intake` for all issue creation workflows.

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

- **Issue intake** — delegate to the `issue-intake` agent for all issue creation workflows;
  the `issue-intake` agent handles drafting, filing, and the branch/PR lifecycle; consult
  `rules-lawyer` whenever game mechanics are involved
- **Milestone planning** — map new work to the correct HLD phase and milestone; create milestones
  via `gh api` if they do not exist yet; never create scope outside an existing phase without
  flagging it for human approval
- **Consistency enforcement** — audit that open issues reference the correct milestone, closed
  issues match CLAUDE.md/HLD status, and acceptance criteria align with rules-lawyer rulings

### What the Agent Does NOT Do

- Write code or create pull requests — that is the coding agent + `pr-create` skill
- Override the `rules-lawyer`'s rulings on game mechanics
- Merge or close pull requests

### Key Files

- `docs/high-level-design.md` — phased plan and implementation status
- `docs/agents/project-manager/design.md` — full design spec for this agent
- `CLAUDE.md` — project overview and coding standards
- `.github/ISSUE_TEMPLATE/feature.md` — required fields for AI-implementable tickets
- `docs/agents/issue-intake/design.md` — issue-intake agent (handles issue creation)
- `.claude/commands/issue-implement.md` — full ticket-to-merge orchestration skill

---

## 5. Implementation Checklist

- [x] `.github/ISSUE_TEMPLATE/feature.md` — issue template
- [x] `.github/pull_request_template.md` — PR template
- [x] `.claude/commands/issue-intake.md` — issue-intake skill
- [x] `.claude/commands/issue-implement.md` — issue-implement skill
- [x] `.claude/agents/project-manager.md` — agent definition
- [x] `docs/agents/project-manager/prompt.md`
- [x] `docs/agents/project-manager/design.md`
- [x] `CLAUDE.md` updated
