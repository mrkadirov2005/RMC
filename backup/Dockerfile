FROM mongo:7

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/backup.sh /app/scripts/backup.sh
RUN chmod 755 /app/scripts/backup.sh

CMD ["sh", "-c", "export TZ=\"${BACKUP_TIMEZONE:-UTC}\"; while :; do now=$(date +%s); target=$(date -d 'today 03:00' +%s); if [ \"$target\" -le \"$now\" ]; then target=$(date -d 'tomorrow 03:00' +%s); fi; delay=$((target - now)); echo \"Next RMC backup in ${delay}s\"; sleep \"$delay\"; /bin/sh /app/scripts/backup.sh; done"]
