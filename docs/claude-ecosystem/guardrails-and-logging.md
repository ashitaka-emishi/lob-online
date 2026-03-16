# Guardrails and Logging

The lob-online agent ecosystem is designed so that AI can handle the repetitive scaffolding
of software development while keeping humans in control of every consequential decision. This
page explains the five mechanisms that enforce that discipline.

---

## 1. Human Control Points (HCPs)

A **Human Control Point** is a hard stop built into a skill or agent where the workflow
pauses and waits for an explicit signal from the engineer before continuing. The skill will
not proceed — no code written, no issue filed, no PR merged — until it receives that signal.

### Standard HCPs in the issue-to-merge workflow

| HCP | Where | Trigger | Required signal |
| --- | ----- | ------- | --------------- |
| **HCP 0** (optional) | `/issue-start` | Significant architectural choice | explicit sign-off |
| **HCP 1** | `/issue-start` | Implementation plan displayed | `proceed` |
| **HCP 2** | `/issue-implement` | Build + test pass | `push` |
| **HCP 2b** | `/pr-review` | Review findings displayed | `fix all` / `fix errors only` / `accept` |
| **HCP 3** | `/pr-merge` | Final CI check passes | `merge` |

### Issue intake HCPs

| HCP | Where | Trigger | Required signal |
| --- | ----- | ------- | --------------- |
| **HCP 1** | `/issue-intake` | Issue draft displayed | `confirm` / `yes` / `looks good` |
| **HCP 2** | `/issue-intake` | PR opened | `merge` |

### What happens if an HCP is skipped?

Each HCP is enforced in the skill's Markdown instructions — the AI will not call `gh issue
create`, `gh pr merge`, or `git push` without receiving the required signal. If you are
running the workflow manually (outside Claude Code), treat these as mandatory review gates:
never skip them under time pressure. The purpose of each HCP is to give the engineer a
moment to catch errors before they propagate to a shared state (GitHub, main branch, etc.).

---

## 2. CI Gates

Before any PR is merged, three checks must pass locally:

```bash
npm run lint          # ESLint — no errors permitted
npm run format:check  # Prettier — all files must match code style
npm test              # Vitest — all tests must pass (70% line coverage threshold)
```

These same checks run in GitHub Actions CI on every push and pull request (`.github/workflows/ci.yml`).
A PR cannot be merged if CI is red. The `/pr-create` skill runs all three locally before
calling `gh pr create`, and `/pr-merge` verifies CI status before squash-merging.

**Why all three?** Lint catches logical errors and style violations. Format check prevents
noisy diffs where editors silently reformat files. Tests catch regressions. Running all three
locally before pushing catches failures in seconds rather than waiting for CI to run.

---

## 3. Rules-Lawyer Gate

Any GitHub issue that touches game mechanics, movement, line of sight (LOS), combat, morale,
orders, artillery, or the four data model files (`map.json`, `oob.json`, `leaders.json`,
`scenario.json`) must be reviewed by the `rules-lawyer` agent before acceptance criteria are
finalised.

The `/issue-intake` skill enforces this:

1. After classifying the issue type, it checks the description for game-logic keywords
2. If the rules gate triggers, it invokes the `rules-lawyer` agent with a concise description
3. The `rules-lawyer` returns a ruling citing the relevant rule sources
4. The ruling is summarised in the **Rules / data dependencies** field of the issue

The record looks like: _"rules-lawyer consulted on 2026-03-14: SM_RULES §4.2 takes precedence
over LOB_RULES §7.1 for trail movement costs."_

**Why?** lob-online implements a published board wargame. Getting the rules wrong in the
acceptance criteria means the code will implement the wrong behaviour, and fixing it later
requires re-reading the rules, re-implementing, and re-testing. The rules gate catches this
at the cheapest possible moment — before any code is written.

---

## 4. AI Execution Logs (ailog)

Every issue implementation produces a permanent structured log in `docs/ailog/`.

**File naming:** `docs/ailog/YYYY_MM_DD-LOB-{####}.md` (e.g. `2026_03_16-LOB-0022.md`)

**What the log contains:**

| Section | When written | Contents |
| ------- | ------------ | -------- |
| `## AI Plan` | `/issue-start` | Proposed implementation approach, files to change, test strategy |
| `## HCP 1 — Plan Accepted` | after HCP 1 approval | Timestamp; any engineer modifications |
| `## Branch Created` | `/issue-branch` | Branch name and timestamp |
| `## Implementation Notes` | after HCP 2 | Non-obvious decisions made during coding |
| `## Build & Test Results` | after HCP 2 | One-line summary from `/dev-build` and `/dev-test` |
| `## HCP 2 — Implementation Accepted` | after HCP 2 approval | Timestamp; any engineer requests |
| `## Review Findings` | `/pr-review` | Structured findings table from code review |
| `## HCP 2b — Review Triaged` | after HCP 2b | Engineer's decision; fixes applied |
| `## HCP 3 — Merge Approved` | `/pr-merge` | Timestamp |
| `## Merge Complete` | after merge | Merged commit SHA |

**Why it matters:** The ailog is the audit trail of every AI planning decision and human
approval in the project. It answers "why was this implemented this way?" without requiring
you to reconstruct intent from commit messages alone. AI logs are committed to the repository
and never deleted.

---

## 5. Devlog (Session Diary)

Every working session — whether it produces a PR or just exploration — generates a devlog
entry in `docs/devlog/YYYY-MM-DD.md`.

**Structure:** Each file has a `# YYYY-MM-DD` header and one or more `## HH:MM — Title`
sections. The `docs/devlog.md` index file contains a one-row-per-day summary table linking
to each daily file.

**What a devlog entry covers:**

- What the session delivered and why
- Key design decisions and the reasoning behind them
- Non-obvious tradeoffs or constraints future readers should know
- What was explicitly deferred to a later session

**Who writes it:** The `/pr-create` skill writes the devlog entry as part of the PR creation
flow. The entry is committed to the feature branch so it is part of the PR diff and review.

**The devlog vs. the ailog:** The devlog is human-readable narrative for anyone reading the
project history. The ailog is structured AI execution data with timestamps and approval
records. Both serve the same goal — making the project's decision history legible — but at
different levels of detail and formality.

---

## Summary

| Mechanism | Scope | Who it protects |
| --------- | ----- | --------------- |
| HCPs | Every consequential AI action | Engineer — ensures AI never takes irreversible action unilaterally |
| CI gates | Every PR | Team — ensures no broken code reaches the main branch |
| Rules-lawyer gate | Game-logic issues | Project — ensures implementation matches the published rules |
| ailog | Every issue implementation | Project history — permanent record of AI planning and human approvals |
| devlog | Every session | Team knowledge — narrative of design decisions over time |
