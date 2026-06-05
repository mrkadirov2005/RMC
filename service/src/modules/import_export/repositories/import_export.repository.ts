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

const selectAllRooms = (centerId?: number) => {
  let query = `
    SELECT r.*, c.class_name, c.class_code
    FROM rooms r
    LEFT JOIN classes c ON r.class_id = c.class_id
  `;
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE r.center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY r.room_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllAssignments = (centerId?: number) => {
  let query = `
    SELECT a.*, c.class_name, c.class_code
    FROM assignments a
    LEFT JOIN classes c ON a.class_id = c.class_id
  `;
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE a.center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY a.assignment_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllSubjects = (centerId?: number) => {
  let query = `
    SELECT s.*, c.class_name, c.class_code, t.employee_id AS teacher_employee_id
    FROM subjects s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
  `;
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE s.center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY s.subject_id DESC';
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

const findStudentIdByEnrollmentNumber = (enrollmentNumber?: string | null, centerId?: number) => {
  const normalizedEnrollmentNumber = normalizeClassText(enrollmentNumber);
  if (!normalizedEnrollmentNumber) return Promise.resolve(null);

  let query = 'SELECT student_id FROM students WHERE LOWER(TRIM(enrollment_number)) = LOWER($1)';
  const params: any[] = [normalizedEnrollmentNumber];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' ORDER BY student_id LIMIT 1';

  return pool.query(query, params).then((r: any) => r.rows[0]?.student_id || null);
};

const findStudentIdByNameAndClass = (firstName?: string | null, lastName?: string | null, classId?: number | null, centerId?: number) => {
  const normalizedFirstName = normalizeClassText(firstName);
  const normalizedLastName = normalizeClassText(lastName);
  if (!normalizedFirstName || !normalizedLastName) return Promise.resolve(null);

  const params: any[] = [normalizedFirstName, normalizedLastName];
  let query = `SELECT student_id FROM students WHERE LOWER(TRIM(first_name)) = LOWER($1) AND LOWER(TRIM(last_name)) = LOWER($2)`;
  if (classId) {
    params.push(classId);
    query += ` AND class_id = $${params.length}`;
  }
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' ORDER BY student_id LIMIT 1';

  return pool.query(query, params).then((r: any) => r.rows[0]?.student_id || null);
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
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (enrollment_number) DO UPDATE SET
       center_id = EXCLUDED.center_id,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash,
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

const insertTeacher = (params: any[]) =>
  pool.query(
    `INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, username, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (employee_id) DO UPDATE SET
       center_id = EXCLUDED.center_id,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       date_of_birth = EXCLUDED.date_of_birth,
       gender = EXCLUDED.gender,
       qualification = EXCLUDED.qualification,
       specialization = EXCLUDED.specialization,
       status = EXCLUDED.status,
       username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash,
       updated_at = CURRENT_TIMESTAMP`,
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
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (receipt_number) DO UPDATE SET
       student_id = EXCLUDED.student_id,
       center_id = EXCLUDED.center_id,
       payment_date = EXCLUDED.payment_date,
       amount = EXCLUDED.amount,
       currency = EXCLUDED.currency,
       payment_method = EXCLUDED.payment_method,
       transaction_reference = EXCLUDED.transaction_reference,
       payment_status = EXCLUDED.payment_status,
       payment_type = EXCLUDED.payment_type,
       notes = EXCLUDED.notes,
       updated_at = CURRENT_TIMESTAMP`,
    params
  );

const insertRoom = (params: any[]) =>
  pool.query(
    `INSERT INTO rooms (center_id, room_number, class_id, day, time)
     VALUES ($1,$2,$3,$4,$5)`,
    params
  );

const insertAssignment = (params: any[]) =>
  pool.query(
    `INSERT INTO assignments (center_id, class_id, student_id, teacher_id, assignment_title, description, due_date, submission_date, status, grade)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    params
  );

const insertSubject = (params: any[]) =>
  pool.query(
    `WITH updated AS (
       UPDATE subjects
       SET subject_name = $3,
           subject_code = $4,
           teacher_id = $5,
           total_marks = $6,
           passing_marks = $7
       WHERE center_id = $1
         AND class_id = $2
         AND COALESCE($4, '') <> ''
         AND LOWER(TRIM(COALESCE(subject_code, ''))) = LOWER(TRIM($4))
       RETURNING subject_id
     ), inserted AS (
       INSERT INTO subjects (center_id, class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks)
       SELECT $1,$2,$3,$4,$5,$6,$7
       WHERE NOT EXISTS (SELECT 1 FROM updated)
       RETURNING subject_id
     )
     SELECT subject_id FROM updated
     UNION ALL
     SELECT subject_id FROM inserted`,
    params
  );

const upsertStudent = (params: any[], hasStudentId: boolean) => {
  if (hasStudentId) {
    return pool.query(
      `INSERT INTO students (student_id, center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (student_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         enrollment_number = EXCLUDED.enrollment_number,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
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
      `INSERT INTO teachers (teacher_id, center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, username, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
         username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash,
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

const upsertRoom = (params: any[], hasRoomId: boolean) => {
  if (hasRoomId) {
    return pool.query(
      `INSERT INTO rooms (room_id, center_id, room_number, class_id, day, time)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (room_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         room_number = EXCLUDED.room_number,
         class_id = EXCLUDED.class_id,
         day = EXCLUDED.day,
         time = EXCLUDED.time,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertRoom(params);
};

const upsertAssignment = (params: any[], hasAssignmentId: boolean) => {
  if (hasAssignmentId) {
    return pool.query(
      `INSERT INTO assignments (assignment_id, center_id, class_id, student_id, teacher_id, assignment_title, description, due_date, submission_date, status, grade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (assignment_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         class_id = EXCLUDED.class_id,
         student_id = EXCLUDED.student_id,
         teacher_id = EXCLUDED.teacher_id,
         assignment_title = EXCLUDED.assignment_title,
         description = EXCLUDED.description,
         due_date = EXCLUDED.due_date,
         submission_date = EXCLUDED.submission_date,
         status = EXCLUDED.status,
         grade = EXCLUDED.grade,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertAssignment(params);
};

const upsertSubject = (params: any[], hasSubjectId: boolean) => {
  if (hasSubjectId) {
    return pool.query(
      `INSERT INTO subjects (subject_id, center_id, class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (subject_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         class_id = EXCLUDED.class_id,
         subject_name = EXCLUDED.subject_name,
         subject_code = EXCLUDED.subject_code,
         teacher_id = EXCLUDED.teacher_id,
         total_marks = EXCLUDED.total_marks,
         passing_marks = EXCLUDED.passing_marks`,
      params
    );
  }
  return insertSubject(params);
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
  selectAllRooms,
  selectAllAssignments,
  selectAllSubjects,
  findTeacherIdByEmployeeId,
  findStudentIdByEnrollmentNumber,
  findStudentIdByNameAndClass,
  findClassIdByNameOrCode,
  findOrCreateClassIdByNameOrCode,
  insertStudent,
  insertTeacher,
  upsertClassByCode,
  insertPayment,
  insertRoom,
  insertAssignment,
  insertSubject,
  upsertStudent,
  upsertTeacher,
  upsertPayment,
  upsertRoom,
  upsertAssignment,
  upsertSubject,
  syncSerialSequence,
};

export {};
