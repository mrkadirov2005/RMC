#!/bin/sh
set -eu

child_pids=""

stop_children() {
  trap - TERM INT EXIT
  for child_pid in $child_pids; do
    kill "$child_pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

trap stop_children TERM INT EXIT

if [ "${E2E_LIVE_VIEW_ENABLED:-false}" = "true" ]; then
  display_number="${E2E_DISPLAY:-:99}"
  screen_geometry="${E2E_SCREEN_GEOMETRY:-1440x900x24}"
  export DISPLAY="$display_number"

  Xvfb "$DISPLAY" -screen 0 "$screen_geometry" -ac -nolisten tcp &
  child_pids="$child_pids $!"

  display_ready=0
  attempts=0
  while [ "$attempts" -lt 50 ]; do
    if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
      display_ready=1
      break
    fi
    attempts=$((attempts + 1))
    sleep 0.1
  done
  if [ "$display_ready" -ne 1 ]; then
    echo "[e2e-live-view] Xvfb did not become ready on $DISPLAY." >&2
    exit 1
  fi

  x11vnc -display "$DISPLAY" -forever -shared -rfbport 5900 \
    -localhost -nopw -noxdamage &
  child_pids="$child_pids $!"

  /usr/share/novnc/utils/novnc_proxy --listen 127.0.0.1:6080 --vnc localhost:5900 &
  child_pids="$child_pids $!"
  echo "[e2e-live-view] Internal noVNC bridge is ready for token-protected application proxying."
fi

cd /app/service
npm run db:migrate
node dist/index.js &
backend_pid=$!
child_pids="$child_pids $backend_pid"
wait "$backend_pid"
backend_status=$?
exit "$backend_status"
