# Code Review Agent Design

## Overview

The `code-review` Claude Code agent performs quality-gate reviews for lob-online. It operates
in two modes: **review** (narrow PR diff inspection) and **assess** (broad full-codebase
examination). Each mode is implemented as a reusable skill so it can be invoked independently
or composed by the agent.

### Guiding Principles

- Frequent tasks managed as named skills (`/review`, `/assess`) so they can be invoked by name
- Build and tests must pass before any review analysis runs — no point analysing broken code
- `npm run` is used wherever a script exists; raw commands are a fallback only
- Logs kept in `logs/review/` (gitignored); one file per run, timestamped
- Reports link findings to `file:line` for direct navigation
- The agent never modifies source files — it only reports findings

---

## Directory Layout

One new subdirectory holds review artifacts. It is not committed.

```
logs/
  review/    ← review and assess output, one file per run, timestamped
```

`logs/` is already covered by `.gitignore`; no new additions needed.

---

## Skills

Skills live in `.claude/commands/`. The agent invokes them by name; they can also be run
directly with `/review` and `/assess`.

---

### `review` — `.claude/commands/review.md`

**Purpose:** Inspect the current PR diff for coding standards compliance, test coverage gaps,
and common defects. Intended to run immediately after a PR is created.

**Steps (abort on first failure in steps 1–4):**

1. Verify a PR exists for the current branch:
   ```
   gh pr view
   ```
   Abort with an explanatory message if no open PR is found.
2. Run `/build` (format → lint → build); abort if it fails.
3. Run `/test`; abort if any tests fail.
4. Check coverage:
   ```
   npm run test:coverage
   ```
   Flag any file reporting below 70% line coverage.
5. Fetch the PR diff:
   ```
   gh pr diff
   ```
6. Analyse the diff for:
   - **Dead code** — unreachable branches, unused exports visible in the diff
   - **Duplicate logic** — similar blocks repeated within the diff
   - **Null/undefined risks** — missing guards on optional chaining or `Zod.parse` calls
   - **Unreferenced variables** — variables not prefixed with `_` that appear unused
   - **Undocumented public functions/components** — exported symbols with no JSDoc
   - **Clarity/simplicity** — overly complex expressions, deep nesting (> 3 levels)
7. Log full output to:
   ```
   logs/review/review-TIMESTAMP.log
   ```
8. Report a structured summary:
   - Build status (pass / fail with details)
   - Test status (pass / fail with counts)
   - Coverage gaps (file paths and percentages below threshold)
   - Finding list: each entry has severity (`warning` / `error`), description, and `file:line`

**After completing:** Post findings as a PR comment:

```
gh pr comment --body "$(cat logs/review/review-TIMESTAMP.log)"
```

---

### `assess` — `.claude/commands/assess.md`

**Purpose:** Examine the entire source tree for systemic quality issues. Intended for
periodic audits or before major refactors.

**Steps (abort on failure in steps 1–2):**

1. Run `/build`; abort if it fails.
2. Run `/test` with coverage:
   ```
   npm run test:coverage
   ```
   Abort if tests fail; capture the coverage report.
3. Log results to:
   ```
   logs/review/assess-TIMESTAMP.log
   ```
4. Analyse the full source tree (`server/src/`, `client/src/`) for:
   - **Duplicate code** — similar functions or blocks across multiple files
   - **Dead code** — exported symbols with no importers, unreachable execution paths
   - **Test coverage gaps** — files or branches below the 70% threshold
   - **Refactoring opportunities** — long functions (> 40 lines), deep nesting, repeated patterns
   - **Standards inconsistencies** — console prefix convention violations (`[server]`, `[route]`,
     etc.), incorrect import order (builtin → external → internal)
5. Produce a prioritised report:
   - **Critical** — things that break the build, fail tests, or violate hard coding rules
   - **Warning** — code smells, coverage gaps, clarity issues
   - **Suggestion** — simplification and refactoring opportunities
     Each finding includes: severity, description, `file:line`, and a suggested fix.
6. Write a summary to `docs/assess-YYYY-MM-DD.md` (not committed automatically).

---

## Agent Definition

**File:** `.claude/agents/code-review.md`

```yaml
name: code-review
description: >
  Review code quality for lob-online. Runs /review to inspect the current PR after it is
  created, or /assess for a full codebase examination. Use when asked to review a PR,
  check code quality, find dead or duplicate code, or assess test coverage.
tools: Bash, Read, Glob, Grep
```

### Agent Responsibilities

- Sequence skill calls correctly: always build first, then test, then analyse
- Never modify source files — only report findings
- After `/review`, post findings as a PR comment via `gh pr comment`
- After `/assess`, write a summary to `docs/assess-YYYY-MM-DD.md`
- On every run, append full output to the appropriate `logs/review/` file

---

## npm Scripts Reference

No changes to `package.json` are needed. Existing scripts map directly to skill steps:

| Skill step      | npm script              | Resolves to               |
| --------------- | ----------------------- | ------------------------- |
| Format          | `npm run format`        | `prettier --write .`      |
| Lint            | `npm run lint`          | `eslint .`                |
| Build client    | `npm run build`         | `npm run build -w client` |
| Run tests       | `npm test`              | `vitest run`              |
| Coverage report | `npm run test:coverage` | `vitest run --coverage`   |

---

## Implementation Checklist

When implementing from this design, create the following files in order:

- [ ] `docs/code-review-agent-design.md` — this design document
- [ ] `.claude/commands/review.md` — PR review skill
- [ ] `.claude/commands/assess.md` — codebase assessment skill
- [ ] `.claude/agents/code-review.md` — agent definition
- [ ] `CLAUDE.md` — add `code-review` agent to Developer Tools section

No source code changes are required.
