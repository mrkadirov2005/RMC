/**
 * RMC Google Apps Script integration.
 *
 * Paste this file into script.google.com, deploy it as a Web app, and put the
 * deployment URL in service/.env as GOOGLE_APPS_SCRIPT_URL.
 *
 * The script uses the spreadsheet attached to this Apps Script project.
 * Supported actions:
 *   - push: replace one sheet tab with the supplied rows
 *   - pull: return the selected sheet tab as columns and rows
 */

const MAX_SHEET_TITLE_LENGTH = 100;

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const action = String(payload.action || '').toLowerCase();
    const entity = normalizeSheetTitle(payload.entity || '');

    if (!entity) {
      return jsonResponse({ ok: false, error: 'entity is required' });
    }
    if (action !== 'push' && action !== 'pull') {
      return jsonResponse({ ok: false, error: 'action must be push or pull' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (action === 'push') {
        return jsonResponse(pushSheet(payload, entity));
      }
      return jsonResponse(pullSheet(entity));
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function pushSheet(payload, entity) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, entity);
  const rows = normalizeRows(payload);

  sheet.clear();
  if (rows.length > 0 && rows[0].length > 0) {
    const width = rows.reduce(function (maximum, row) {
      return Math.max(maximum, row.length);
    }, 0);
    const rectangularRows = rows.map(function (row) {
      return row.concat(new Array(width - row.length).fill(''));
    });
    sheet.getRange(1, 1, rectangularRows.length, width).setValues(rectangularRows);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, width)
      .setFontWeight('bold')
      .setBackground('#e6eef9');
    sheet.autoResizeColumns(1, width);
  }

  return {
    ok: true,
    action: 'push',
    entity: entity,
    rows: Math.max(rows.length - 1, 0),
    columns: rows.length ? rows[0].length : 0,
    backup: payload.backup === true,
    exported_at_utc: payload.exported_at_utc || null,
  };
}

function pullSheet(entity) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(entity);
  if (!sheet) {
    return {
      ok: true,
      action: 'pull',
      entity: entity,
      columns: [],
      rows: [],
      csv: '',
    };
  }

  const values = sheet.getDataRange().getDisplayValues();
  const rows = values.length ? values.slice(1) : [];
  return {
    ok: true,
    action: 'pull',
    entity: entity,
    columns: values.length ? values[0] : [],
    rows: rows,
    csv: values.map(csvRow).join('\n'),
  };
}

function normalizeRows(payload) {
  if (Array.isArray(payload.rows)) {
    const columns = Array.isArray(payload.columns) ? [payload.columns] : [];
    return columns.concat(payload.rows).map(function (row) {
      return Array.isArray(row) ? row.map(stringValue) : [];
    });
  }

  if (typeof payload.csv === 'string' && payload.csv.trim()) {
    return Utilities.parseCsv(payload.csv).map(function (row) {
      return row.map(stringValue);
    });
  }

  return [];
}

function getOrCreateSheet(spreadsheet, title) {
  return spreadsheet.getSheetByName(title) || spreadsheet.insertSheet(title);
}

function normalizeSheetTitle(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/?*[\]:]/g, '-')
    .slice(0, MAX_SHEET_TITLE_LENGTH);
}

function stringValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function csvRow(row) {
  return row.map(function (value) {
    const text = stringValue(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }).join(',');
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
