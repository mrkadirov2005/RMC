#!/usr/bin/env python3
"""Push CSV table exports into a Google Sheet, one tab per table.

Stdlib only — no pip installs required on the host. Called from backup.sh
after export_postgres_tables() has already written one CSV per table into
the run directory.

Usage:
  GOOGLE_ACCESS_TOKEN=... python3 sheets_export.py <spreadsheet_id> <csv_dir> <table1,table2,...>
"""
import csv
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"


def api_request(token, method, url, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{method} {url} -> {exc.code}: {exc.read().decode('utf-8', 'replace')}") from exc


def get_existing_sheets(token, spreadsheet_id):
    info = api_request(token, "GET", f"{SHEETS_API}/{spreadsheet_id}?fields=sheets.properties")
    return {s["properties"]["title"]: s["properties"]["sheetId"] for s in info.get("sheets", [])}


def ensure_sheet(token, spreadsheet_id, title, existing):
    if title in existing:
        return existing[title]
    result = api_request(
        token,
        "POST",
        f"{SHEETS_API}/{spreadsheet_id}:batchUpdate",
        {"requests": [{"addSheet": {"properties": {"title": title}}}]},
    )
    sheet_id = result["replies"][0]["addSheet"]["properties"]["sheetId"]
    existing[title] = sheet_id
    return sheet_id


def write_table(token, spreadsheet_id, title, sheet_id, rows):
    api_request(
        token,
        "POST",
        f"{SHEETS_API}/{spreadsheet_id}/values/'{title}'!A1:clear",
    )
    if rows:
        api_request(
            token,
            "PUT",
            f"{SHEETS_API}/{spreadsheet_id}/values/'{title}'!A1?valueInputOption=USER_ENTERED",
            {"values": rows},
        )
    api_request(
        token,
        "POST",
        f"{SHEETS_API}/{spreadsheet_id}:batchUpdate",
        {
            "requests": [
                {
                    "repeatCell": {
                        "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {"userEnteredFormat": {"textFormat": {"bold": True}, "backgroundColor": {"red": 0.90, "green": 0.93, "blue": 0.98}}},
                        "fields": "userEnteredFormat(textFormat,backgroundColor)",
                    }
                },
                {
                    "updateSheetProperties": {
                        "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
                        "fields": "gridProperties.frozenRowCount",
                    }
                },
                {
                    "autoResizeDimensions": {
                        "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": max(len(rows[0]) if rows else 1, 1)}
                    }
                },
            ]
        },
    )


def main():
    if len(sys.argv) != 4:
        print("usage: sheets_export.py <spreadsheet_id> <csv_dir> <table1,table2,...>", file=sys.stderr)
        return 2

    import os

    token = os.environ.get("GOOGLE_ACCESS_TOKEN")
    if not token:
        print("GOOGLE_ACCESS_TOKEN is required", file=sys.stderr)
        return 2

    spreadsheet_id, csv_dir, tables_csv = sys.argv[1], sys.argv[2], sys.argv[3]
    tables = [t.strip() for t in tables_csv.split(",") if t.strip()]

    existing = get_existing_sheets(token, spreadsheet_id)
    summary_rows = [["table", "rows", "columns", "exported_at_utc"]]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    for table in tables:
        csv_path = f"{csv_dir}/public_{table}.csv"
        try:
            with open(csv_path, newline="", encoding="utf-8") as fh:
                rows = list(csv.reader(fh))
        except FileNotFoundError:
            print(f"skip {table}: {csv_path} not found", file=sys.stderr)
            continue

        sheet_id = ensure_sheet(token, spreadsheet_id, table, existing)
        write_table(token, spreadsheet_id, table, sheet_id, rows)
        data_rows = max(len(rows) - 1, 0)
        cols = len(rows[0]) if rows else 0
        summary_rows.append([table, str(data_rows), str(cols), now])
        print(f"synced {table}: {data_rows} rows x {cols} cols")

    summary_sheet_id = ensure_sheet(token, spreadsheet_id, "Summary", existing)
    write_table(token, spreadsheet_id, "Summary", summary_sheet_id, summary_rows)
    print("synced Summary")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
