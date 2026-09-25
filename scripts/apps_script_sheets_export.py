#!/usr/bin/env python3
"""Push backup CSV exports to the configured Google Apps Script endpoint."""

import csv
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

SENSITIVE_TABLES = {"superusers", "owners", "teacher_payment_credentials"}
SENSITIVE_COLUMNS = ("password", "secret", "token", "credential", "private_key", "api_key", "hash")


def post_json(url, payload):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "text/plain;charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            if not response.status or response.status < 200 or response.status >= 300:
                raise RuntimeError(f"Apps Script returned HTTP {response.status}: {raw}")
            if data.get("ok") is False or data.get("error"):
                raise RuntimeError(data.get("error") or raw)
            return data
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"Apps Script returned HTTP {error.code}: {detail}") from error


def main():
    if len(sys.argv) != 3:
        print("usage: apps_script_sheets_export.py <csv_dir> <table1,table2,...>", file=sys.stderr)
        return 2

    url = os.environ.get("GOOGLE_APPS_SCRIPT_URL") or os.environ.get("APPS_SCRIPT_URL")
    if not url:
        print("GOOGLE_APPS_SCRIPT_URL or APPS_SCRIPT_URL is required", file=sys.stderr)
        return 2

    csv_dir, tables_csv = sys.argv[1], sys.argv[2]
    exported_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    requested_tables = [table.strip() for table in tables_csv.split(",") if table.strip()]
    available_tables = sorted(
        filename[len("public_"):-len(".csv")]
        for filename in os.listdir(csv_dir)
        if filename.startswith("public_") and filename.endswith(".csv")
    )
    tables = available_tables if not requested_tables or requested_tables == ["all"] else requested_tables
    total_rows = 0

    for table in tables:
        if table in SENSITIVE_TABLES:
            print(f"skip {table}: security-sensitive table", file=sys.stderr)
            continue
        csv_path = os.path.join(csv_dir, f"public_{table}.csv")
        try:
            with open(csv_path, newline="", encoding="utf-8") as handle:
                rows = list(csv.reader(handle))
        except FileNotFoundError:
            print(f"skip {table}: {csv_path} not found", file=sys.stderr)
            continue

        if not rows:
            columns, data_rows = [], []
        else:
            sensitive_indexes = {
                index for index, column in enumerate(rows[0])
                if any(marker in column.lower() for marker in SENSITIVE_COLUMNS)
            }
            columns = [column for index, column in enumerate(rows[0]) if index not in sensitive_indexes]
            data_rows = [
                [value for index, value in enumerate(row) if index not in sensitive_indexes]
                for row in rows[1:]
            ]
        sanitized_rows = [columns, *data_rows] if rows else []

        post_json(
            url,
            {
                "action": "push",
                "entity": table,
                "columns": columns,
                "rows": data_rows,
                "csv": "".join(
                    ",".join('"' + value.replace('"', '""') + '"' for value in row)
                    + "\n"
                    for row in sanitized_rows
                ),
                "backup": True,
                "exported_at_utc": exported_at,
            },
        )
        total_rows += len(data_rows)
        print(f"synced {table}: {len(data_rows)} rows x {len(columns)} cols")

    print(f"Google Apps Script backup export completed: {total_rows} rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
