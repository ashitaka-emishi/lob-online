---
description: Run the lob-online test suite, summarize results, detect flaky tests, and correlate failures with server logs
allowed-tools: Bash, Read, Glob
---

Run the full test suite. Capture output, summarize results, detect flaky tests, and
correlate any failures with server-side errors.

Never write to OS temp directories (`/tmp`, `$TMPDIR`, etc.). All output goes under `logs/`
and `test-results/` within the project root.

## Step 1 — Check system state

Check whether the server is up:

```
lsof -ti :3000
```

> **HUMAN CONTROL POINT** — If the server is not running, **stop here** and report:
> "The server is not running on port 3000. Start it first with `/dev-start`, then re-run `/dev-test`."
> Do not start the server automatically.

## Step 2 — Determine date and timestamps, create output directories

```
DATE=$(date +%Y_%m_%d)
TIME=$(date +%H%M%S)
mkdir -p logs/test/$DATE test-results/$DATE
```

All files for this run are written under the date-stamped subdirectory.

## Step 3 — Run tests, capture verbose output

```
npm test -- --reporter=verbose > logs/test/$DATE/test-$TIME.log 2>&1
```

Note the exit code (0 = all passed, non-zero = failures present).

## Step 4 — Run tests again, capture JSON snapshot

```
npm test -- --reporter=json > test-results/$DATE/test-$TIME.json 2>&1
```

This snapshot is used for flake detection in future runs.

## Step 5 — Summarize results

Parse `test-results/$DATE/test-$TIME.json` and report:

- Total tests / passed / failed / skipped
- Names and file paths of any failing tests

## Step 6 — Flake detection

Find the most recent prior snapshot across all date subdirectories:

```
ls -t test-results/*/test-*.json | sed -n '2p'
```

If a prior snapshot exists, compare it against the current one. Flag any test that
changed state (pass → fail or fail → pass) as potentially flaky.

## Step 7 — Error correlation (failures only)

If there are test failures, read the log date from `.pids` if available, then scan the
server log for ERROR-level lines:

```
LOG_DATE=$(grep LOG_DATE .pids 2>/dev/null | cut -d= -f2)
LOG_DATE=${LOG_DATE:-$(date +%Y_%m_%d)}
grep -i "error" logs/server/$LOG_DATE/server.log 2>/dev/null
```

Present any server errors alongside the names of the failing tests they may be related to.

## Finishing

Output a concise summary:

1. **Results:** X passed, Y failed, Z skipped
2. **Log:** `logs/test/$DATE/test-$TIME.log`
3. **Failures:** list of failing test names with file paths (if any)
4. **Flaky tests:** list of tests that changed state vs. the prior run (if any)
5. **Server errors:** correlated server log lines (if failures exist)

Keep test result snapshots in `test-results/` for future flake tracking. They are
gitignored and accumulate locally.
