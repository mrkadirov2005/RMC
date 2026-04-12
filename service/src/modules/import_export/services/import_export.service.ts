const importExportRepository = require('../repositories/import_export.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const escapeCsv = (value: any) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (rows: any[], columns: string[]) => {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(','));
  return [header, ...lines].join('\n');
};

const parseCsv = (csv: string) => {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
};

const STUDENT_COLS = [
  'student_id',
  'center_id',
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
  'teacher_id',
  'class_id',
];

const TEACHER_COLS = [
  'teacher_id',
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
  'status',
];

const PAYMENT_COLS = [
  'payment_id',
  'student_id',
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
];

const exportEntity = async (entity: string, centerId?: number) => {
  if (!['students', 'teachers', 'payments'].includes(entity)) {
    return { error: 'unsupported' as const };
  }
  let rows: any[] = [];
  let columns: string[] = [];
  if (entity === 'students') {
    rows = await importExportRepository.selectAllStudents(centerId);
    columns = STUDENT_COLS;
  } else if (entity === 'teachers') {
    rows = await importExportRepository.selectAllTeachers(centerId);
    columns = TEACHER_COLS;
  } else {
    rows = await importExportRepository.selectAllPayments(centerId);
    columns = PAYMENT_COLS;
  }
  return { csv: toCsv(rows, columns), rows: rows.length, entity };
};

const importEntity = async (entity: string, csv: string, centerId?: number) => {
  if (!csv || typeof csv !== 'string') return { error: 'no_csv' as const };
  if (!['students', 'teachers', 'payments'].includes(entity)) {
    return { error: 'unsupported' as const };
  }
  const rows = parseCsv(csv);
  let created = 0;
  for (const row of rows) {
    if (entity === 'students') {
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      await importExportRepository.insertStudent([
        rowCenterId,
        row.enrollment_number,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.date_of_birth || null,
        row.parent_name || null,
        row.parent_phone || null,
        row.gender || null,
        row.status || 'Active',
        row.teacher_id || null,
        row.class_id || null,
      ]);
    } else if (entity === 'teachers') {
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      await importExportRepository.insertTeacher([
        rowCenterId,
        row.employee_id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.date_of_birth || null,
        row.gender || null,
        row.qualification || null,
        row.specialization || null,
        row.status || 'Active',
      ]);
    } else {
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      if (centerId && row.student_id) {
        const belongs = await studentInCenter(Number(row.student_id), Number(centerId));
        if (!belongs) return { error: 'invalid_center' as const };
      }
      await importExportRepository.insertPayment([
        row.student_id,
        rowCenterId,
        row.payment_date,
        row.amount,
        row.currency || 'USD',
        row.payment_method || 'Cash',
        row.transaction_reference || null,
        row.receipt_number || null,
        row.payment_status || 'Completed',
        row.payment_type || null,
        row.notes || null,
      ]);
    }
    created += 1;
  }
  return { created, entity };
};

module.exports = { exportEntity, importEntity };

export {};
