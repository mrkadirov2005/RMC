const importExportRepository = require('../repositories/import_export.repository');
const { studentInCenter } = require('../../../shared/tenantDb');
const crypto = require('crypto');

const createStudentSpecialId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return crypto.randomBytes(16).toString('hex');
};

const createGeneratedStudentIdentity = () => {
  const specialId = createStudentSpecialId();
  return {
    enrollmentNumber: specialId,
    email: `temurbekschool${specialId}@gmail.com`,
  };
};

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
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
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
      if (char === '\r' && next === '\n') i += 1;
      row.push(field.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      field = '';
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((values) => {
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

const ENTITY_CONFIG: Record<string, { columns: string[]; idColumn: string; table: string }> = {
  students: { columns: STUDENT_COLS, idColumn: 'student_id', table: 'students' },
  teachers: { columns: TEACHER_COLS, idColumn: 'teacher_id', table: 'teachers' },
  payments: { columns: PAYMENT_COLS, idColumn: 'payment_id', table: 'payments' },
};

const getAppsScriptUrl = () => process.env.GOOGLE_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '';

const normalizeSheetRows = (payload: any, columns: string[]) => {
  if (typeof payload?.csv === 'string') return parseCsv(payload.csv);
  const rawRows = Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload?.data) ? payload.data : [];
  return rawRows.map((row: any) => {
    if (!Array.isArray(row)) return row;
    const obj: any = {};
    columns.forEach((column, index) => {
      obj[column] = row[index] ?? '';
    });
    return obj;
  });
};

const callAppsScript = async (payload: any) => {
  const url = getAppsScriptUrl();
  if (!url) return { error: 'missing_config' as const };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok || data?.ok === false || data?.error) {
    return { error: 'apps_script_failed' as const, status: response.status, details: data?.error || data?.raw || text };
  }
  return { data };
};

const exportEntity = async (entity: string, centerId?: number) => {
  if (!ENTITY_CONFIG[entity]) {
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
  if (!ENTITY_CONFIG[entity]) {
    return { error: 'unsupported' as const };
  }
  const rows = parseCsv(csv);
  return importRows(entity, rows, centerId, false);
};

const importRows = async (entity: string, rows: any[], centerId?: number, upsert = false) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    return { error: 'unsupported' as const };
  }
  let created = 0;
  for (const row of rows) {
    if (entity === 'students') {
      const identity = createGeneratedStudentIdentity();
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      const studentId = Number(row.student_id);
      const hasStudentId = upsert && Number.isFinite(studentId) && studentId > 0;
      const params = [
        rowCenterId,
        row.enrollment_number || identity.enrollmentNumber,
        row.first_name,
        row.last_name,
        row.email || identity.email,
        row.phone,
        row.date_of_birth || null,
        row.parent_name || null,
        row.parent_phone || null,
        row.gender || null,
        row.status || 'Active',
        row.teacher_id || null,
        row.class_id || null,
      ];
      await (upsert ? importExportRepository.upsertStudent(hasStudentId ? [studentId, ...params] : params, hasStudentId) : importExportRepository.insertStudent(params));
    } else if (entity === 'teachers') {
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      const teacherId = Number(row.teacher_id);
      const hasTeacherId = upsert && Number.isFinite(teacherId) && teacherId > 0;
      const params = [
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
      ];
      await (upsert ? importExportRepository.upsertTeacher(hasTeacherId ? [teacherId, ...params] : params, hasTeacherId) : importExportRepository.insertTeacher(params));
    } else {
      const rowCenterId = centerId ?? Number(row.center_id);
      if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
        return { error: 'invalid_center' as const };
      }
      if (centerId && row.student_id) {
        const belongs = await studentInCenter(Number(row.student_id), Number(centerId));
        if (!belongs) return { error: 'invalid_center' as const };
      }
      const params = [
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
      ];
      const paymentId = Number(row.payment_id);
      const hasPaymentId = upsert && Number.isFinite(paymentId) && paymentId > 0;
      await (upsert ? importExportRepository.upsertPayment(hasPaymentId ? [paymentId, ...params] : params, hasPaymentId) : importExportRepository.insertPayment(params));
    }
    created += 1;
  }
  if (upsert) {
    await importExportRepository.syncSerialSequence(config.table, config.idColumn);
  }
  return { created, entity };
};

const pushEntityToSheets = async (entity: string, centerId?: number) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) return { error: 'unsupported' as const };
  const exported = await exportEntity(entity, centerId);
  if ('error' in exported) return exported;
  const rows = parseCsv(exported.csv);
  const result = await callAppsScript({
    action: 'push',
    entity,
    columns: config.columns,
    rows,
    csv: exported.csv,
    center_id: centerId ?? null,
  });
  if ('error' in result) return result;
  return { entity, rows: exported.rows, response: result.data };
};

const pullEntityFromSheets = async (entity: string, centerId?: number) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) return { error: 'unsupported' as const };
  const result = await callAppsScript({
    action: 'pull',
    entity,
    columns: config.columns,
    center_id: centerId ?? null,
  });
  if ('error' in result) return result;
  const rows = normalizeSheetRows(result.data, config.columns);
  const imported = await importRows(entity, rows, centerId, true);
  if ('error' in imported) return imported;
  return { entity, rows: imported.created, response: result.data };
};

module.exports = { exportEntity, importEntity, pushEntityToSheets, pullEntityFromSheets };

export {};
