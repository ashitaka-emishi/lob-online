---
description: Full codebase examination for duplicate code, dead code, test coverage gaps, and refactoring opportunities
allowed-tools: Bash, Read, Glob, Grep
---

Perform a full codebase assessment. Run all steps in order and abort on failure at steps 1–2.

## Step 1 — Build

Invoke the `/dev-build` skill (format → lint → build client). If any step fails, report the
failure and stop.

## Step 2 — Test with coverage

```
npm run test:coverage
```

If tests fail, report the failures and stop. Capture the full coverage report for use in
Step 4.

## Step 3 — Create log directory

```
mkdir -p logs/review
```

Determine a timestamp: `date +%Y%m%d-%H%M%S` → TIMESTAMP.
Log all subsequent output to `logs/review/assess-TIMESTAMP.log`.

## Step 4 — Analyse source tree

Examine `server/src/` and `client/src/` for:

- **Duplicate code** — similar functions or logic blocks across multiple files
- **Dead code** — exported symbols with no importers, unreachable execution paths
- **Test coverage gaps** — files or branches below the 70% line coverage threshold
  (use the coverage output from Step 2)
- **Refactoring opportunities** — functions longer than 40 lines, nesting deeper than 3
  levels, repeated patterns that could be extracted into shared utilities
- **Standards inconsistencies** — console prefix violations (server code must use
  `[server]`, `[route]`, `[socket]`, etc.), import order violations
  (builtin → external → internal, blank line between groups)

## Step 5 — Produce prioritised report

Structure findings into three priority tiers:

### Critical

Things that break the build, fail tests, or violate hard coding rules. Must be fixed
before merge.

### Warning

Code smells, coverage gaps, clarity issues. Should be addressed soon.

### Suggestion

Simplification and refactoring opportunities. Low urgency, high value over time.

Each finding must include:

- Severity tier
- Description of the issue
- `file:line` reference
- A suggested fix (one sentence or short code snippet)

## Step 6 — Write summary document

Write the prioritised report to `docs/assess-YYYY-MM-DD.md` (using today's date).
This file is not committed automatically — note its path in the final output so the
user can review and commit it if desired.

## Finishing

Output a one-paragraph executive summary: how many findings at each severity level, the
most important item to address, and the path to the full log and summary document.
