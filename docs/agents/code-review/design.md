# Code Review Agent Design

## 1. Overview

The `code-review` Claude Code agent performs quality-gate reviews for lob-online. It operates
in two modes: **review** (narrow PR diff inspection) and **assess** (broad full-codebase
examination). Each mode is implemented as a reusable skill so it can be invoked independently
or composed by the agent.

### Guiding Principles

- **Skills-first** — frequent tasks are managed as named skills (`/pr-review`, `/code-assess`)
- **Build-then-test-then-analyse** — build and tests must pass before any review analysis runs;
  no point analysing broken code
- **npm run** — used wherever a script exists; raw commands are a fallback only
- **Local logs** — output goes to `logs/review/` (gitignored); one file per run, timestamped
- **Report only** — the agent never modifies source files; it only reports findings
- **Link findings** — every finding includes a `file:line` reference for direct navigation

---

## 2. Directory Layout

One subdirectory holds review artifacts. It is not committed.

```
logs/
  review/    ← review and assess output, one file per run, timestamped
```

`logs/` is already covered by `.gitignore`; no new additions needed.

---

## 3. Skills

### `pr-review` — `.claude/commands/pr-review.md`

**Purpose:** Inspect the current PR diff for coding standards compliance, test coverage gaps,
and common defects. Intended to run immediately after a PR is created.

**Steps (abort on first failure in steps 1–4):**

1. Verify a PR exists for the current branch: `gh pr view`; abort if no open PR found
2. Run `/dev-build` (format → lint → build); abort if it fails
3. Run `/dev-test`; abort if any tests fail
4. Check coverage: `npm run test:coverage`; flag files below 70% line coverage
5. Fetch the PR diff: `gh pr diff`
6. Analyse the diff for:
   - **Dead code** — unreachable branches, unused exports visible in the diff
   - **Duplicate logic** — similar blocks repeated within the diff
   - **Null/undefined risks** — missing guards on optional chaining or `Zod.parse` calls
   - **Unreferenced variables** — unused variables not prefixed with `_`
   - **Undocumented public functions/components** — exported symbols with no JSDoc
   - **Clarity/simplicity** — overly complex expressions, deep nesting (> 3 levels)
7. Log full output to `logs/review/review-TIMESTAMP.log`
8. Report a structured summary: build status, test status, coverage gaps, findings with severity/location
9. Post findings as a PR comment: `gh pr comment --body "$(cat logs/review/review-TIMESTAMP.log)"`

### `code-assess` — `.claude/commands/code-assess.md`

**Purpose:** Examine the entire source tree for systemic quality issues. Intended for
periodic audits or before major refactors.

**Steps (abort on failure in steps 1–2):**

1. Run `/dev-build`; abort if it fails
2. Run `/dev-test` with coverage: `npm run test:coverage`; abort if tests fail; capture the report
3. Log results to `logs/review/assess-TIMESTAMP.log`
4. Analyse the full source tree (`server/src/`, `client/src/`) for:
   - **Duplicate code** — similar functions or blocks across multiple files
   - **Dead code** — exported symbols with no importers, unreachable execution paths
   - **Test coverage gaps** — files or branches below 70% threshold
   - **Refactoring opportunities** — functions > 40 lines, deep nesting, repeated patterns
   - **Standards inconsistencies** — console prefix violations, incorrect import order
5. Produce a prioritised report:
   - **Critical** — breaks the build, fails tests, or violates hard coding rules
   - **Warning** — code smells, coverage gaps, clarity issues
   - **Suggestion** — simplification and refactoring opportunities
     Each finding includes: severity, description, `file:line`, and a suggested fix
6. Write a summary to `docs/assess-YYYY-MM-DD.md` (not committed automatically)

---

## 4. Agent Definition

**File:** `.claude/agents/code-review.md`

```yaml
---
name: code-review
description: >
  Review code quality for lob-online. Runs /pr-review to inspect the current PR after it is
  created, or /code-assess for a full codebase examination. Use when asked to review a PR,
  check code quality, find dead or duplicate code, or assess test coverage.
tools: Bash, Read, Glob, Grep
---
```

### Agent Responsibilities

- Sequence skill calls correctly: always build first, then test, then analyse
- Never modify source files — only report findings
- After `/pr-review`, post findings as a PR comment via `gh pr comment`
- After `/code-assess`, write a summary to `docs/assess-YYYY-MM-DD.md`
- On every run, append full output to the appropriate `logs/review/` file

### What the Agent Does NOT Do

- Modify source files — report only, never edit
- Commit or push changes
- Override the `rules-lawyer`'s rulings on game mechanics
- Run the dev server — that is the `devops` agent's domain

### Key Files

- `docs/agents/code-review/design.md` — full design spec for this agent
- `CLAUDE.md` — coding standards this agent enforces
- `.claude/commands/pr-review.md` — PR review skill
- `.claude/commands/code-assess.md` — codebase assessment skill

---

## 5. Implementation Checklist

- [x] `.claude/commands/pr-review.md` — PR review skill
- [x] `.claude/commands/code-assess.md` — codebase assessment skill
- [x] `.claude/agents/code-review.md` — agent definition
- [x] `docs/agents/code-review/prompt.md`
- [x] `docs/agents/code-review/design.md`
- [x] `CLAUDE.md` updated
