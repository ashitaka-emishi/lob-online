---
description: Start the lob-online server and Vite dev client, logging output to logs/
allowed-tools: Bash
---

Start the lob-online development environment. The server runs on port 3000; the Vite dev
client runs on port 5173.

## Step 1 — Check for running processes

```
lsof -ti :3000
lsof -ti :5173
```

If either port is occupied, invoke the `stop` skill to clean up before continuing.

## Step 2 — Create log directories

```
mkdir -p logs/server logs/client
```

## Step 3 — Start server

```
node server/src/server.js >> logs/server/server.log 2>&1 &
echo "SERVER_PID=$!"
```

Record the PID.

## Step 4 — Start Vite dev client

```
npm run dev -w client >> logs/client/client.log 2>&1 &
echo "CLIENT_PID=$!"
```

Record the PID.

## Step 5 — Persist PIDs

Write both PIDs to `.pids` at the project root so the `stop` skill can find them reliably:

```
echo "SERVER_PID=<server_pid> CLIENT_PID=<client_pid>" > .pids
```

## Step 6 — Confirm both processes are listening

Poll once per second for up to 15 seconds:

```
lsof -ti :3000   # server ready
lsof -ti :5173   # client ready
```

If a port is still not listening after 15 seconds:
1. Kill any processes that did start: `kill <pid>` for each PID recorded above
2. Remove `.pids`: `rm -f .pids`
3. Report failure and show the last 20 lines of the relevant log file:

```
tail -20 logs/server/server.log
tail -20 logs/client/client.log
```

## Finishing

Report confirmed PIDs and ports. Example:

```
Server  PID 12345  → localhost:3000  ✓
Client  PID 12346  → localhost:5173  ✓
```

If either process failed to start, report the error and stop.
