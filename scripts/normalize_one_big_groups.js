const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BATCHING_DIR = path.join(ROOT, 'docs', 'batching');
const OUT_DIR = path.join(BATCHING_DIR, 'normalized_one_big_groups');

const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  row.push(field.trim());
  rows.push(row);
  return rows;
};

const escapeCsv = (value) => {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const writeCsv = (filePath, rows, columns) => {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\r\n')}\r\n`);
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && /^ONE BIG GROUP - .+\.csv$/i.test(entry.name)) return [full];
    return [];
  });

const markerIndex = (row) => {
  for (let index = 0; index < Math.min(row.length, 3); index += 1) {
    const marker = compact(row[index]).toLowerCase().replace(/\s+/g, '');
    if (['t/r', 'n/r', 't/r.', 'n/r.'].includes(marker)) return index;
  }
  return -1;
};

const slug = (value) => {
  const base = compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['ʻ`’]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'ITEM';
};

const usernameBase = (value) =>
  compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') || 'user';

const createUsername = (firstName, usedNames) => {
  const base = usernameBase(firstName);
  let username = base;
  let suffix = 2;
  while (usedNames.has(username)) {
    username = `${base}${suffix}`;
    suffix += 1;
  }
  usedNames.add(username);
  return username;
};

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return digits.length >= 7 ? `+${digits}` : '';
};

const teacherNameFromPath = (filePath) => {
  const sourceFile = fs
    .readdirSync(path.dirname(filePath))
    .find((name) => /^TEMURBEK SCHOOL - .+\.csv$/i.test(name));
  const fallback = path.basename(path.dirname(filePath));
  return compact(
    path
      .basename(sourceFile || fallback, path.extname(sourceFile || fallback))
      .replace(/^TEMURBEK SCHOOL\s*-\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\b20\d{2}\b/g, '')
      .replace(/\d+(?:[.,]\d+)?\s*%/g, '')
      .replace(/%/g, '')
      .replace(/\bnew\b/gi, '')
  );
};

const classNameFromFile = (filePath) =>
  compact(path.basename(filePath, '.csv').replace(/^ONE BIG GROUP\s*-\s*/i, '').replace(/-/g, ':'));

const cleanName = (value) =>
  compact(value)
    .replace(/\s+\d{1,3}$/g, '')
    .replace(/\s+\d+\s*(?:%|foiz)$/i, '')
    .replace(/[()]+$/g, '')
    .trim();

const titleNamePart = (value) => {
  const text = compact(value).toLowerCase();
  return text.replace(/(^|-)([a-zà-ž])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
};

const splitPersonName = (name) => {
  const parts = cleanName(name).split(' ').filter(Boolean).map(titleNamePart);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { last_name: parts[0], first_name: parts.slice(1).join(' ') };
};

const isLikelyPersonName = (value) => {
  const name = cleanName(value);
  if (!name || name.length < 3) return false;
  if (!/[A-Za-zÀ-žʻʼ‘’`'-]/.test(name)) return false;
  if (/^(jami|total|summa|qarz|chegirma|grant|aprel|iyun|iyul|avgust|sentabr|oktyabr|noyabr|dekabr)$/i.test(name)) return false;
  if (/^\d+(?:[-+=]\d+)*$/.test(name)) return false;
  return true;
};

const findHeader = (rows) => {
  const index = rows.findIndex((row) => markerIndex(row) >= 0);
  if (index < 0) return null;
  const row = rows[index];
  const marker = markerIndex(row);
  const columnByKind = {};
  row.forEach((cell, columnIndex) => {
    const text = compact(cell).toLowerCase();
    if (/sinf/.test(text) && columnByKind.school_class == null) columnByKind.school_class = columnIndex;
    if (/maktab/.test(text) && columnByKind.school_name == null) columnByKind.school_name = columnIndex;
    if (/tel|raqam|nomer/.test(text) && columnByKind.phone == null) columnByKind.phone = columnIndex;
  });
  return {
    rowIndex: index,
    marker,
    nameColumn: marker + 1,
    className: compact(row[marker + 1]) || '',
    columnByKind,
  };
};

const firstPhoneInRow = (row, startIndex) => {
  for (let index = startIndex; index < row.length; index += 1) {
    const phone = normalizePhone(row[index]);
    if (phone) return phone;
  }
  return '';
};

const firstUseful = (row, index) => {
  const value = compact(row[index]);
  return /^[A-Za-z0-9À-ž]/.test(value) ? value : '';
};

const normalizeOneFile = (filePath, enrollmentStart, usedUsernames) => {
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8')).filter((row) => row.some((cell) => compact(cell)));
  const header = findHeader(rows);
  if (!header) return { rows: [], nextEnrollment: enrollmentStart };

  const teacherName = teacherNameFromPath(filePath);
  const className = classNameFromFile(filePath) || header.className || 'One Big Group';
  const teacherEmployeeId = `AUTO-${slug(teacherName).slice(0, 24)}`;
  const classCode = `${teacherEmployeeId}-${slug(className).slice(0, 44)}`;
  const output = [];
  let enrollment = enrollmentStart;

  for (const row of rows.slice(header.rowIndex + 1)) {
    const rowNumber = compact(row[header.marker]);
    if (!/^\d+$/.test(rowNumber)) continue;
    const rawName = row[header.nameColumn];
    if (!isLikelyPersonName(rawName)) continue;
    const { first_name, last_name } = splitPersonName(rawName);
    if (!first_name) continue;
    const schoolClass = firstUseful(row, header.columnByKind.school_class);
    const schoolName = firstUseful(row, header.columnByKind.school_name);
    const phone = normalizePhone(row[header.columnByKind.phone]) || firstPhoneInRow(row, header.nameColumn + 1);
    const username = createUsername(first_name, usedUsernames);

    output.push({
      enrollment_number: `BATCH-${String(enrollment).padStart(5, '0')}`,
      first_name,
      last_name,
      email: '',
      phone,
      date_of_birth: '',
      parent_name: '',
      parent_phone: '',
      gender: '',
      status: 'Active',
      username,
      password: '012345678',
      teacher_name: teacherName,
      teacher_employee_id: teacherEmployeeId,
      class_name: className,
      class_code: classCode,
      school_name: schoolName,
      school_class: schoolClass,
      source_file: path.relative(ROOT, filePath),
      source_row: rowNumber,
    });
    enrollment += 1;
  }

  return { rows: output, nextEnrollment: enrollment };
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const columns = [
  'enrollment_number',
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'parent_name',
  'parent_phone',
  'gender',
  'status',
  'username',
  'password',
  'teacher_name',
  'teacher_employee_id',
  'class_name',
  'class_code',
  'school_name',
  'school_class',
];

const auditColumns = [...columns, 'source_file', 'source_row'];

const usedUsernames = new Set();
let nextEnrollment = 1;
const allRows = [];
const auditRows = [];
const summary = [];

for (const filePath of walk(BATCHING_DIR).sort()) {
  const normalized = normalizeOneFile(filePath, nextEnrollment, usedUsernames);
  nextEnrollment = normalized.nextEnrollment;
  allRows.push(...normalized.rows);
  auditRows.push(...normalized.rows);

  const relativeFolder = path.relative(BATCHING_DIR, path.dirname(filePath));
  const perTeacherDir = path.join(OUT_DIR, relativeFolder);
  fs.mkdirSync(perTeacherDir, { recursive: true });
  const outFile = path.join(perTeacherDir, `NORMALIZED - ${path.basename(filePath).replace(/^ONE BIG GROUP - /i, '')}`);
  writeCsv(outFile, normalized.rows, columns);
  summary.push({
    source: path.relative(ROOT, filePath),
    output: path.relative(ROOT, outFile),
    rows: normalized.rows.length,
  });
}

writeCsv(path.join(OUT_DIR, 'students_import.csv'), allRows, columns);
writeCsv(path.join(OUT_DIR, 'students_audit.csv'), auditRows, auditColumns);
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({ outputDir: path.relative(ROOT, OUT_DIR), files: summary.length, rows: allRows.length }, null, 2));
