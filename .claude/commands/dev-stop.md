---
description: Stop the lob-online server and Vite dev client
allowed-tools: Bash
---

Stop any running lob-online processes on ports 3000 (server) and 5173 (Vite client).

## Step 1 — Collect PIDs

Check two sources and union the results:

**a) PIDs from the `.pids` file** (written by the `dev-start` skill):

```
cat .pids 2>/dev/null
```

**b) PIDs from port scanning:**

```
lsof -ti :3000
lsof -ti :5173
```

Combine all unique PIDs found. If no PIDs are found from either source, report "nothing running",
remove `.pids` if it exists (`rm -f .pids`), and exit.

## Step 2 — Send SIGTERM

Send SIGTERM to each PID found:

```
kill <PID>
```

## Step 3 — Wait for graceful shutdown

Poll every 1 second for up to 10 seconds:

```
lsof -ti :3000
lsof -ti :5173
```

Continue polling until both ports are clear or the timeout expires.

## Step 4 — Force kill if necessary

For any process still alive after 10 seconds, send SIGKILL:

```
kill -9 <PID>
```

## Step 5 — Clean up PID file

Remove `.pids` regardless of whether processes were found:

```
rm -f .pids
```

## Finishing

Report what was stopped for each port:

```
Port 3000  PID 12345  stopped (graceful)
Port 5173  PID 12346  stopped (forced after 10s)
```

Or report "nothing running" if no processes were found.
