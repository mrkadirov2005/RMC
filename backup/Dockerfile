FROM postgres:16-bookworm

ARG MONGO_TOOLS_VERSION=100.13.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates python3 \
  && curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-x86_64-${MONGO_TOOLS_VERSION}.tgz" \
    | tar -xz --strip-components=1 -C /usr/local \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY scripts/backup.sh /app/scripts/backup.sh
COPY scripts/apps_script_sheets_export.py /app/scripts/apps_script_sheets_export.py
COPY backup/entrypoint.sh /app/entrypoint.sh
RUN chmod 755 /app/scripts/backup.sh /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
