const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NEW_DATA_DIR = path.join(ROOT, 'docs', 'new-data');
const DATA_DIR = process.env.NORMALIZED_DATA_DIR || (fs.existsSync(NEW_DATA_DIR) ? NEW_DATA_DIR : path.join(ROOT, 'docs', 'data'));
const DEFAULT_OUT_DIR = path.join(ROOT, 'docs', 'normalized');
const OUT_DIR = process.env.NORMALIZED_OUT_DIR || DEFAULT_OUT_DIR;
const EXISTING_OUT_DIR = process.env.NORMALIZED_EXISTING_DIR || DEFAULT_OUT_DIR;
const DEFAULT_PASSWORD = '012345678';

const CLASS_NAME_OVERRIDES = {
  'TCH-016-B1-INTRO': 'B1 Intro (Temurbek)',
  'TCH-018-B1-INTRO': 'B1 intro (Xurshid)',
  'TCH-020-MATEMATIKA-3-16-00': 'Matematika 3 16:00 (1)',
  'TCH-020-MATEMATIKA-3-16-00-2': 'Matematika 3 16:00 (2)',
  'TCH-020-MATEMATIKA-3-16-00-3': 'Matematika 3 16:00 (3)',
};

const CAPACITY_OVERRIDES = {
  'TCH-016-IELTS-7-0-PREMIER': 40,
};

const SYNC_CAPACITY_FROM_PARSED_ROWS = new Set(['TCH-016-STARTER-NEW']);

const UNNUMBERED_STUDENT_ROWS = {
  'TCH-016-STARTER-NEW': new Set(['LATIPOVA-NIGINA']),
};

const TEACHER_EMAIL_OVERRIDES = {
  'TCH-002': 'a-zamov-muhammad@temurbekschool.local',
  'TCH-013': 'o-ktamov-aminjon@temurbekschool.local',
  'TCH-014': 'rustili-rustili@temurbekschool.local',
};

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

const compact = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const readCsvRows = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8')).filter((row) => row.some((cell) => compact(cell)));
  if (rows.length === 0) return [];
  const headers = rows[0].map(compact);
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] == null ? '' : row[index]]))
  );
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

const teacherNameFromFile = (fileName) =>
  compact(
    path
      .basename(fileName, path.extname(fileName))
      .replace(/^TEMURBEK SCHOOL\s*-\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\d+(?:[.,]\d+)?\s*%/g, '')
      .replace(/%/g, '')
      .replace(/\b\d{2,4}\b/g, '')
      .replace(/\bnew\b/gi, '')
      .replace(/\bsummer\b/gi, '')
  );

const teacherSalaryPercentageFromFile = (fileName) => {
  const match = path.basename(fileName, path.extname(fileName)).match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return 50;
  const value = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(value)) return 50;
  return Math.min(Math.max(value, 0), 100);
};

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

const addMinutesToTime = (time, minutes) => {
  const [hoursRaw, minutesRaw] = String(time || '').split(':');
  const hours = Number(hoursRaw);
  const mins = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return '';
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const parseScheduleText = (value) => {
  const text = compact(value).toLowerCase();
  const days = [];
  const dayAliases = [
    [/dush|du\b/, 'Monday'],
    [/sesh|se\b/, 'Tuesday'],
    [/chor|ch\b/, 'Wednesday'],
    [/pay|paysh/, 'Thursday'],
    [/juma|ju\b/, 'Friday'],
    [/shanba/, 'Saturday'],
    [/yak/, 'Sunday'],
  ];
  dayAliases.forEach(([pattern, day]) => {
    if (pattern.test(text) && !days.includes(day)) days.push(day);
  });
  const timeMatch = text.match(/(\d{1,2})[:.](\d{2})/);
  const time = timeMatch ? `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}` : '';
  return {
    days,
    time,
    endTime: time ? addMinutesToTime(time, 60) : '',
  };
};

const serializeSchedule = (value) => {
  const schedule = parseScheduleText(value);
  return schedule.days.length || schedule.time ? JSON.stringify(schedule) : compact(value);
};

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
  if (!/[A-Za-z\u0400-\u04FF]/.test(title)) return '';
  if (/^\d+\s/.test(title)) return '';
  if (cells.length <= 3) return title;
  return '';
};

const isAllowedUnnumberedStudentRow = (row, nameIndex, classCode) => {
  const allowedNames = UNNUMBERED_STUDENT_ROWS[classCode];
  if (!allowedNames) return false;
  const marker = compact(row[nameIndex - 1]);
  if (marker) return false;
  return allowedNames.has(slug(row[nameIndex]));
};

const isRealStudentRow = (row, nameIndex, classCode) => {
  const marker = compact(row[nameIndex - 1]);
  if (!/^\d+$/.test(marker) && !isAllowedUnnumberedStudentRow(row, nameIndex, classCode)) return false;
  const name = compact(row[nameIndex]);
  if (!name || name.length < 3) return false;
  if (/^\d+$/.test(name)) return false;
  if (/^(jami|summa|total|dekabr|yan|fevral|mart|aprel|may)$/i.test(name)) return false;
  if (isNoteOrPaymentText(name)) return false;
  return /[A-Za-z\u0400-\u04FF'ʻ`-]/.test(name);
};

const isExplicitlyAllowedNewStudent = (student) => {
  const allowedNames = UNNUMBERED_STUDENT_ROWS[student.class_code];
  if (!allowedNames) return false;
  return allowedNames.has(slug(`${student.last_name || ''} ${student.first_name || ''}`));
};

const createClassCodeFactory = () => {
  const counts = new Map();
  return (teacherEmployeeId, className) => {
    const base = `${teacherEmployeeId}-${slug(className)}`.slice(0, 50);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    if (count === 1) return base;
    const suffix = `-${count}`;
    return `${base.slice(0, 50 - suffix.length)}${suffix}`;
  };
};

const updateClassNamesInExistingCsv = (fileName, classNameByCode) => {
  const outputPath = path.join(OUT_DIR, fileName);
  const sourcePath = fs.existsSync(outputPath) ? outputPath : path.join(EXISTING_OUT_DIR, fileName);
  const rows = readCsvRows(sourcePath);
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  if (!columns.includes('class_code') || !columns.includes('class_name')) return;
  for (const row of rows) {
    const className = classNameByCode.get(row.class_code);
    if (className) row.class_name = className;
  }
  writeCsv(outputPath, rows, columns);
};

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(DATA_DIR).filter((file) => file.toLowerCase().endsWith('.csv')).sort();
const existingTeachers = readCsvRows(path.join(EXISTING_OUT_DIR, 'teachers_import.csv'));
const existingClasses = readCsvRows(path.join(EXISTING_OUT_DIR, 'classes_import.csv'));
const existingStudents = readCsvRows(path.join(EXISTING_OUT_DIR, 'students_import.csv'));
const existingTeacherByEmployeeId = new Map(existingTeachers.map((row) => [row.employee_id, row]));
const existingClassByCode = new Map(existingClasses.map((row) => [row.class_code, row]));
const teachers = [];
const teacherByName = new Map();
const teacherUsernames = new Set();
const classes = [];
const students = [];
const studentUsernames = new Set(existingStudents.map((row) => row.username).filter(Boolean));
const studentIdentityKeys = new Set();
const createClassCode = createClassCodeFactory();

const studentIdentityKey = (fullName, phone) => `${slug(fullName)}|${phone || ''}`;

const existingStudentByIdentityKey = new Map();
let nextStudentNumber = 1;
for (const row of existingStudents) {
  const number = Number(String(row.enrollment_number || '').replace(/^STU-/, ''));
  if (Number.isFinite(number)) nextStudentNumber = Math.max(nextStudentNumber, number + 1);

  const fullName = compact(`${row.last_name || ''} ${row.first_name || ''}`);
  if (!fullName) continue;
  const key = studentIdentityKey(fullName, normalizePhone(row.phone));
  if (!existingStudentByIdentityKey.has(key)) existingStudentByIdentityKey.set(key, row);
}

const nextEnrollmentNumber = () => {
  const enrollmentNumber = `STU-${String(nextStudentNumber).padStart(5, '0')}`;
  nextStudentNumber += 1;
  return enrollmentNumber;
};

for (const file of files) {
  const teacherName = teacherNameFromFile(file);
  const salaryPercentage = teacherSalaryPercentageFromFile(file);
  if (!teacherByName.has(teacherName.toLowerCase())) {
    const teacherNumber = teachers.length + 1;
    const employeeId = `TCH-${String(teacherNumber).padStart(3, '0')}`;
    const name = splitPersonName(teacherName);
    const existingTeacher = existingTeacherByEmployeeId.get(employeeId) || {};
    const teacher = {
      employee_id: employeeId,
      first_name: name.first_name || teacherName,
      last_name: name.last_name,
      email: TEACHER_EMAIL_OVERRIDES[employeeId] || existingTeacher.email || `${slug(teacherName).toLowerCase()}@temurbekschool.local`,
      phone: existingTeacher.phone || '',
      date_of_birth: existingTeacher.date_of_birth || '',
      gender: existingTeacher.gender || '',
      qualification: existingTeacher.qualification || '',
      specialization: existingTeacher.specialization || '',
      salary_percentage: salaryPercentage,
      status: existingTeacher.status || 'Active',
    };
    if (existingTeacher.username) {
      teacher.username = existingTeacher.username;
      teacherUsernames.add(existingTeacher.username);
    } else {
      teacher.username = createUsername(teacher.first_name, teacherUsernames);
    }
    teacher.password = existingTeacher.password || DEFAULT_PASSWORD;
    teachers.push(teacher);
    teacherByName.set(teacherName.toLowerCase(), teacher);
  } else {
    teacherByName.get(teacherName.toLowerCase()).salary_percentage = salaryPercentage;
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
    if (isExcludedClassName(className)) continue;

    if (isScheduleText(headerName)) previousSchedule = headerName;
    const classCode = createClassCode(teacher.employee_id, className);
    const existingClass = existingClassByCode.get(classCode) || {};
    const classRow = {
      class_name: CLASS_NAME_OVERRIDES[classCode] || className,
      class_code: classCode,
      teacher_employee_id: teacher.employee_id,
      level: existingClass.level || '',
      section: existingClass.section || serializeSchedule(previousSchedule),
      capacity: 0,
      room_number: existingClass.room_number || '',
      start_date: existingClass.start_date || '',
      end_date: existingClass.end_date || '',
      payment_amount: existingClass.payment_amount || '',
      payment_frequency: existingClass.payment_frequency || 'Monthly',
    };
    classes.push(classRow);

    for (let dataIndex = rowIndex + 1; dataIndex < rows.length; dataIndex += 1) {
      const dataRow = rows[dataIndex];
      if (looksLikeHeader(dataRow)) break;
      const nextTitle = usefulTitle(dataRow);
      if (nextTitle && dataRow.filter((cell) => compact(cell)).length <= 3) break;
      if (!isRealStudentRow(dataRow, nameIndex, classCode)) continue;

      const fullName = compact(dataRow[nameIndex]).replace(/\s+\d+$/, '');
      const studentName = splitPersonName(fullName);
      const phone = phoneIndex >= 0 ? normalizePhone(dataRow[phoneIndex]) : '';
      const identityKey = studentIdentityKey(fullName, phone);
      if (studentIdentityKeys.has(identityKey)) continue;
      studentIdentityKeys.add(identityKey);
      const existingStudent = existingStudentByIdentityKey.get(identityKey) || {};
      const student = {
        enrollment_number: existingStudent.enrollment_number || nextEnrollmentNumber(),
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
      student.username = existingStudent.username || createUsername(student.first_name, studentUsernames);
      student.password = existingStudent.password || DEFAULT_PASSWORD;
      students.push(student);
      classRow.capacity += 1;
    }
  }
}

const parsedClasses = [...classes];
const parsedStudents = [...students];
const parsedCapacityByCode = new Map(parsedClasses.map((classRow) => [classRow.class_code, classRow.capacity]));

if (existingClasses.length > 0) {
  const existingClassCodes = new Set(existingClasses.map((classRow) => classRow.class_code));
  const mergedClasses = existingClasses.map((classRow) => {
    const merged = { ...classRow };
    if (CLASS_NAME_OVERRIDES[merged.class_code]) merged.class_name = CLASS_NAME_OVERRIDES[merged.class_code];
    if (SYNC_CAPACITY_FROM_PARSED_ROWS.has(merged.class_code) && parsedCapacityByCode.has(merged.class_code)) {
      merged.capacity = parsedCapacityByCode.get(merged.class_code);
    }
    if (CAPACITY_OVERRIDES[merged.class_code] != null) merged.capacity = CAPACITY_OVERRIDES[merged.class_code];
    return merged;
  });

  if (process.env.NORMALIZED_ALLOW_NEW_CLASSES === '1') {
    for (const classRow of parsedClasses) {
      if (!existingClassCodes.has(classRow.class_code)) mergedClasses.push(classRow);
    }
  }

  classes.splice(0, classes.length, ...mergedClasses);
}

for (const classRow of classes) {
  if (CLASS_NAME_OVERRIDES[classRow.class_code]) {
    classRow.class_name = CLASS_NAME_OVERRIDES[classRow.class_code];
  }
  if (CAPACITY_OVERRIDES[classRow.class_code] != null) {
    classRow.capacity = CAPACITY_OVERRIDES[classRow.class_code];
  }
}

const classNameByCode = new Map(classes.map((classRow) => [classRow.class_code, classRow.class_name]));
const finalClassCodes = new Set(classes.map((classRow) => classRow.class_code));

if (existingStudents.length > 0) {
  const existingEnrollmentNumbers = new Set(existingStudents.map((student) => student.enrollment_number).filter(Boolean));
  const existingIdentityKeys = new Set();
  const existingClassNameKeys = new Set();
  const mergedStudents = existingStudents.map((student) => {
    const merged = { ...student };
    const fullName = compact(`${merged.last_name || ''} ${merged.first_name || ''}`);
    if (fullName) existingIdentityKeys.add(studentIdentityKey(fullName, normalizePhone(merged.phone)));
    if (fullName && merged.class_code) existingClassNameKeys.add(`${merged.class_code}|${slug(fullName)}`);
    const className = classNameByCode.get(merged.class_code);
    if (className) merged.class_name = className;
    return merged;
  });

  for (const student of parsedStudents) {
    const fullName = compact(`${student.last_name || ''} ${student.first_name || ''}`);
    const identityKey = studentIdentityKey(fullName, normalizePhone(student.phone));
    const classNameKey = `${student.class_code}|${slug(fullName)}`;
    if (existingEnrollmentNumbers.has(student.enrollment_number) || existingIdentityKeys.has(identityKey)) continue;
    if (existingClassNameKeys.has(classNameKey)) continue;
    if (!finalClassCodes.has(student.class_code)) continue;
    if (process.env.NORMALIZED_ALLOW_NEW_STUDENTS !== '1' && !isExplicitlyAllowedNewStudent(student)) continue;
    mergedStudents.push({
      ...student,
      class_name: classNameByCode.get(student.class_code) || student.class_name,
    });
    existingEnrollmentNumbers.add(student.enrollment_number);
    existingIdentityKeys.add(identityKey);
    existingClassNameKeys.add(classNameKey);
  }

  students.splice(0, students.length, ...mergedStudents);
} else {
  for (const student of students) {
    const className = classNameByCode.get(student.class_code);
    if (className) student.class_name = className;
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
  'salary_percentage',
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
  'start_date',
  'end_date',
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

updateClassNamesInExistingCsv('subjects_import.csv', classNameByCode);
updateClassNamesInExistingCsv('rooms_import.csv', classNameByCode);

console.log(`Created ${teachers.length} teachers, ${classes.length} classes, ${students.length} students in ${OUT_DIR}`);
