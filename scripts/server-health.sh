#!/usr/bin/env bash
# @MOB-173 Server health check with Telegram alerts to the owner. Install on the server:
#   crontab -e  →  */15 * * * * bash ~/RMC/scripts/server-health.sh >> ~/rmc-health.log 2>&1
# Reads ALERT_TELEGRAM_BOT_TOKEN and ALERT_TELEGRAM_CHAT_ID from ~/RMC/.env. Alerts once per problem
# (until it clears), so a long outage does not flood the chat.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

STATE_DIR="${HOME}/.rmc-health"; mkdir -p "$STATE_DIR"
problems=()

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:${BACKEND_PORT:-4000}/api/health || echo 000)"
[ "$code" = 200 ] || problems+=("backend health returned $code")

for c in crm_postgres crm_backend crm_mongo crm_backup; do
  state="$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo missing)"
  [ "$state" = running ] || problems+=("container $c is $state")
done

disk="$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')"
[ "$disk" -lt "${DISK_ALERT_PERCENT:-85}" ] || problems+=("disk ${disk}% full")

mem="$(free -m | awk '/^Mem:/ {print $7}')"
[ "$mem" -gt "${MEM_ALERT_MB:-150}" ] || problems+=("only ${mem} MB memory available")

age_h="$(docker exec crm_backup sh -c 'f=$(ls -1t /backups/*/postgres_*.dump 2>/dev/null | head -1); [ -n "$f" ] && echo $(( ($(date +%s) - $(stat -c %Y "$f")) / 3600 )) || echo none' 2>/dev/null || echo none)"
{ [ "$age_h" != none ] && [ "$age_h" -le 26 ]; } || problems+=("last database backup: ${age_h} hours ago")

send() {
  [ -n "${ALERT_TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${ALERT_TELEGRAM_CHAT_ID:-}" ] || { echo "no Telegram alert settings"; return; }
  curl -s -o /dev/null --max-time 10 "https://api.telegram.org/bot${ALERT_TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${ALERT_TELEGRAM_CHAT_ID}" --data-urlencode "text=$1"
}

now="$(date '+%Y-%m-%d %H:%M')"
if [ ${#problems[@]} -gt 0 ]; then
  summary="$(printf '• %s\n' "${problems[@]}")"
  if [ "$summary" != "$(cat "$STATE_DIR/last" 2>/dev/null)" ]; then
    send "⚠️ RMC server ($now)"$'\n'"$summary"
    printf '%s' "$summary" > "$STATE_DIR/last"
  fi
  echo "$now PROBLEMS: ${problems[*]}"
else
  if [ -s "$STATE_DIR/last" ]; then send "✅ RMC server is healthy again ($now)"; : > "$STATE_DIR/last"; fi
  echo "$now ok (disk ${disk}%, ${mem} MB free, backup ${age_h}h old)"
fi
