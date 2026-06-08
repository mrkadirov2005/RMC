const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'docs', 'data');
const OUT_DIR = path.join(ROOT, 'docs', 'normalized');
const DEFAULT_PASSWORD = '012345678';

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
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`);
};

const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const slug = (value) => {
  const base = compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
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

const teacherNameFromFile = (fileName) =>
  compact(
    path
      .basename(fileName, '.csv')
      .replace(/^TEMURBEK SCHOOL\s*-\s*/i, '')
      .replace(/\d+\s*%/g, '')
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
  if (!/[A-Za-z\u0400-\u04FF]/.test(title)) return '';
  if (/^\d+\s/.test(title)) return '';
  if (cells.length <= 3) return title;
  return '';
};

const isRealStudentRow = (row, nameIndex) => {
  const name = compact(row[nameIndex]);
  if (!name || name.length < 3) return false;
  if (/^\d+$/.test(name)) return false;
  if (/^(jami|summa|total|dekabr|yan|fevral|mart|aprel|may)$/i.test(name)) return false;
  return /[A-Za-z\u0400-\u04FF'ʻ`-]/.test(name);
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(DATA_DIR).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
const teachers = [];
const teacherByName = new Map();
const teacherUsernames = new Set();
const classes = [];
const classByCode = new Map();
const students = [];
const studentUsernames = new Set();

for (const file of files) {
  const teacherName = teacherNameFromFile(file);
  if (!teacherByName.has(teacherName.toLowerCase())) {
    const teacherNumber = teachers.length + 1;
    const employeeId = `TCH-${String(teacherNumber).padStart(3, '0')}`;
    const name = splitPersonName(teacherName);
    const teacher = {
      employee_id: employeeId,
      first_name: name.first_name || teacherName,
      last_name: name.last_name,
      email: `${slug(teacherName).toLowerCase()}@temurbekschool.local`,
      phone: '',
      date_of_birth: '',
      gender: '',
      qualification: '',
      specialization: '',
      status: 'Active',
    };
    teacher.username = createUsername(teacher.first_name, teacherUsernames);
    teacher.password = DEFAULT_PASSWORD;
    teachers.push(teacher);
    teacherByName.set(teacherName.toLowerCase(), teacher);
  }

  const teacher = teacherByName.get(teacherName.toLowerCase());
  const rows = parseCsv(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  let previousTitle = '';
  let previousSchedule = '';

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
    const addressIndex = indexOf(row, [/manzil/]);
    const headerName = compact(row[nameIndex]);
    const className = isScheduleText(headerName) || isNameColumnHeader(headerName) ? previousTitle : headerName || previousTitle;
    if (!className) continue;

    if (isScheduleText(headerName)) previousSchedule = headerName;
    const classCode = `${teacher.employee_id}-${slug(className)}`.slice(0, 50);

    if (!classByCode.has(classCode)) {
      const classRow = {
        class_name: className,
        class_code: classCode,
        teacher_employee_id: teacher.employee_id,
        level: '',
        section: previousSchedule,
        capacity: 0,
        room_number: '',
        payment_amount: '',
        payment_frequency: 'Monthly',
      };
      classes.push(classRow);
      classByCode.set(classCode, classRow);
    }
    const classRow = classByCode.get(classCode);

    for (let dataIndex = rowIndex + 1; dataIndex < rows.length; dataIndex += 1) {
      const dataRow = rows[dataIndex];
      if (looksLikeHeader(dataRow)) break;
      const nextTitle = usefulTitle(dataRow);
      if (nextTitle && dataRow.filter((cell) => compact(cell)).length <= 3) break;
      if (!isRealStudentRow(dataRow, nameIndex)) continue;

      const fullName = compact(dataRow[nameIndex]).replace(/\s+\d+$/, '');
      const studentName = splitPersonName(fullName);
      const studentNumber = students.length + 1;
      const phone = phoneIndex >= 0 ? normalizePhone(dataRow[phoneIndex]) : '';
      const student = {
        enrollment_number: `STU-${String(studentNumber).padStart(5, '0')}`,
        first_name: studentName.first_name || fullName,
        last_name: studentName.last_name,
        email: '',
        phone,
        date_of_birth: '',
        parent_name: addressIndex >= 0 ? compact(dataRow[addressIndex + 1]) : '',
        parent_phone: '',
        gender: '',
        status: 'Active',
        teacher_employee_id: teacher.employee_id,
        class_name: classRow.class_name,
        class_code: classRow.class_code,
        school_name: schoolNameIndex >= 0 ? compact(dataRow[schoolNameIndex]) : '',
        school_class: schoolClassIndex >= 0 ? compact(dataRow[schoolClassIndex]) : '',
      };
      student.username = createUsername(student.first_name, studentUsernames);
      student.password = DEFAULT_PASSWORD;
      students.push(student);
      classRow.capacity += 1;
    }
  }
}

writeCsv(path.join(OUT_DIR, 'teachers_import.csv'), teachers, [
  'employee_id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'gender',
  'qualification',
  'specialization',
  'status',
  'username',
  'password',
]);

writeCsv(path.join(OUT_DIR, 'classes_import.csv'), classes, [
  'class_name',
  'class_code',
  'teacher_employee_id',
  'level',
  'section',
  'capacity',
  'room_number',
  'payment_amount',
  'payment_frequency',
]);

writeCsv(path.join(OUT_DIR, 'students_import.csv'), students, [
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
  'teacher_employee_id',
  'class_name',
  'class_code',
  'school_name',
  'school_class',
]);

console.log(`Created ${teachers.length} teachers, ${classes.length} classes, ${students.length} students in ${OUT_DIR}`);
