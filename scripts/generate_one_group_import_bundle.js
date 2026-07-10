const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NORMALIZED_DIR = path.join(ROOT, 'docs', 'batching', 'normalized_one_big_groups');
const OUT_DIR = path.join(ROOT, 'docs', 'batching', 'one_group_import_bundle');
const TEMURBEK_OVERRIDE = path.join(
  ROOT,
  'docs',
  'batching',
  'temurbek',
  'IELTS 7.0 Premier - Shaxobov Temurbek.csv'
);

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
  'class_code',
  'school_name',
  'school_class',
];

const TEACHER_COLUMNS = [
  'center_id',
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
];

const CLASS_COLUMNS = [
  'center_id',
  'class_name',
  'class_code',
  'level',
  'section',
  'capacity',
  'teacher_employee_id',
  'room_number',
  'start_date',
  'end_date',
  'payment_amount',
  'payment_frequency',
];

const PAYMENT_COLUMNS = [
  'enrollment_number',
  'center_id',
  'payment_date',
  'amount',
  'currency',
  'payment_method',
  'transaction_reference',
  'receipt_number',
  'payment_status',
  'payment_type',
  'notes',
  'original_amount',
  'discount_amount',
  'final_amount',
  'is_complete',
];

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
      row.push(field);
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => compact(cell)));
};

const readCsvObjects = (filePath) => {
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const headers = rows[0].map((header) => compact(header));
  return rows.slice(1).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
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

const slug = (value) =>
  compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['ʻ`’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') || 'user';

const splitTeacherName = (teacherName) => {
  const parts = compact(teacherName).split(' ').filter(Boolean);
  if (parts.length === 0) return { first_name: 'Teacher', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { last_name: parts[0], first_name: parts.slice(1).join(' ') };
};

const selectedGroupFiles = () =>
  fs
    .readdirSync(NORMALIZED_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      if (entry.name === 'temurbek') return TEMURBEK_OVERRIDE;
      const dir = path.join(NORMALIZED_DIR, entry.name);
      const file = fs
        .readdirSync(dir)
        .find((name) => /^NORMALIZED - .+\.csv$/i.test(name));
      return file ? path.join(dir, file) : null;
    })
    .filter(Boolean)
    .sort();

fs.mkdirSync(OUT_DIR, { recursive: true });

const students = [];
for (const file of selectedGroupFiles()) {
  students.push(...readCsvObjects(file));
}

for (const student of students) {
  student.username = `ogb_${slug(student.enrollment_number)}`;
}

const teacherByEmployeeId = new Map();
const classByCode = new Map();

for (const student of students) {
  if (!teacherByEmployeeId.has(student.teacher_employee_id)) {
    const name = splitTeacherName(student.teacher_name);
    const username = `ogb_t_${slug(student.teacher_employee_id)}`;
    teacherByEmployeeId.set(student.teacher_employee_id, {
      center_id: '',
      employee_id: student.teacher_employee_id,
      first_name: name.first_name,
      last_name: name.last_name,
      email: `${username}@temurbekschool.local`,
      phone: '',
      date_of_birth: '',
      gender: '',
      qualification: '',
      specialization: '',
      salary_percentage: '50',
      status: 'Active',
      username,
      password: '012345678',
    });
  }

  if (!classByCode.has(student.class_code)) {
    classByCode.set(student.class_code, {
      center_id: '',
      class_name: student.class_name,
      class_code: student.class_code,
      level: '',
      section: '',
      capacity: '',
      teacher_employee_id: student.teacher_employee_id,
      room_number: '',
      start_date: '',
      end_date: '',
      payment_amount: '300000',
      payment_frequency: 'Monthly',
    });
  }
}

const payments = students
  .filter((_, index) => index % 4 !== 3)
  .map((student, index) => {
    const partial = index % 5 === 2;
    const amount = partial ? 150000 : 300000;
    return {
      enrollment_number: student.enrollment_number,
      center_id: '',
      payment_date: '2026-07-08',
      amount: String(amount),
      currency: 'UZS',
      payment_method: 'Cash',
      transaction_reference: `SAMPLE-${student.enrollment_number}`,
      receipt_number: `SAMPLE-${String(index + 1).padStart(5, '0')}`,
      payment_status: 'Completed',
      payment_type: 'Tuition',
      notes: partial ? 'Sample partial monthly payment' : 'Sample full monthly payment',
      original_amount: '300000',
      discount_amount: partial ? '150000' : '0',
      final_amount: String(amount),
      is_complete: partial ? 'false' : 'true',
    };
  });

const teachers = [...teacherByEmployeeId.values()].sort((a, b) => a.employee_id.localeCompare(b.employee_id));
const classes = [...classByCode.values()].sort((a, b) => a.class_code.localeCompare(b.class_code));

writeCsv(path.join(OUT_DIR, 'students_import.csv'), students, STUDENT_COLUMNS);
writeCsv(path.join(OUT_DIR, 'teachers_import.csv'), teachers, TEACHER_COLUMNS);
writeCsv(path.join(OUT_DIR, 'classes_import.csv'), classes, CLASS_COLUMNS);
writeCsv(path.join(OUT_DIR, 'sample_payments_import.csv'), payments, PAYMENT_COLUMNS);
fs.writeFileSync(
  path.join(OUT_DIR, 'summary.json'),
  `${JSON.stringify(
    {
      students: students.length,
      teachers: teachers.length,
      classes: classes.length,
      sample_payments: payments.length,
      output_dir: path.relative(ROOT, OUT_DIR),
    },
    null,
    2
  )}\n`
);

console.log(JSON.stringify({ students: students.length, teachers: teachers.length, classes: classes.length, sample_payments: payments.length }, null, 2));
