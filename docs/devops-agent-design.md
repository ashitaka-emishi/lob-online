# DevOps Agent Design

## Overview

The `devops` Claude Code agent automates the four core development operations for lob-online:
**build**, **start**, **stop**, and **test**. Each operation is implemented as a reusable skill
(`.claude/commands/`) so it can be invoked independently or composed by the agent.

### Guiding Principles

- Frequent operations are managed as named skills so they can be invoked by name or composed
- Every build enforces code formatting and lint before producing artifacts
- `npm run` is used wherever a script exists; raw commands are a fallback only
- Logging is sufficient to diagnose errors but not verbose by default
- Logs and test result artifacts are local-only (gitignored)

---

## Directory Layout

Two new top-level directories hold runtime artifacts. Neither is committed.

```
logs/
  server/        ← server process stdout/stderr  (one file per run, rotating)
  client/        ← Vite dev server output
  test/          ← per-run test output, timestamped
test-results/
  *.json         ← Vitest JSON reporter snapshots; used for flake tracking
```

### .gitignore additions required

`logs/` is already covered. Add one line:

```
# Test result snapshots
test-results/
```

---

## Skills

Skills live in `.claude/commands/`. The agent invokes them by name; they can also be run
directly with `/build`, `/start`, `/stop`, `/test`.

---

### `build` — `.claude/commands/build.md`

**Purpose:** Format, lint, and compile the project. Always runs format and lint; the server
has no compile step (plain ESM JavaScript); the client is built with Vite.

**Steps (stop and report on first failure):**

1. `npm run format` — Prettier rewrites all files in place
2. `npm run lint` — ESLint; fail on any error
3. `npm run build` — Vite builds `client/` into `client/dist/`

**Notes:**

- Format runs before lint so that lint sees clean input
- Server source is validated by lint only; no transpilation needed
- A successful build implies both server and client are deployable

---

### `start` — `.claude/commands/start.md`

**Purpose:** Start the development server and Vite client dev server, capturing output to
log files. Ensures a clean slate before launching.

**Ports:**

- Server: `3000`
- Client (Vite dev): `5173`

**Steps:**

1. Check whether ports 3000 and/or 5173 are already occupied:
   ```
   lsof -ti :3000
   lsof -ti :5173
   ```
2. If any port is occupied → invoke the `stop` skill before continuing
3. Create log directories if absent:
   ```
   mkdir -p logs/server logs/client
   ```
4. Start server in background, redirecting output:
   ```
   node server/src/server.js >> logs/server/server.log 2>&1 &
   ```
   Record the PID.
5. Start Vite dev server in background:
   ```
   npm run dev -w client >> logs/client/client.log 2>&1 &
   ```
   Record the PID.
6. Poll ports until listening or 15 s timeout (1 s intervals):
   ```
   lsof -ti :3000   # server ready
   lsof -ti :5173   # client ready
   ```
7. Report confirmed PIDs and ports, or fail with the last 20 lines of the relevant log file.

---

### `stop` — `.claude/commands/stop.md`

**Purpose:** Gracefully shut down the server and Vite dev server. Fall back to SIGKILL after
a 10-second timeout.

**Steps:**

1. Find PIDs on each port:
   ```
   lsof -ti :3000
   lsof -ti :5173
   ```
2. If no PIDs found on either port → report "nothing running" and exit
3. Send SIGTERM to each PID found
4. Poll every 1 s for up to 10 s waiting for the ports to clear
5. For any PID still alive after 10 s → send SIGKILL
6. Report what was stopped (port, PID, graceful or forced)

---

### `test` — `.claude/commands/test.md`

**Purpose:** Run the full test suite, capture output, summarize results, detect flaky tests,
and correlate failures with server-side errors.

**Steps:**

1. Check whether the system is running (port 3000):
   ```
   lsof -ti :3000
   ```
   If not running → invoke the `start` skill
2. Create log and result directories if absent:
   ```
   mkdir -p logs/test test-results
   ```
3. Determine a timestamp for this run: `date +%Y%m%d-%H%M%S` → `TIMESTAMP`
4. Run tests with verbose output captured to a log file:
   ```
   npm test -- --reporter=verbose > logs/test/test-$TIMESTAMP.log 2>&1
   ```
5. Run tests again with JSON reporter to produce a result snapshot:
   ```
   npm test -- --reporter=json > test-results/test-$TIMESTAMP.json 2>&1
   ```
   _(Two runs are necessary because Vitest does not support multiple reporters in one pass
   without configuration changes. Alternatively, configure `vitest.config.js` to emit both
   reporters simultaneously — defer that to implementation.)_
6. Parse `test-results/test-$TIMESTAMP.json`:
   - Extract total / passed / failed / skipped counts
   - List failing test names and their file paths
7. **Flake detection:** Find the most recent prior snapshot in `test-results/`:
   ```
   ls -t test-results/test-*.json | sed -n '2p'
   ```
   Diff test states: flag any test that changed between pass and fail (either direction)
8. **Error correlation:** If there are failures, scan server logs for ERROR lines:
   ```
   grep -i "error" logs/server/server.log
   ```
   Present any errors alongside the relevant failing test names
9. Report a concise summary:
   - Pass/fail/skip counts
   - List of failures with file:line
   - Flaky tests (if any)
   - Correlated server errors (if any)

---

## Agent Definition

**File:** `.claude/agents/devops.md`

```yaml
name: devops
description: >
  Build, start, stop, and test the lob-online system. Invokes the build, start, stop,
  and test skills. Use when asked to build the project, spin up or shut down the dev
  environment, or run the test suite.
tools: Bash, Read, Glob
```

### Agent Responsibilities

- Sequence skill calls in the correct order (e.g. start before test; stop before restart)
- Always append stdout to the appropriate `logs/` subdirectory — never discard output
- Report a concise one-paragraph summary after each operation
- Never leave orphan processes; confirm ports are clear after any stop operation
- On test failure, always provide error resolution analysis before exiting

---

## npm Scripts Reference

No changes to `package.json` are needed. Existing scripts map directly to skill operations:

| Skill step         | npm script              | Resolves to                              |
| ------------------ | ----------------------- | ---------------------------------------- |
| Format             | `npm run format`        | `prettier --write .`                     |
| Lint               | `npm run lint`          | `eslint .`                               |
| Build client       | `npm run build`         | `npm run build -w client` → `vite build` |
| Run tests          | `npm test`              | `vitest run`                             |
| Start server (dev) | `npm run dev:server`    | `node --watch server/src/server.js`      |
| Start client (dev) | `npm run dev -w client` | `vite`                                   |

The `start` skill uses `node server/src/server.js` directly (no `--watch`) so the background
process is stable; hot-reload is not appropriate for an automated start/test sequence.

---

## Port Reference

| Service         | Port | Config source                                      |
| --------------- | ---- | -------------------------------------------------- |
| Express server  | 3000 | `server/src/server.js`, `.env.example` (PORT)      |
| Vite dev server | 5173 | Vite default; proxied from `client/vite.config.js` |

---

## Implementation Checklist

When implementing from this design, create the following files in order:

- [ ] `.gitignore` — append `test-results/`
- [ ] `.claude/commands/build.md` — build skill
- [ ] `.claude/commands/start.md` — start skill
- [ ] `.claude/commands/stop.md` — stop skill
- [ ] `.claude/commands/test.md` — test skill
- [ ] `.claude/agents/devops.md` — agent definition

No source code changes are required.
