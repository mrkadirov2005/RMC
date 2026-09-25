FROM mongo:7

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/backup.sh /app/scripts/backup.sh
COPY backup/entrypoint.sh /app/entrypoint.sh
RUN chmod 755 /app/scripts/backup.sh /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
