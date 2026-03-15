---
description: Run the lob-online test suite, summarize results, detect flaky tests, and correlate failures with server logs
allowed-tools: Bash, Read, Glob
---

Run the full test suite. Capture output, summarize results, detect flaky tests, and
correlate any failures with server-side errors.

## Step 1 — Check system state

Check whether the server is up:

```
lsof -ti :3000
```

> **HUMAN CONTROL POINT** — If the server is not running, **stop here** and report:
> "The server is not running on port 3000. Start it first with `/start`, then re-run `/test`."
> Do not start the server automatically.

## Step 2 — Create output directories

```
mkdir -p logs/test test-results
```

## Step 3 — Determine timestamp

```
date +%Y%m%d-%H%M%S
```

Use this value as `TIMESTAMP` in subsequent filenames.

## Step 4 — Run tests, capture verbose output

```
npm test -- --reporter=verbose > logs/test/test-TIMESTAMP.log 2>&1
```

Note the exit code (0 = all passed, non-zero = failures present).

## Step 5 — Run tests again, capture JSON snapshot

```
npm test -- --reporter=json > test-results/test-TIMESTAMP.json 2>&1
```

This snapshot is used for flake detection in future runs.

## Step 6 — Summarize results

Parse `test-results/test-TIMESTAMP.json` and report:

- Total tests / passed / failed / skipped
- Names and file paths of any failing tests

## Step 7 — Flake detection

Find the most recent prior snapshot:

```
ls -t test-results/test-*.json | sed -n '2p'
```

If a prior snapshot exists, compare it against the current one. Flag any test that
changed state (pass → fail or fail → pass) as potentially flaky.

## Step 8 — Error correlation (failures only)

If there are test failures, scan the server log for ERROR-level lines:

```
grep -i "error" logs/server/server.log
```

Present any server errors alongside the names of the failing tests they may be
related to.

## Finishing

Output a concise summary:

1. **Results:** X passed, Y failed, Z skipped
2. **Failures:** list of failing test names with file paths (if any)
3. **Flaky tests:** list of tests that changed state vs. the prior run (if any)
4. **Server errors:** correlated server log lines (if failures exist)

Keep test result snapshots in `test-results/` for future flake tracking. They are
gitignored and accumulate locally.
