const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
const SECRET = 'change-this-secret';

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (SECRET && payload.secret !== SECRET) {
      return json({ ok: false, error: 'Invalid secret' });
    }

    const entity = String(payload.entity || '').trim();
    const columns = Array.isArray(payload.columns) ? payload.columns : [];
    if (!entity || columns.length === 0) {
      return json({ ok: false, error: 'entity and columns are required' });
    }

    if (payload.action === 'push') {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      writeSheet(entity, columns, rows);
      return json({ ok: true, rows: rows.length });
    }

    if (payload.action === 'pull') {
      const rows = readSheet(entity, columns);
      return json({ ok: true, rows: rows });
    }

    return json({ ok: false, error: 'Unsupported action' });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function writeSheet(entity, columns, rows) {
  const sheet = getOrCreateSheet(entity);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

  if (rows.length === 0) return;

  const values = rows.map(function(row) {
    return columns.map(function(column) {
      return row && row[column] != null ? row[column] : '';
    });
  });
  sheet.getRange(2, 1, values.length, columns.length).setValues(values);
}

function readSheet(entity, fallbackColumns) {
  const sheet = getOrCreateSheet(entity);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });
  const columns = headers.some(Boolean) ? headers : fallbackColumns;

  return values.slice(1).filter(function(row) {
    return row.some(function(value) {
      return value !== '';
    });
  }).map(function(row) {
    const item = {};
    columns.forEach(function(column, index) {
      item[column] = row[index] == null ? '' : row[index];
    });
    return item;
  });
}

function getOrCreateSheet(name) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
