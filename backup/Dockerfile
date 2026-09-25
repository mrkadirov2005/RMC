FROM mongo:7

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates python3 gnupg \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/backup.sh /app/scripts/backup.sh
COPY scripts/apps_script_sheets_export.py /app/scripts/apps_script_sheets_export.py
COPY backup/entrypoint.sh /app/entrypoint.sh
RUN chmod 755 /app/scripts/backup.sh /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
