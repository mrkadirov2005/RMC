const importExportRepository = require('../repositories/import_export.repository');
const { studentInCenter } = require('../../../shared/tenantDb');
const { hashPassword } = require('../../../shared/password');
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
  const raw = String(value);
  // Prevent spreadsheet applications from evaluating imported text as a formula.
  const str = typeof value === 'string' && /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
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

  const normalizeHeader = (header: string) =>
    header
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const headers = rows[0].map((h) => normalizeHeader(h));
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
  'username',
  'password',
  'email',
  'phone',
  'date_of_birth',
  'parent_name',
  'parent_phone',
  'gender',
  'status',
  'teacher_id',
  'teacher_employee_id',
  'class_id',
  'class_name',
  'class_code',
  'school_name',
  'school_class',
  'is_discounted',
  'discount_value_type',
  'discount_value',
  'discount_original_price',
  'discount_reason',
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
  'salary_percentage',
  'status',
  'username',
  'password',
];

const CLASS_COLS = [
  'class_id',
  'center_id',
  'class_name',
  'class_code',
  'level',
  'section',
  'capacity',
  'teacher_id',
  'teacher_employee_id',
  'room_number',
  'start_date',
  'end_date',
  'payment_amount',
  'payment_frequency',
];

const PAYMENT_COLS = [
  'payment_id',
  'student_id',
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
  'discount_id',
  'discount_kind',
  'discount_value_type',
  'discount_value',
  'original_amount',
  'discount_amount',
  'final_amount',
  'is_complete',
];

const ROOM_COLS = [
  'room_id',
  'center_id',
  'room_number',
  'class_id',
  'class_name',
  'class_code',
  'day',
  'time',
  'end_time',
];

const ASSIGNMENT_COLS = [
  'assignment_id',
  'center_id',
  'class_id',
  'class_name',
  'class_code',
  'student_id',
  'teacher_id',
  'assignment_title',
  'description',
  'due_date',
  'submission_date',
  'status',
  'grade',
];

const SUBJECT_COLS = [
  'subject_id',
  'center_id',
  'class_id',
  'class_name',
  'class_code',
  'teacher_id',
  'teacher_employee_id',
  'subject_name',
  'subject_code',
  'total_marks',
  'passing_marks',
];

const ENTITY_CONFIG: Record<string, { columns: string[]; idColumn: string; table: string }> = {
  students: { columns: STUDENT_COLS, idColumn: 'student_id', table: 'students' },
  teachers: { columns: TEACHER_COLS, idColumn: 'teacher_id', table: 'teachers' },
  classes: { columns: CLASS_COLS, idColumn: 'class_id', table: 'classes' },
  payments: { columns: PAYMENT_COLS, idColumn: 'payment_id', table: 'payments' },
  rooms: { columns: ROOM_COLS, idColumn: 'room_id', table: 'rooms' },
  assignments: { columns: ASSIGNMENT_COLS, idColumn: 'assignment_id', table: 'assignments' },
  subjects: { columns: SUBJECT_COLS, idColumn: 'subject_id', table: 'subjects' },
};

const getAppsScriptUrl = () => process.env.GOOGLE_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL || '';

const cleanValue = (value: any) => {
  const str = String(value ?? '').trim();
  return str || null;
};

const getRowValue = (row: any, aliases: string[]) => {
  for (const alias of aliases) {
    const value = cleanValue(row?.[alias]);
    if (value != null) return value;
  }
  return null;
};

const isInvalidClassName = (value: any) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return ['ismi familiyasi', 'ism familiya', 'fio', 'full name', 'name'].includes(cleaned);
};

const toOptionalNumber = (value: any) => {
  const cleaned = cleanValue(value);
  if (cleaned == null) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const toOptionalBoolean = (value: any) => {
  const cleaned = cleanValue(value);
  if (cleaned == null) return null;
  return ['1', 'true', 'yes', 'y', 'active'].includes(String(cleaned).trim().toLowerCase());
};

const calculateDiscountFinalPrice = (originalAmount: number, valueType: string | null, discountValue: number) => {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return null;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return originalAmount;
  if (valueType === 'percent') {
    return Math.max(0, originalAmount - (originalAmount * Math.min(discountValue, 100)) / 100);
  }
  return Math.max(0, originalAmount - Math.min(discountValue, originalAmount));
};

const normalizePaymentMethod = (value: any) => {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) return 'Cash';
  const methods: Record<string, string> = {
    cash: 'Cash',
    card: 'Credit Card',
    credit_card: 'Credit Card',
    'credit card': 'Credit Card',
    bank: 'Bank Transfer',
    bank_transfer: 'Bank Transfer',
    'bank transfer': 'Bank Transfer',
    transfer: 'Bank Transfer',
    check: 'Check',
    cheque: 'Check',
    wallet: 'Digital Wallet',
    digital_wallet: 'Digital Wallet',
    'digital wallet': 'Digital Wallet',
    click: 'Digital Wallet',
    payme: 'Digital Wallet',
  };
  return methods[cleaned] || value;
};

const resolveClassId = async (row: any, centerId?: number, classIdCache?: Map<string, number | null>, client?: any) => {
  const classId = toOptionalNumber(getRowValue(row, ['class_id', 'group_id']));
  if (classId != null) return classId;

  const className = getRowValue(row, ['class_name', 'group_name', 'group', 'class']);
  const classCode = getRowValue(row, ['class_code', 'group_code']) || className;
  if (!className && !classCode) return null;
  if (isInvalidClassName(className) || isInvalidClassName(classCode)) return null;

  const cacheKey = [centerId ?? '', className ?? '', classCode ?? ''].map((value) => String(value).trim().toLowerCase()).join('|');
  if (classIdCache?.has(cacheKey)) return classIdCache.get(cacheKey) ?? null;

  const resolvedClassId = await importExportRepository.findOrCreateClassIdByNameOrCode(className, classCode, centerId, client);
  classIdCache?.set(cacheKey, resolvedClassId);
  return resolvedClassId;
};

const resolveTeacherId = async (row: any, centerId?: number, teacherIdCache?: Map<string, number | null>, client?: any) => {
  const teacherId = toOptionalNumber(getRowValue(row, ['teacher_id']));
  if (teacherId != null) return teacherId;

  const employeeId = getRowValue(row, ['teacher_employee_id', 'employee_id', 'staff_id', 'teacher_code']);
  if (!employeeId) return null;

  const cacheKey = [centerId ?? '', employeeId].map((value) => String(value).trim().toLowerCase()).join('|');
  if (teacherIdCache?.has(cacheKey)) return teacherIdCache.get(cacheKey) ?? null;

  const resolvedTeacherId = await importExportRepository.findTeacherIdByEmployeeId(employeeId, centerId, client);
  teacherIdCache?.set(cacheKey, resolvedTeacherId);
  return resolvedTeacherId;
};

const resolveStudentId = async (row: any, centerId?: number, classId?: number | null, client?: any) => {
  const studentId = toOptionalNumber(getRowValue(row, ['student_id']));
  if (studentId != null) return studentId;

  const enrollmentNumber = getRowValue(row, ['enrollment_number', 'student_enrollment_number', 'student_code']);
  if (enrollmentNumber) {
    const resolvedByEnrollment = await importExportRepository.findStudentIdByEnrollmentNumber(enrollmentNumber, centerId, client);
    if (resolvedByEnrollment) return resolvedByEnrollment;
  }

  const firstName = getRowValue(row, ['first_name', 'student_first_name', 'firstname', 'student_name']);
  const lastName = getRowValue(row, ['last_name', 'student_last_name', 'lastname', 'student_surname']);
  if (firstName && lastName) {
    return importExportRepository.findStudentIdByNameAndClass(firstName, lastName, classId, centerId, client);
  }

  return null;
};

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

const APPS_SCRIPT_TIMEOUT_MS = 20000;

const callAppsScript = async (payload: any) => {
  const url = getAppsScriptUrl();
  if (!url) return { error: 'missing_config' as const };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPS_SCRIPT_TIMEOUT_MS);
  let response: any;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { error: 'apps_script_timeout' as const, details: `No response from Apps Script within ${APPS_SCRIPT_TIMEOUT_MS}ms.` };
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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
  } else if (entity === 'classes') {
    rows = await importExportRepository.selectAllClasses(centerId);
    columns = CLASS_COLS;
  } else if (entity === 'payments') {
    rows = await importExportRepository.selectAllPayments(centerId);
    columns = PAYMENT_COLS;
  } else if (entity === 'rooms') {
    rows = await importExportRepository.selectAllRooms(centerId);
    columns = ROOM_COLS;
  } else if (entity === 'subjects') {
    rows = await importExportRepository.selectAllSubjects(centerId);
    columns = SUBJECT_COLS;
  } else {
    rows = await importExportRepository.selectAllAssignments(centerId);
    columns = ASSIGNMENT_COLS;
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

const IMPORT_BATCH_SIZE = 500;

const throwImportError = (payload: Record<string, any>): never => {
  throw Object.assign(new Error(String(payload.error)), { importError: payload });
};

const processImportRow = async (
  entity: string,
  row: any,
  rowNumber: number,
  centerId: number | undefined,
  upsert: boolean,
  classIdCache: Map<string, number | null>,
  teacherIdCache: Map<string, number | null>,
  client: any
) => {
  if (entity === 'students') {
    const identity = createGeneratedStudentIdentity();
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const studentId = Number(row.student_id);
    const hasStudentId = upsert && Number.isFinite(studentId) && studentId > 0;
    const classId = await resolveClassId(row, rowCenterId, classIdCache, client);
    const teacherId = await resolveTeacherId(row, rowCenterId, teacherIdCache, client);
    const enrollmentNumber = getRowValue(row, ['enrollment_number']) || identity.enrollmentNumber;
    const params = [
      rowCenterId,
      enrollmentNumber,
      getRowValue(row, ['first_name', 'firstname', 'name']) || '',
      getRowValue(row, ['last_name', 'lastname', 'surname']) || '',
      getRowValue(row, ['username']),
      getRowValue(row, ['password']) ? hashPassword(getRowValue(row, ['password'])) : null,
      getRowValue(row, ['email']) || identity.email,
      getRowValue(row, ['phone']),
      getRowValue(row, ['date_of_birth', 'birth_date', 'dob']),
      getRowValue(row, ['parent_name']),
      getRowValue(row, ['parent_phone']),
      getRowValue(row, ['gender']),
      getRowValue(row, ['status']) || 'Active',
      teacherId,
      classId,
      getRowValue(row, ['school_name', 'school']),
      getRowValue(row, ['school_class', 'school_grade', 'school_group']),
    ];
    await (upsert
      ? importExportRepository.upsertStudent(hasStudentId ? [studentId, ...params] : params, hasStudentId, client)
      : importExportRepository.insertStudent(params, client));
    const isDiscounted = toOptionalBoolean(getRowValue(row, ['is_discounted', 'discounted']));
    const discountValue = toOptionalNumber(getRowValue(row, ['discount_value']));
    const originalPrice = toOptionalNumber(getRowValue(row, ['discount_original_price', 'original_price']));
    if (isDiscounted && discountValue != null && originalPrice != null) {
      const resolvedStudentId = hasStudentId
        ? studentId
        : await importExportRepository.findStudentIdByEnrollmentNumber(enrollmentNumber, rowCenterId, client);
      const discountValueType = getRowValue(row, ['discount_value_type', 'discount_type']) || 'fixed';
      const finalPrice = calculateDiscountFinalPrice(originalPrice, discountValueType, discountValue);
      if (resolvedStudentId && finalPrice != null) {
        await importExportRepository.upsertSerialDiscount(
          [
            resolvedStudentId,
            rowCenterId,
            discountValueType,
            discountValue,
            originalPrice,
            finalPrice,
            getRowValue(row, ['discount_reason']) || 'Imported serial discount',
          ],
          client
        );
      }
    }
  } else if (entity === 'teachers') {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const teacherId = Number(row.teacher_id);
    const hasTeacherId = upsert && Number.isFinite(teacherId) && teacherId > 0;
    const params = [
      rowCenterId,
      getRowValue(row, ['employee_id', 'staff_id', 'teacher_code']),
      getRowValue(row, ['first_name', 'firstname', 'name']) || '',
      getRowValue(row, ['last_name', 'lastname', 'surname']) || '',
      getRowValue(row, ['email']),
      getRowValue(row, ['phone', 'phone_number']),
      getRowValue(row, ['date_of_birth', 'birth_date', 'dob']),
      getRowValue(row, ['gender']),
      getRowValue(row, ['qualification', 'degree']),
      getRowValue(row, ['specialization', 'subject', 'subjects']),
      toOptionalNumber(getRowValue(row, ['salary_percentage', 'teacher_percentage', 'commission_percentage', 'percent', 'percentage'])) ?? 50,
      getRowValue(row, ['status']) || 'Active',
      getRowValue(row, ['username']),
      getRowValue(row, ['password']) ? hashPassword(getRowValue(row, ['password'])) : null,
    ];
    await (upsert
      ? importExportRepository.upsertTeacher(hasTeacherId ? [teacherId, ...params] : params, hasTeacherId, client)
      : importExportRepository.insertTeacher(params, client));
  } else if (entity === 'classes') {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const className = getRowValue(row, ['class_name', 'group_name', 'group', 'class']) || '';
    const classCode = getRowValue(row, ['class_code', 'group_code']) || className;
    if (isInvalidClassName(className) || isInvalidClassName(classCode)) return false;
    const teacherId = await resolveTeacherId(row, rowCenterId, teacherIdCache, client);
    const params = [
      rowCenterId,
      className,
      classCode,
      toOptionalNumber(getRowValue(row, ['level'])),
      getRowValue(row, ['section', 'schedule']),
      toOptionalNumber(getRowValue(row, ['capacity'])),
      teacherId,
      getRowValue(row, ['room_number', 'room']),
      getRowValue(row, ['start_date', 'class_start_date']),
      getRowValue(row, ['end_date', 'class_end_date']),
      getRowValue(row, ['payment_amount', 'price', 'tuition']),
      getRowValue(row, ['payment_frequency']) || 'Monthly',
    ];
    await importExportRepository.upsertClassByCode(params, client);
  } else if (entity === 'payments') {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const studentId = await resolveStudentId(row, rowCenterId, undefined, client);
    if (!studentId) {
      const studentReference =
        getRowValue(row, ['student_id']) ||
        getRowValue(row, ['enrollment_number', 'student_enrollment_number', 'student_code']) ||
        [getRowValue(row, ['first_name', 'student_first_name', 'firstname', 'student_name']), getRowValue(row, ['last_name', 'student_last_name', 'lastname', 'student_surname'])]
          .filter(Boolean)
          .join(' ') ||
        'empty student reference';
      throwImportError({
        error: 'missing_student' as const,
        row: rowNumber,
        details: `Payment row ${rowNumber} could not resolve student "${studentReference}". Import students first, or provide a valid student_id/enrollment_number.`,
      });
    }
    if (centerId && studentId) {
      const belongs = await studentInCenter(Number(studentId), Number(centerId));
      if (!belongs) throwImportError({ error: 'invalid_center' as const });
    }
    const params = [
      studentId,
      rowCenterId,
      row.payment_date,
      row.amount,
      row.currency || 'UZS',
      normalizePaymentMethod(row.payment_method),
      row.transaction_reference || null,
      row.receipt_number || null,
      row.payment_status || 'Completed',
      row.payment_type || null,
      row.notes || null,
      toOptionalNumber(row.discount_id),
      getRowValue(row, ['discount_kind']) || null,
      getRowValue(row, ['discount_value_type', 'discount_type']) || null,
      toOptionalNumber(row.discount_value),
      toOptionalNumber(row.original_amount),
      toOptionalNumber(row.discount_amount),
      toOptionalNumber(row.final_amount),
      toOptionalBoolean(row.is_complete),
    ];
    const paymentId = Number(row.payment_id);
    const hasPaymentId = upsert && Number.isFinite(paymentId) && paymentId > 0;
    await (upsert
      ? importExportRepository.upsertPayment(hasPaymentId ? [paymentId, ...params] : params, hasPaymentId, client)
      : importExportRepository.insertPayment(params, client));
  } else if (entity === 'rooms') {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const classId = await resolveClassId(row, rowCenterId, classIdCache, client);
    const params = [
      rowCenterId,
      getRowValue(row, ['room_number', 'room']) || '',
      classId,
      getRowValue(row, ['day', 'weekday']) || 'Monday',
      getRowValue(row, ['time', 'start_time']) || null,
      getRowValue(row, ['end_time', 'finish_time']) || null,
    ];
    const roomId = Number(row.room_id);
    const hasRoomId = upsert && Number.isFinite(roomId) && roomId > 0;
    await (upsert
      ? importExportRepository.upsertRoom(hasRoomId ? [roomId, ...params] : params, hasRoomId, client)
      : importExportRepository.insertRoom(params, client));
  } else if (entity === 'subjects') {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const classId = await resolveClassId(row, rowCenterId, classIdCache, client);
    const teacherId = await resolveTeacherId(row, rowCenterId, teacherIdCache, client);
    const params = [
      rowCenterId,
      classId,
      getRowValue(row, ['subject_name', 'name']) || '',
      getRowValue(row, ['subject_code', 'code']),
      teacherId,
      toOptionalNumber(getRowValue(row, ['total_marks', 'max_marks'])) || 100,
      toOptionalNumber(getRowValue(row, ['passing_marks', 'pass_marks'])) || 40,
    ];
    const subjectId = Number(row.subject_id);
    const hasSubjectId = upsert && Number.isFinite(subjectId) && subjectId > 0;
    await (upsert
      ? importExportRepository.upsertSubject(hasSubjectId ? [subjectId, ...params] : params, hasSubjectId, client)
      : importExportRepository.insertSubject(params, client));
  } else {
    const rowCenterId = centerId ?? Number(row.center_id);
    if (centerId && row.center_id && Number(row.center_id) !== Number(centerId)) {
      throwImportError({ error: 'invalid_center' as const });
    }
    const classId = await resolveClassId(row, rowCenterId, classIdCache, client);
    const teacherId = await resolveTeacherId(row, rowCenterId, teacherIdCache, client);
    const studentId = await resolveStudentId(row, rowCenterId, classId, client);
    const params = [
      rowCenterId,
      classId,
      studentId,
      teacherId,
      getRowValue(row, ['assignment_title', 'title', 'task']) || '',
      getRowValue(row, ['description', 'details']),
      getRowValue(row, ['due_date', 'deadline']),
      getRowValue(row, ['submission_date', 'submitted_at']),
      getRowValue(row, ['status']) || 'Pending',
      getRowValue(row, ['grade', 'score']),
    ];
    const assignmentId = Number(row.assignment_id);
    const hasAssignmentId = upsert && Number.isFinite(assignmentId) && assignmentId > 0;
    await (upsert
      ? importExportRepository.upsertAssignment(hasAssignmentId ? [assignmentId, ...params] : params, hasAssignmentId, client)
      : importExportRepository.insertAssignment(params, client));
  }
  return true;
};

const importBatch = async (entity: string, batchRows: any[], rowNumberOffset: number, centerId: number | undefined, upsert: boolean) => {
  const classIdCache = new Map<string, number | null>();
  const teacherIdCache = new Map<string, number | null>();
  return importExportRepository.withTransaction(async (client: any) => {
    let created = 0;
    for (const [offset, row] of batchRows.entries()) {
      const rowNumber = rowNumberOffset + offset + 2;
      const wasCreated = await processImportRow(entity, row, rowNumber, centerId, upsert, classIdCache, teacherIdCache, client);
      if (wasCreated) created += 1;
    }
    return created;
  });
};

// Batches keep a single bad row from holding a giant transaction open or rolling back an
// entire large import; a batch that fails is rolled back and recorded, and later batches
// still run. A row-level business validation error (invalid_center/missing_student) instead
// aborts the whole import immediately, matching the pre-existing fail-fast contract for those.
const importRows = async (entity: string, rows: any[], centerId?: number, upsert = false) => {
  const config = ENTITY_CONFIG[entity];
  if (!config) {
    return { error: 'unsupported' as const };
  }

  let created = 0;
  const batches: Array<{ batch: number; rows: number; created: number; status: 'ok' | 'failed'; error?: string }> = [];

  for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
    const batchRows = rows.slice(start, start + IMPORT_BATCH_SIZE);
    try {
      const batchCreated = await importBatch(entity, batchRows, start, centerId, upsert);
      created += batchCreated;
      batches.push({ batch: batches.length + 1, rows: batchRows.length, created: batchCreated, status: 'ok' });
    } catch (err: any) {
      if (err?.importError) {
        return err.importError;
      }
      batches.push({ batch: batches.length + 1, rows: batchRows.length, created: 0, status: 'failed', error: err?.message || String(err) });
    }
  }

  if (upsert) {
    await importExportRepository.syncSerialSequence(config.table, config.idColumn);
  }

  const result: any = { created, entity };
  if (batches.length > 1 || batches.some((b) => b.status === 'failed')) {
    result.batches = batches;
  }
  return result;
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
