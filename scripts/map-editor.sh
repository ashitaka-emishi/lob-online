#!/usr/bin/env bash
# Starts server + client dev servers and opens the map editor in the browser.
# Usage: npm run dev:map-editor  (from repo root)

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export MAP_EDITOR_ENABLED=true

cleanup() {
  echo ""
  echo "[map-editor] shutting down..."
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "[map-editor] starting server..."
npm run dev -w server &
SERVER_PID=$!

echo "[map-editor] starting client..."
npm run dev -w client &
CLIENT_PID=$!

# Wait for Vite to be ready (polls port 5173)
echo "[map-editor] waiting for client dev server..."
until curl -sf http://localhost:5173 > /dev/null 2>&1; do
  sleep 0.5
done

echo "[map-editor] opening http://localhost:5173/tools/map-editor"
open "http://localhost:5173/tools/map-editor"

# Keep script alive until Ctrl-C
wait "$SERVER_PID" "$CLIENT_PID"
