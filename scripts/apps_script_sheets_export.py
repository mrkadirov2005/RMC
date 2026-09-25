#!/usr/bin/env python3
"""Push backup CSV exports to the configured Google Apps Script endpoint."""

import csv
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


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
    tables = [table.strip() for table in tables_csv.split(",") if table.strip()]
    total_rows = 0

    for table in tables:
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
            columns, data_rows = rows[0], rows[1:]

        post_json(
            url,
            {
                "action": "push",
                "entity": table,
                "columns": columns,
                "rows": rows,
                "csv": "".join(
                    ",".join('"' + value.replace('"', '""') + '"' for value in row) + "\n"
                    for row in rows
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
