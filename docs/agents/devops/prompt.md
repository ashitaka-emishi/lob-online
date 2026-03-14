# DevOps Agent — Design Prompt

## Purpose

Build, start, stop, and test the lob-online system. Each operation is managed as a reusable
skill so it can be invoked independently or composed by the agent.

## Responsibilities

- **Build** — format code with Prettier, lint with ESLint, and compile the client with Vite
- **Start** — verify nothing is already running, then launch the server and Vite dev client;
  record stdout to log files for error analysis
- **Stop** — gracefully stop the client dev server and Express server; fall back to SIGKILL
  after a 10-second timeout
- **Test** — ensure the system is running; execute server and client tests; summarize results;
  track flaky tests; provide error-resolution analysis from test and server logs; keep a local
  copy of test results

## Tools

- **Bash** — run npm scripts and shell commands
- **Read** — inspect log files and source files
- **Glob** — locate files by pattern

## Skills / Operations

### `/build`

- Run `npm run format` (Prettier rewrites files in place)
- Run `npm run lint` (ESLint; fail on any error)
- Run `npm run build` (Vite builds `client/` into `client/dist/`)
- Stop and report on first failure

### `/start`

- Check whether ports 3000 and 5173 are occupied; invoke `/stop` if so
- Create `logs/server/` and `logs/client/` if absent
- Start server in background, redirect stdout to `logs/server/server.log`
- Start Vite dev server in background, redirect stdout to `logs/client/client.log`
- Poll ports until listening or 15-second timeout; report PIDs or fail with log tail

### `/stop`

- Find PIDs on ports 3000 and 5173; report "nothing running" if both clear
- Send SIGTERM; poll every 1 s for up to 10 s
- Send SIGKILL to any PID still alive after 10 s
- Report what was stopped (port, PID, graceful or forced)

### `/test`

- Ensure system is running on port 3000; invoke `/start` if not
- Create `logs/test/` and `test-results/` if absent
- Run tests with verbose output, captured to a timestamped log file
- Run tests again with JSON reporter; save snapshot to `test-results/`
- Parse results: extract pass/fail/skip counts and list failing test names
- Detect flaky tests by diffing against the most recent prior snapshot
- Correlate failures with server-log ERROR lines
- Report a concise summary: counts, failures with file:line, flakes, correlated errors

## Guiding Principles

- **Skills-first** — frequent tasks are managed as named skills
- **Clean code** — every build enforces formatting and lint
- **npm run** — use `npm run` wherever a script exists; raw commands are a fallback only
- **Sufficient logging** — log enough to diagnose errors; not verbose by default
- **Local artifacts** — logs and test results are gitignored; never committed
