#!/usr/bin/env sh
set -eu

PORT="${PORT:-8014}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
SERVER_PID=""

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

run_page() {
  page_path="$1"
  page_name="$2"
  output="$("$BROWSER" --headless --disable-gpu --no-sandbox --virtual-time-budget=5000 --dump-dom "${BASE_URL}/${page_path}")"
  case "$output" in
    *'<pre id="result">PASS</pre>'*|*'<pre id="result">PASS</pre>'*)
      printf "ok - %s\n" "$page_name"
      ;;
    *)
      printf "%s\n" "$output"
      printf "not ok - %s\n" "$page_name"
      return 1
      ;;
  esac
}

python3 -m json.tool widget.json >/dev/null
printf "ok - widget.json\n"

if ! BROWSER="$(find_browser)"; then
  printf "skip - browser smoke tests require Chromium or Google Chrome\n"
  exit 0
fi

trap cleanup EXIT INT TERM
python3 -m http.server "$PORT" --bind "$HOST" >/tmp/twitch-todo-smoke-server.log 2>&1 &
SERVER_PID="$!"

sleep 1

run_page ".scratch/twitch-todo-widget-market-roadmap/theme-quest-smoke.html" "theme and quest wording"
run_page ".scratch/twitch-todo-widget-market-roadmap/animation-smoke.html" "task animations"
run_page ".scratch/twitch-todo-widget-market-roadmap/layout-smoke.html" "layout modes"
run_page ".scratch/twitch-todo-widget-market-roadmap/custom-image-smoke.html" "custom images"
run_page ".scratch/twitch-todo-widget-market-roadmap/voting-smoke.html" "voting mode"
run_page ".scratch/twitch-todo-widget-market-roadmap/chat-event-smoke.html" "chat event payloads"
run_page ".scratch/twitch-todo-widget-market-roadmap/preview-smoke.html" "local preview controls and commands"

printf "ok - smoke test suite\n"
