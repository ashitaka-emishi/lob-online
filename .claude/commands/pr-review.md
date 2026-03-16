---
description: Review the current PR for coding standards, test coverage, and common defects
allowed-tools: Bash, Read, Glob, Grep
---

Review the current PR. Run all steps in order and abort on failure at steps 1–4 before
proceeding to analysis.

## Step 1 — Verify PR exists

```
gh pr view
```

If no open PR is found for the current branch, report the branch name and stop. Do not
proceed.

## Step 2 — Build

Invoke the `/dev-build` skill (format → lint → build client). If any step fails, report the
failure and stop.

## Step 3 — Test

Invoke the `/dev-test` skill. If any tests fail, report the failures and stop.

## Step 4 — Coverage check

```
npm run test:coverage
```

Capture the output. Flag any file reporting below 70% line coverage. Do not abort — record
coverage gaps and continue to diff analysis.

## Step 5 — Fetch PR diff

```
gh pr diff
```

## Step 6 — Analyse diff

Examine the diff for:

- **Dead code** — unreachable branches, unused exports visible in the diff
- **Duplicate logic** — similar blocks repeated within the diff
- **Null/undefined risks** — missing guards on optional chaining or `Zod.parse` calls
- **Unreferenced variables** — variables not prefixed with `_` that appear unused
- **Undocumented public functions/components** — exported symbols with no JSDoc comment
- **Clarity/simplicity** — overly complex expressions, deep nesting greater than 3 levels

## Step 7 — Log output

```
mkdir -p logs/review
```

Write the full report to `logs/review/review-TIMESTAMP.log` where TIMESTAMP comes from
`date +%Y%m%d-%H%M%S`.

## Step 8 — Report

Output a structured summary:

1. **Build** — pass or fail with details
2. **Tests** — pass or fail with counts (total / passed / failed / skipped)
3. **Coverage gaps** — list of files below 70% with their percentages
4. **Findings** — table or list with columns: severity (`warning` / `error`), description,
   `file:line`

## Step 9 — Post PR comment

```
gh pr comment --body "$(cat logs/review/review-TIMESTAMP.log)"
```

Use the same TIMESTAMP from Step 7.
