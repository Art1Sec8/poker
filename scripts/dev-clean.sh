#!/usr/bin/env bash
#
# Reliable, self-healing dev start for the custom socket.io server.
#
# The Next.js dev (.next) build corrupts intermittently in this environment,
# leaving the server alive but serving 500s (missing routes-manifest.json /
# _document.js). This script:
#   1. frees the port + wipes the stale cache,
#   2. starts the server and warms each page ONE AT A TIME
#      (concurrent first-compiles are what trigger the corruption),
#   3. runs a watchdog that auto-recovers if a page starts 500-ing.
#
#   npm run dev:clean            # healthy server + auto-recovery; Ctrl-C stops
#   WATCH=0 npm run dev:clean    # no watchdog (plain clean start)
#
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
WATCH="${WATCH:-1}"
SERVER_PID=""

free_port() {
  pkill -f "tsx server.ts" 2>/dev/null
  lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null
}

cleanup() {
  echo
  echo "→ Stopping server…"
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  free_port
  exit 0
}
trap cleanup INT TERM

start_server() {
  echo "→ Freeing port $PORT and clearing .next…"
  free_port
  sleep 1
  rm -rf .next

  echo "→ Starting socket.io dev server…"
  npm run dev:server > /tmp/poker-dev.log 2>&1 &
  SERVER_PID=$!

  echo "→ Waiting for the server to come up…"
  for _ in $(seq 1 45); do
    curl -s -o /dev/null "http://localhost:$PORT/" 2>/dev/null && break
    sleep 1
  done

  echo "→ Warming pages sequentially…"
  for p in / /play /ranges /quiz /multiplayer /equity /history; do
    for _ in $(seq 1 30); do
      code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$p" 2>/dev/null)
      if [ "$code" = "200" ]; then printf '   %-13s ✓\n' "$p"; break; fi
      sleep 1.2
    done
  done
}

start_server

LAN=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "<lan-ip>")
echo
echo "✅ Ready"
echo "   This Mac : http://localhost:$PORT"
echo "   Phone    : http://$LAN:$PORT   (same Wi-Fi)"
echo "   Ctrl-C to stop."
echo

if [ "$WATCH" != "1" ]; then
  wait "$SERVER_PID"
  exit 0
fi

echo "🩺 Watchdog on — auto-recovers if the dev cache corrupts (WATCH=0 to disable)."
while true; do
  sleep 20
  # Server process gone? Recover.
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "⚠  Server process died — recovering…"
    start_server
    continue
  fi
  # Page 500s (corruption)? Confirm once, then recover.
  code=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://localhost:$PORT/play" 2>/dev/null)
  if [ "$code" = "500" ]; then
    sleep 2
    code2=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://localhost:$PORT/play" 2>/dev/null)
    if [ "$code2" = "500" ]; then
      echo "⚠  Dev cache corrupted (500) — auto-recovering…"
      start_server
      echo "   …recovered."
    fi
  fi
done
