# DevOps Agent Design

## 1. Overview

The `devops` Claude Code agent automates the four core development operations for lob-online:
**build**, **start**, **stop**, and **test**. Each operation is implemented as a reusable skill
(`.claude/commands/`) so it can be invoked independently or composed by the agent.

### Guiding Principles

- **Skills-first** — frequent operations are managed as named skills so they can be invoked by
  name or composed
- **Clean code** — every build enforces code formatting and lint before producing artifacts
- **npm run** — used wherever a script exists; raw commands are a fallback only
- **Sufficient logging** — enough to diagnose errors, but not verbose by default
- **Local artifacts** — logs and test result artifacts are gitignored and never committed

---

## 2. Directory Layout

Two top-level directories hold runtime artifacts. Neither is committed.

```
logs/
  server/
    YYYY_MM_DD/   ← server stdout/stderr, one file per day (server.log)
  client/
    YYYY_MM_DD/   ← Vite dev server output, one file per day (client.log)
  test/
    YYYY_MM_DD/   ← per-run test output (test-HHMMSS.log, one per invocation)
test-results/
  YYYY_MM_DD/     ← Vitest JSON reporter snapshots (test-HHMMSS.json)
```

**Rules:**
- All output is written under `logs/` or `test-results/` within the project root.
- Never write to OS temp directories (`/tmp`, `$TMPDIR`, etc.).
- The date segment (`YYYY_MM_DD`) is derived at skill invocation time: `date +%Y_%m_%d`.
- The `.pids` file at the project root also stores `LOG_DATE` so that the `test` skill can
  find the matching server log even when run in a later shell session.

### .gitignore additions required

`logs/` is already covered. Add one line:

```
# Test result snapshots
test-results/
```

---

## 3. Skills

Skills live in `.claude/commands/`. The agent invokes them by name; they can also be run
directly with `/build`, `/start`, `/stop`, `/test`.

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

### `start` — `.claude/commands/start.md`

**Purpose:** Start the development server and Vite client dev server, capturing output to
log files. Ensures a clean slate before launching.

**Ports:**

- Server: `3000`
- Client (Vite dev): `5173`

**Steps:**

1. Check whether ports 3000 and/or 5173 are already occupied: `lsof -ti :3000`, `lsof -ti :5173`
2. If any port is occupied → invoke the `stop` skill before continuing
3. Create log directories if absent: `mkdir -p logs/server logs/client`
4. Start server in background, redirecting output:
   `node server/src/server.js >> logs/server/server.log 2>&1 &`
5. Start Vite dev server in background:
   `npm run dev -w client >> logs/client/client.log 2>&1 &`
6. **Write both PIDs to `.pids`** at the project root for reliable cleanup:
   `echo "SERVER_PID=<pid> CLIENT_PID=<pid>" > .pids`
7. Poll ports until listening or 15 s timeout (1 s intervals)
8. On timeout failure: kill any already-started processes, remove `.pids`, report error with last
   20 lines of the relevant log file

### `stop` — `.claude/commands/stop.md`

**Purpose:** Gracefully shut down the server and Vite dev server. Fall back to SIGKILL after
a 10-second timeout.

**Steps:**

1. Collect PIDs from two sources (union): read `.pids` if it exists; scan `lsof -ti :3000` and
   `lsof -ti :5173`
2. If no PIDs found from either source → report "nothing running", remove `.pids`, and exit
3. Send SIGTERM to each PID found
4. Poll every 1 s for up to 10 s waiting for the ports to clear
5. For any PID still alive after 10 s → send SIGKILL
6. Remove `.pids`: `rm -f .pids`
7. Report what was stopped (port, PID, graceful or forced)

### `test` — `.claude/commands/test.md`

**Purpose:** Run the full test suite, capture output, summarize results, detect flaky tests,
and correlate failures with server-side errors.

**Steps:**

1. Check whether the system is running on port 3000. **HUMAN CONTROL POINT:** if not running,
   stop and ask the user to run `/start` first — do not start automatically
2. Create log and result directories if absent: `mkdir -p logs/test test-results`
3. Determine a timestamp: `date +%Y%m%d-%H%M%S` → `TIMESTAMP`
4. Run tests with verbose output: `npm test -- --reporter=verbose > logs/test/test-$TIMESTAMP.log 2>&1`
5. Run tests again with JSON reporter: `npm test -- --reporter=json > test-results/test-$TIMESTAMP.json 2>&1`
6. Parse `test-results/test-$TIMESTAMP.json`: extract counts, list failing test names and paths
7. **Flake detection:** diff test states against the most recent prior snapshot; flag any test
   that changed between pass and fail (either direction)
8. **Error correlation:** if failures exist, scan server logs: `grep -i "error" logs/server/server.log`
9. Report: pass/fail/skip counts, failures with file:line, flaky tests, correlated server errors

---

## 4. Agent Definition

**File:** `.claude/agents/devops.md`

```yaml
---
name: devops
description: Build, start, stop, and test the lob-online system. Invokes the build, start, stop, and test skills. Use when asked to build the project, spin up or shut down the dev environment, or run the test suite.
tools: Bash, Read, Glob
---
```

### Agent Responsibilities

- Sequence skill calls in the correct order (e.g. start before test; stop before restart)
- Always append stdout to the appropriate `logs/` subdirectory — never discard output
- Report a concise one-paragraph summary after each operation
- Never leave orphan processes; confirm ports are clear after any stop operation
- On test failure, always provide error resolution analysis before exiting

### What the Agent Does NOT Do

- Modify source files — that is the coding agent's domain
- Review code quality — use the `code-review` agent for that
- Manage GitHub issues or PRs — use the `project-manager` agent for that

### Key Files

- `server/src/server.js` — Express server entry point (port 3000)
- `client/` — Vite client (dev server port 5173)
- `docs/agents/devops/design.md` — full design spec for this agent
- `.claude/commands/build.md` — build skill
- `.claude/commands/start.md` — start skill
- `.claude/commands/stop.md` — stop skill
- `.claude/commands/test.md` — test skill

---

## 5. Implementation Checklist

- [x] `.gitignore` — `test-results/` appended
- [x] `.claude/commands/build.md` — build skill
- [x] `.claude/commands/start.md` — start skill
- [x] `.claude/commands/stop.md` — stop skill
- [x] `.claude/commands/test.md` — test skill
- [x] `.claude/agents/devops.md` — agent definition
- [x] `docs/agents/devops/prompt.md`
- [x] `docs/agents/devops/design.md`
- [x] `CLAUDE.md` updated
