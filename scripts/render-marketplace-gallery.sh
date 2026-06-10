#!/usr/bin/env sh
set -eu

PORT="${PORT:-8024}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
SERVER_PID=""
OUTPUT="docs/assets/theme-gallery-2026.png"

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID"
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

find_browser() {
  for browser in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$browser" >/dev/null 2>&1; then
      printf "%s" "$browser"
      return 0
    fi
  done
  return 1
}

BROWSER="$(find_browser)" || {
  printf "error - Chromium or Google Chrome is required to render %s\n" "$OUTPUT" >&2
  exit 1
}

trap cleanup EXIT INT TERM
python3 -m http.server "$PORT" --bind "$HOST" >/tmp/twitch-todo-gallery-server.log 2>&1 &
SERVER_PID="$!"

sleep 1

"$BROWSER" \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --disable-crash-reporter \
  --disable-dev-shm-usage \
  --hide-scrollbars \
  --window-size=1280,920 \
  --screenshot="$OUTPUT" \
  "${BASE_URL}/docs/marketplace-gallery.html"

printf "ok - rendered %s\n" "$OUTPUT"
