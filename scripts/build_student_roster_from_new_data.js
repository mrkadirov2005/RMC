// Reads the raw per-teacher Google Sheets exports in docs/new_data and writes one clean
// "students only" CSV per teacher into docs/new_updated_data.
//
// Scope on purpose: this only extracts the student roster (name, contact info, class,
// school). It does NOT read the monthly payment columns and does NOT compute anything
// derived from them (tuition amounts, discounts, teacher salary shares) - that part of
// the sheet is intentionally skipped for now.
//
// Any field the source sheet doesn't contain is filled with one fixed, realistic-looking
// placeholder value per field (see FIELD_DEFAULTS below) - the same value every time a
// field is missing, rather than a "fill_<field>" label. Usernames/emails/passwords are
// generated so the rows are otherwise ready to use.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'docs', 'new_data');
const OUT_DIR = path.join(ROOT, 'docs', 'new_updated_data');

const FIELD_DEFAULTS = {
  phone: '+998971234567',
  parent_phone: '+998971234567',
  date_of_birth: '2010-01-01',
  parent_name: 'Unknown Parent',
  last_name: 'Unknown',
  gender: 'Male',
  school_name: 'Unknown School',
  school_class: '10',
};
const DEFAULT_PASSWORD = '012345678';

const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
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
  const eol = '\r\n';
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join(eol)}${eol}`);
};

const slug = (value) => {
  const base = compact(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['ʻ`’]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'ITEM';
};

const usernameBase = (value) =>
  compact(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') || 'student';

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

const teacherNameFromFile = (fileName) =>
  compact(
    path
      .basename(fileName, path.extname(fileName))
      .replace(/^Copy of\s+/i, '')
      .replace(/^TEMURBEK SCHOOL\s*-\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\d+(?:[.,]\d+)?\s*%/g, '')
      .replace(/%/g, '')
      .replace(/\b\d{2,4}\b/g, '')
      .replace(/\bnew\b/gi, '')
      .replace(/\bsummer\b/gi, '')
  );

const splitPersonName = (name) => {
  const parts = compact(name).split(' ').filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { last_name: parts[0], first_name: parts.slice(1).join(' ') };
};

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return digits.length >= 7 ? `+${digits}` : '';
};

const isScheduleText = (value) =>
  /\b(dush|sesh|chor|pay|paysh|juma|shanba|yak|du|se|ch|ju)\b/i.test(value) || /\d{1,2}[:.]\d{2}/.test(value);

const looksLikeHeader = (row) => {
  const cells = row.map((cell) => compact(cell).toLowerCase());
  return cells.some((cell) => /^t\/?r$|^n\/?r$/.test(cell)) && cells.some((cell) => /tel|raqam|maktab|sinfi|sana/.test(cell));
};

const isNameColumnHeader = (value) => /^(ismi\s+familiyasi|ism\s+familiya|fio|full\s+name|name)$/i.test(compact(value));

const isExcludedClassName = (value) =>
  /sentabr\s+oyidan\s+yangi\s+guruhlari|\bketganlar\b|\bindividual\b/i.test(compact(value));

const isNoteOrPaymentText = (value) => {
  const text = compact(value);
  return (
    /^(jami|summa|total|dekabr|yanvar?|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|berilmagan|oyliklar)$/i.test(
      text
    ) ||
    /\b(oylik|to'?landi|to'?lansin|qarzdor|berildi)\b/i.test(text) ||
    /^\d{1,2}[-.\s]*(fev|mart|apr|may|okt|noy|dek|yan)/i.test(text)
  );
};

const indexOf = (row, patterns) => {
  for (let index = 0; index < row.length; index += 1) {
    const cell = compact(row[index]).toLowerCase();
    if (patterns.some((pattern) => pattern.test(cell))) return index;
  }
  return -1;
};

const usefulTitle = (row) => {
  const cells = row.map(compact).filter(Boolean);
  if (cells.length === 0) return '';
  const title = cells.join(' ');
  if (!/[A-Za-zЀ-ӿ]/.test(title)) return '';
  if (/^\d+\s/.test(title)) return '';
  if (cells.length <= 3) return title;
  return '';
};

const isRealStudentRow = (row, nameIndex) => {
  const marker = compact(row[nameIndex - 1]);
  if (!/^\d+$/.test(marker)) return false;
  const name = compact(row[nameIndex]);
  if (!name || name.length < 3) return false;
  if (/^\d+$/.test(name)) return false;
  if (/^(jami|summa|total|dekabr|yan|fevral|mart|aprel|may)$/i.test(name)) return false;
  if (isNoteOrPaymentText(name)) return false;
  // Reject stray fee/salary-calculation scratch notes typed into the name cell,
  // e.g. "11500/45%=5175+2500=7675-1300=6575" - never a real person's name.
  if (/[=%]/.test(name)) return false;
  if ((name.match(/\d/g) || []).length >= 3) return false;
  return /[A-Za-zЀ-ӿ'ʻ`-]/.test(name);
};

const STUDENT_COLUMNS = [
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
  'school_name',
  'school_class',
];

// The app's students CSV import only links a student to a teacher via `teacher_id` or
// `teacher_employee_id` - it has no idea what to do with a plain `teacher_name` column,
// which is why a plain roster-with-names-only import leaves every student's teacher blank.
// Resolve each teacher name here against the employee_id already used for that same
// teacher in docs/normalized/teachers_import.csv (the file the live system was imported
// from), so the generated employee_id actually matches a real, already-imported teacher.
const nameKey = (value) =>
  compact(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');

const loadTeacherEmployeeIdMap = () => {
  const map = new Map();
  let maxNumber = 0;
  const teachersCsvPath = path.join(ROOT, 'docs', 'normalized', 'teachers_import.csv');
  if (fs.existsSync(teachersCsvPath)) {
    const rows = parseCsv(fs.readFileSync(teachersCsvPath, 'utf8'));
    const headers = rows[0] || [];
    const employeeIdCol = headers.indexOf('employee_id');
    const firstNameCol = headers.indexOf('first_name');
    const lastNameCol = headers.indexOf('last_name');
    for (const row of rows.slice(1)) {
      const employeeId = compact(row[employeeIdCol]);
      if (!employeeId) continue;
      const fullName = compact(`${row[firstNameCol] || ''} ${row[lastNameCol] || ''}`);
      if (fullName) map.set(nameKey(fullName), employeeId);
      const match = employeeId.match(/(\d+)$/);
      if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  }
  return { map, maxNumber };
};

const { map: teacherEmployeeIdByName, maxNumber: existingMaxTeacherNumber } = loadTeacherEmployeeIdMap();
let nextNewTeacherNumber = existingMaxTeacherNumber + 1;

const resolveTeacherEmployeeId = (teacherName) => {
  const known = teacherEmployeeIdByName.get(nameKey(teacherName));
  if (known) return known;
  // Not found in the already-imported teacher list (e.g. Qodirbergnova Shaydo, who is new
  // this batch) - mint the next free employee_id. A matching teachers_import.csv row (or
  // manual "Add Teacher") using this exact employee_id must exist before importing students,
  // otherwise the import will still leave `teacher_id` blank for this teacher's rows.
  const employeeId = `TCH-${String(nextNewTeacherNumber).padStart(3, '0')}`;
  nextNewTeacherNumber += 1;
  return employeeId;
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs
  .readdirSync(SOURCE_DIR)
  .filter((file) => file.toLowerCase().endsWith('.csv'))
  .sort();

const usedUsernames = new Set();
const studentsByTeacher = new Map(); // canonical lowercase teacher name -> { teacherName, rows: [] }
let nextEnrollmentNumber = 1;

for (const file of files) {
  const teacherName = teacherNameFromFile(file);
  const teacherKey = teacherName.toLowerCase();
  if (!studentsByTeacher.has(teacherKey)) {
    studentsByTeacher.set(teacherKey, { teacherName, teacherEmployeeId: resolveTeacherEmployeeId(teacherName), rows: [] });
  }
  const teacherBucket = studentsByTeacher.get(teacherKey);

  const rows = parseCsv(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
  let previousTitle = '';
  let previousSchedule = '';
  const seenInFile = new Set(); // avoid double-counting a student appearing in two side-by-side blocks of the same row range

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const title = usefulTitle(row);
    if (title) {
      if (isScheduleText(title)) previousSchedule = title;
      else previousTitle = title;
    }

    if (!looksLikeHeader(row)) continue;

    const markerIndex = indexOf(row, [/^t\/?r$/, /^n\/?r$/]);
    const nameIndex = markerIndex >= 0 ? markerIndex + 1 : 1;
    const phoneIndex = indexOf(row, [/tel/, /raqam/]);
    const schoolClassIndex = indexOf(row, [/sinf/]);
    const schoolNameIndex = indexOf(row, [/maktab/]);
    const headerName = compact(row[nameIndex]);
    // Prefer a real title captured above the header (e.g. "Kids Farangiz") when the header's
    // own name cell is just schedule/column-label text. But some sheets put the group name
    // directly in the header cell WITH a trailing clock time (e.g. "Flyers by A'zamov 15:00"),
    // which also matches the schedule-text heuristic - don't fall back to an empty previousTitle
    // in that case, just keep the header cell as-is.
    const preferPreviousTitle = (isScheduleText(headerName) || isNameColumnHeader(headerName)) && previousTitle;
    const className = preferPreviousTitle ? previousTitle : headerName || previousTitle;
    if (!className || isExcludedClassName(className)) continue;
    if (isScheduleText(headerName)) previousSchedule = headerName;
    void previousSchedule; // schedule/room text is captured but intentionally not part of the student-only output

    for (let dataIndex = rowIndex + 1; dataIndex < rows.length; dataIndex += 1) {
      const dataRow = rows[dataIndex];
      if (looksLikeHeader(dataRow)) break;
      const nextTitle = usefulTitle(dataRow);
      if (nextTitle && dataRow.filter((cell) => compact(cell)).length <= 3) break;
      if (!isRealStudentRow(dataRow, nameIndex)) continue;

      const fullName = compact(dataRow[nameIndex]).replace(/\s+\d+$/, '');
      const dedupeKey = `${className.toLowerCase()}|${fullName.toLowerCase()}`;
      if (seenInFile.has(dedupeKey)) continue;
      seenInFile.add(dedupeKey);

      const studentName = splitPersonName(fullName);
      if (!studentName.last_name) studentName.last_name = FIELD_DEFAULTS.last_name;
      const rawPhone = phoneIndex >= 0 ? dataRow[phoneIndex] : '';
      const phone = normalizePhone(rawPhone) || FIELD_DEFAULTS.phone;
      const schoolName = schoolNameIndex >= 0 ? compact(dataRow[schoolNameIndex]) : '';
      const schoolClass = schoolClassIndex >= 0 ? compact(dataRow[schoolClassIndex]) : '';
      const username = createUsername(studentName.first_name || fullName, usedUsernames);
      const enrollmentNumber = `STU-NEW-${String(nextEnrollmentNumber).padStart(5, '0')}`;
      nextEnrollmentNumber += 1;

      teacherBucket.rows.push({
        enrollment_number: enrollmentNumber,
        first_name: studentName.first_name || fullName,
        last_name: studentName.last_name,
        email: `${username}@temurbekschool.local`,
        phone,
        date_of_birth: FIELD_DEFAULTS.date_of_birth,
        parent_name: FIELD_DEFAULTS.parent_name,
        parent_phone: FIELD_DEFAULTS.parent_phone,
        gender: FIELD_DEFAULTS.gender,
        status: 'Active',
        username,
        password: DEFAULT_PASSWORD,
        teacher_name: teacherBucket.teacherName,
        teacher_employee_id: teacherBucket.teacherEmployeeId,
        class_name: className,
        school_name: schoolName || FIELD_DEFAULTS.school_name,
        school_class: schoolClass || FIELD_DEFAULTS.school_class,
      });
    }
  }
}

const sanitizeFileName = (value) => value.replace(/[\\/:*?"<>|]+/g, ' ').trim();

let totalStudents = 0;
const newlyMintedTeachers = [];
for (const { teacherName, teacherEmployeeId, rows } of studentsByTeacher.values()) {
  if (rows.length === 0) continue;
  const outPath = path.join(OUT_DIR, `${sanitizeFileName(teacherName)}.csv`);
  writeCsv(outPath, rows, STUDENT_COLUMNS);
  totalStudents += rows.length;
  if (!teacherEmployeeIdByName.has(nameKey(teacherName))) {
    newlyMintedTeachers.push(`${teacherName} (${teacherEmployeeId})`);
  }
}

if (newlyMintedTeachers.length > 0) {
  console.log(
    `Note: ${newlyMintedTeachers.length} teacher(s) not found in docs/normalized/teachers_import.csv - minted a new employee_id for them. Create/import a matching teacher record before importing their students, or the teacher will stay unset: ${newlyMintedTeachers.join(', ')}`
  );
}

console.log(
  `Wrote ${studentsByTeacher.size} teacher CSV files (${totalStudents} students total) to ${path.relative(ROOT, OUT_DIR)}`
);
