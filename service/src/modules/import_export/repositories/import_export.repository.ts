const pool = require('../../../db/pool');

const selectAllStudents = (centerId?: number) => {
  let query = 'SELECT s.*, c.class_name, c.class_code FROM students s LEFT JOIN classes c ON s.class_id = c.class_id';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE s.center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY s.student_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllTeachers = (centerId?: number) => {
  let query = 'SELECT * FROM teachers';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY teacher_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllClasses = (centerId?: number) => {
  let query = 'SELECT * FROM classes';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY class_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllPayments = (centerId?: number) => {
  let query = 'SELECT * FROM payments';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY payment_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const normalizeClassText = (value?: string | null) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeClassCode = (value?: string | null) => {
  const code = normalizeClassText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return code || 'CLASS';
};

const findTeacherIdByEmployeeId = (employeeId?: string | null, centerId?: number) => {
  const normalizedEmployeeId = normalizeClassText(employeeId);
  if (!normalizedEmployeeId) return Promise.resolve(null);

  let query = 'SELECT teacher_id FROM teachers WHERE LOWER(TRIM(employee_id)) = LOWER($1)';
  const params: any[] = [normalizedEmployeeId];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' ORDER BY teacher_id LIMIT 1';

  return pool.query(query, params).then((r: any) => r.rows[0]?.teacher_id || null);
};

const findClassIdByNameOrCode = (className?: string | null, classCode?: string | null, centerId?: number) => {
  const params: any[] = [];
  const conditions: string[] = [];
  const normalizedClassName = normalizeClassText(className);
  const normalizedClassCode = normalizeClassText(classCode);

  if (normalizedClassName) {
    params.push(normalizedClassName);
    conditions.push(`LOWER(TRIM(class_name)) = LOWER($${params.length})`);
  }
  if (normalizedClassCode) {
    params.push(normalizedClassCode);
    conditions.push(`LOWER(TRIM(class_code)) = LOWER($${params.length})`);
  }
  if (!conditions.length) return Promise.resolve(null);

  let query = `SELECT class_id FROM classes WHERE (${conditions.join(' OR ')})`;
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' ORDER BY class_id LIMIT 1';

  return pool.query(query, params).then((r: any) => r.rows[0]?.class_id || null);
};

const findOrCreateClassIdByNameOrCode = async (className?: string | null, classCode?: string | null, centerId?: number) => {
  const existingClassId = await findClassIdByNameOrCode(className, classCode, centerId);
  if (existingClassId || !centerId) return existingClassId;

  const normalizedClassName = normalizeClassText(className) || normalizeClassText(classCode);
  if (!normalizedClassName) return null;

  const baseCode = normalizeClassCode(classCode || normalizedClassName);
  const candidates = [baseCode, `${baseCode}-${centerId}`];
  for (let index = 2; index <= 99; index += 1) {
    candidates.push(`${baseCode}-${centerId}-${index}`);
  }

  for (const candidate of candidates) {
    try {
      const result = await pool.query(
        `INSERT INTO classes (center_id, class_name, class_code, payment_frequency)
         VALUES ($1, $2, $3, 'Monthly')
         RETURNING class_id`,
        [centerId, normalizedClassName, candidate]
      );
      return result.rows[0]?.class_id || null;
    } catch (error: any) {
      if (error?.code !== '23505') throw error;
    }
  }

  return findClassIdByNameOrCode(normalizedClassName, null, centerId);
};

const insertStudent = (params: any[]) =>
  pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    params
  );

const insertTeacher = (params: any[]) =>
  pool.query(
    `INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    params
  );

const upsertClassByCode = (params: any[]) =>
  pool.query(
    `INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (class_code) DO UPDATE SET
       center_id = EXCLUDED.center_id,
       class_name = EXCLUDED.class_name,
       level = EXCLUDED.level,
       section = EXCLUDED.section,
       capacity = EXCLUDED.capacity,
       teacher_id = EXCLUDED.teacher_id,
       room_number = EXCLUDED.room_number,
       payment_amount = EXCLUDED.payment_amount,
       payment_frequency = EXCLUDED.payment_frequency,
       updated_at = CURRENT_TIMESTAMP`,
    params
  );

const insertPayment = (params: any[]) =>
  pool.query(
    `INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    params
  );

const upsertStudent = (params: any[], hasStudentId: boolean) => {
  if (hasStudentId) {
    return pool.query(
      `INSERT INTO students (student_id, center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (student_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         enrollment_number = EXCLUDED.enrollment_number,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         parent_name = EXCLUDED.parent_name,
         parent_phone = EXCLUDED.parent_phone,
         gender = EXCLUDED.gender,
         status = EXCLUDED.status,
         teacher_id = EXCLUDED.teacher_id,
         class_id = EXCLUDED.class_id,
         school_name = EXCLUDED.school_name,
         school_class = EXCLUDED.school_class,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertStudent(params);
};

const upsertTeacher = (params: any[], hasTeacherId: boolean) => {
  if (hasTeacherId) {
    return pool.query(
      `INSERT INTO teachers (teacher_id, center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (teacher_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         employee_id = EXCLUDED.employee_id,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         gender = EXCLUDED.gender,
         qualification = EXCLUDED.qualification,
         specialization = EXCLUDED.specialization,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertTeacher(params);
};

const upsertPayment = (params: any[], hasPaymentId: boolean) => {
  if (hasPaymentId) {
    return pool.query(
      `INSERT INTO payments (payment_id, student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (payment_id) DO UPDATE SET
         student_id = EXCLUDED.student_id,
         center_id = EXCLUDED.center_id,
         payment_date = EXCLUDED.payment_date,
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         payment_method = EXCLUDED.payment_method,
         transaction_reference = EXCLUDED.transaction_reference,
         receipt_number = EXCLUDED.receipt_number,
         payment_status = EXCLUDED.payment_status,
         payment_type = EXCLUDED.payment_type,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertPayment(params);
};

const syncSerialSequence = (table: string, idColumn: string) =>
  pool.query(`SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1), true)`, [
    table,
    idColumn,
  ]);

module.exports = {
  selectAllStudents,
  selectAllTeachers,
  selectAllClasses,
  selectAllPayments,
  findTeacherIdByEmployeeId,
  findClassIdByNameOrCode,
  findOrCreateClassIdByNameOrCode,
  insertStudent,
  insertTeacher,
  upsertClassByCode,
  insertPayment,
  upsertStudent,
  upsertTeacher,
  upsertPayment,
  syncSerialSequence,
};

export {};
