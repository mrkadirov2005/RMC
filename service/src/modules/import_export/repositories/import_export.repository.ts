const { and, desc, eq, ilike, isNotNull, isNull, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { assignments, classes, discounts, payments, rooms, students, subjects, teachers } = require('../../../db/schema');

const db = pool.db;

const normalizeClassText = (value?: string | null) => String(value || '').trim().replace(/\s+/g, ' ');

const normalizeClassCode = (value?: string | null) => {
  const code = normalizeClassText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return code || 'CLASS';
};

const studentSelection = {
  student_id: students.studentId,
  center_id: students.centerId,
  enrollment_number: students.enrollmentNumber,
  first_name: students.firstName,
  last_name: students.lastName,
  username: students.username,
  password_hash: students.passwordHash,
  email: students.email,
  phone: students.phone,
  date_of_birth: students.dateOfBirth,
  parent_name: students.parentName,
  parent_phone: students.parentPhone,
  gender: students.gender,
  status: students.status,
  teacher_id: students.teacherId,
  class_id: students.classId,
  school_name: students.schoolName,
  school_class: students.schoolClass,
  is_frozen: students.isFrozen,
  coins: students.coins,
  deleted_at: students.deletedAt,
  created_at: students.createdAt,
  updated_at: students.updatedAt,
};

const teacherSelection = {
  teacher_id: teachers.teacherId,
  center_id: teachers.centerId,
  employee_id: teachers.employeeId,
  first_name: teachers.firstName,
  last_name: teachers.lastName,
  email: teachers.email,
  phone: teachers.phone,
  date_of_birth: teachers.dateOfBirth,
  gender: teachers.gender,
  qualification: teachers.qualification,
  specialization: teachers.specialization,
  salary_percentage: teachers.salaryPercentage,
  status: teachers.status,
  username: teachers.username,
  password_hash: teachers.passwordHash,
  created_at: teachers.createdAt,
  updated_at: teachers.updatedAt,
};

const classSelection = {
  class_id: classes.classId,
  center_id: classes.centerId,
  class_name: classes.className,
  class_code: classes.classCode,
  level: classes.level,
  section: classes.section,
  capacity: classes.capacity,
  teacher_id: classes.teacherId,
  room_number: classes.roomNumber,
  start_date: classes.startDate,
  end_date: classes.endDate,
  payment_amount: classes.paymentAmount,
  payment_frequency: classes.paymentFrequency,
  created_at: classes.createdAt,
  updated_at: classes.updatedAt,
};

const paymentSelection = {
  payment_id: payments.paymentId,
  student_id: payments.studentId,
  center_id: payments.centerId,
  payment_date: payments.paymentDate,
  amount: payments.amount,
  currency: payments.currency,
  payment_method: payments.paymentMethod,
  transaction_reference: payments.transactionReference,
  receipt_number: payments.receiptNumber,
  payment_status: payments.paymentStatus,
  payment_type: payments.paymentType,
  notes: payments.notes,
  discount_id: payments.discountId,
  discount_kind: payments.discountKind,
  discount_value_type: payments.discountValueType,
  discount_value: payments.discountValue,
  original_amount: payments.originalAmount,
  discount_amount: payments.discountAmount,
  final_amount: payments.finalAmount,
  is_complete: payments.isComplete,
  created_at: payments.createdAt,
  updated_at: payments.updatedAt,
};

const roomSelection = {
  room_id: rooms.roomId,
  center_id: rooms.centerId,
  room_number: rooms.roomNumber,
  class_id: rooms.classId,
  day: rooms.day,
  time: rooms.time,
  end_time: rooms.endTime,
  created_at: rooms.createdAt,
  updated_at: rooms.updatedAt,
};

const assignmentSelection = {
  assignment_id: assignments.assignmentId,
  center_id: assignments.centerId,
  class_id: assignments.classId,
  student_id: assignments.studentId,
  teacher_id: assignments.teacherId,
  assignment_title: assignments.assignmentTitle,
  description: assignments.description,
  due_date: assignments.dueDate,
  submission_date: assignments.submissionDate,
  status: assignments.status,
  grade: assignments.grade,
  created_at: assignments.createdAt,
  updated_at: assignments.updatedAt,
};

const subjectSelection = {
  subject_id: subjects.subjectId,
  center_id: subjects.centerId,
  class_id: subjects.classId,
  subject_name: subjects.subjectName,
  subject_code: subjects.subjectCode,
  teacher_id: subjects.teacherId,
  total_marks: subjects.totalMarks,
  passing_marks: subjects.passingMarks,
};

const selectAllStudents = (centerId?: number) => {
  const conditions = [isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  return db
    .select({
      ...studentSelection,
      class_name: classes.className,
      class_code: classes.classCode,
      is_discounted: sql`EXISTS (
        SELECT 1 FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND d.discount_kind = 'serial_discount'
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
      )`,
      discount_value_type: sql`(
        SELECT d.discount_type FROM ${discounts} d
        WHERE d.student_id = ${students.studentId} AND d.active = TRUE AND d.discount_kind = 'serial_discount'
        ORDER BY d.created_at DESC LIMIT 1
      )`,
      discount_value: sql`(
        SELECT d.value FROM ${discounts} d
        WHERE d.student_id = ${students.studentId} AND d.active = TRUE AND d.discount_kind = 'serial_discount'
        ORDER BY d.created_at DESC LIMIT 1
      )`,
      discount_original_price: sql`(
        SELECT d.original_price FROM ${discounts} d
        WHERE d.student_id = ${students.studentId} AND d.active = TRUE AND d.discount_kind = 'serial_discount'
        ORDER BY d.created_at DESC LIMIT 1
      )`,
      discount_reason: sql`(
        SELECT d.reason FROM ${discounts} d
        WHERE d.student_id = ${students.studentId} AND d.active = TRUE AND d.discount_kind = 'serial_discount'
        ORDER BY d.created_at DESC LIMIT 1
      )`,
    })
    .from(students)
    .leftJoin(classes, and(eq(students.classId, classes.classId), isNull(classes.deletedAt)))
    .where(and(...conditions))
    .orderBy(desc(students.studentId));
};

const selectAllTeachers = (centerId?: number) => {
  const conditions = [isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  return db.select(teacherSelection).from(teachers).where(and(...conditions)).orderBy(desc(teachers.teacherId));
};

const selectAllClasses = (centerId?: number) => {
  const conditions = [isNull(classes.deletedAt)];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  return db.select(classSelection).from(classes).where(and(...conditions)).orderBy(desc(classes.classId));
};

const selectAllPayments = (centerId?: number) => {
  const conditions = [isNull(payments.deletedAt)];
  if (centerId) conditions.push(eq(payments.centerId, centerId));
  return db.select(paymentSelection).from(payments).where(and(...conditions)).orderBy(desc(payments.paymentId));
};

const selectAllRooms = (centerId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(rooms.centerId, centerId));
  const query = db
    .select({ ...roomSelection, class_name: classes.className, class_code: classes.classCode })
    .from(rooms)
    .leftJoin(classes, and(eq(rooms.classId, classes.classId), isNull(classes.deletedAt)));
  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(rooms.roomId));
};

const selectAllAssignments = (centerId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(assignments.centerId, centerId));
  const query = db
    .select({ ...assignmentSelection, class_name: classes.className, class_code: classes.classCode })
    .from(assignments)
    .leftJoin(classes, and(eq(assignments.classId, classes.classId), isNull(classes.deletedAt)));
  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(assignments.assignmentId));
};

const selectAllSubjects = (centerId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(subjects.centerId, centerId));
  const query = db
    .select({
      ...subjectSelection,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_employee_id: teachers.employeeId,
    })
    .from(subjects)
    .leftJoin(classes, and(eq(subjects.classId, classes.classId), isNull(classes.deletedAt)))
    .leftJoin(teachers, and(eq(subjects.teacherId, teachers.teacherId), isNull(teachers.deletedAt)));
  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(subjects.subjectId));
};

const findTeacherIdByEmployeeId = async (employeeId?: string | null, centerId?: number, client: any = db) => {
  const normalizedEmployeeId = normalizeClassText(employeeId);
  if (!normalizedEmployeeId) return null;
  const conditions = [ilike(sql`TRIM(${teachers.employeeId})`, normalizedEmployeeId), isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  const rows = await client.select({ teacher_id: teachers.teacherId }).from(teachers).where(and(...conditions)).orderBy(teachers.teacherId).limit(1);
  return rows[0]?.teacher_id || null;
};

const findClassIdByNameOrCode = async (className?: string | null, classCode?: string | null, centerId?: number, client: any = db) => {
  const normalizedClassName = normalizeClassText(className);
  const normalizedClassCode = normalizeClassText(classCode);
  const matchConditions: any[] = [];
  if (normalizedClassName) matchConditions.push(ilike(sql`TRIM(${classes.className})`, normalizedClassName));
  if (normalizedClassCode) matchConditions.push(ilike(sql`TRIM(${classes.classCode})`, normalizedClassCode));
  if (!matchConditions.length) return null;
  const conditions = [or(...matchConditions), isNull(classes.deletedAt)];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  const rows = await client.select({ class_id: classes.classId }).from(classes).where(and(...conditions)).orderBy(classes.classId).limit(1);
  return rows[0]?.class_id || null;
};

const findStudentIdByEnrollmentNumber = async (enrollmentNumber?: string | null, centerId?: number, client: any = db) => {
  const normalizedEnrollmentNumber = normalizeClassText(enrollmentNumber);
  if (!normalizedEnrollmentNumber) return null;
  const conditions = [ilike(sql`TRIM(${students.enrollmentNumber})`, normalizedEnrollmentNumber), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  const rows = await client.select({ student_id: students.studentId }).from(students).where(and(...conditions)).orderBy(students.studentId).limit(1);
  return rows[0]?.student_id || null;
};

const findStudentIdByNameAndClass = async (firstName?: string | null, lastName?: string | null, classId?: number | null, centerId?: number, client: any = db) => {
  const normalizedFirstName = normalizeClassText(firstName);
  const normalizedLastName = normalizeClassText(lastName);
  if (!normalizedFirstName || !normalizedLastName) return null;
  const conditions = [
    ilike(sql`TRIM(${students.firstName})`, normalizedFirstName),
    ilike(sql`TRIM(${students.lastName})`, normalizedLastName),
    isNull(students.deletedAt),
  ];
  if (classId) conditions.push(eq(students.classId, classId));
  if (centerId) conditions.push(eq(students.centerId, centerId));
  const rows = await client.select({ student_id: students.studentId }).from(students).where(and(...conditions)).orderBy(students.studentId).limit(1);
  return rows[0]?.student_id || null;
};

const findOrCreateClassIdByNameOrCode = async (className?: string | null, classCode?: string | null, centerId?: number, client: any = db) => {
  const existingClassId = await findClassIdByNameOrCode(className, classCode, centerId, client);
  if (existingClassId || !centerId) return existingClassId;

  const normalizedClassName = normalizeClassText(className) || normalizeClassText(classCode);
  if (!normalizedClassName) return null;

  const baseCode = normalizeClassCode(classCode || normalizedClassName);
  const candidates = [baseCode, `${baseCode}-${centerId}`];
  for (let index = 2; index <= 99; index += 1) candidates.push(`${baseCode}-${centerId}-${index}`);

  for (const candidate of candidates) {
    const existing = await findClassIdByNameOrCode(null, candidate, centerId, client);
    if (existing) continue;
    const rows = await client
      .insert(classes)
      .values({ centerId, className: normalizedClassName, classCode: candidate, paymentFrequency: 'Monthly' })
      .returning({ class_id: classes.classId });
    return rows[0]?.class_id || null;
  }

  return findClassIdByNameOrCode(normalizedClassName, null, centerId, client);
};

const studentValues = (params: any[], offset = 0) => ({
  centerId: params[offset + 0],
  enrollmentNumber: params[offset + 1],
  firstName: params[offset + 2],
  lastName: params[offset + 3],
  username: params[offset + 4],
  passwordHash: params[offset + 5],
  email: params[offset + 6],
  phone: params[offset + 7],
  dateOfBirth: params[offset + 8],
  parentName: params[offset + 9],
  parentPhone: params[offset + 10],
  gender: params[offset + 11],
  status: params[offset + 12],
  teacherId: params[offset + 13],
  classId: params[offset + 14],
  schoolName: params[offset + 15],
  schoolClass: params[offset + 16],
});

const teacherValues = (params: any[], offset = 0) => ({
  centerId: params[offset + 0],
  employeeId: params[offset + 1],
  firstName: params[offset + 2],
  lastName: params[offset + 3],
  email: params[offset + 4],
  phone: params[offset + 5],
  dateOfBirth: params[offset + 6],
  gender: params[offset + 7],
  qualification: params[offset + 8],
  specialization: params[offset + 9],
  salaryPercentage: params[offset + 10],
  status: params[offset + 11],
  username: params[offset + 12],
  passwordHash: params[offset + 13],
});

const classValues = (params: any[], offset = 0) => ({
  centerId: params[offset + 0],
  className: params[offset + 1],
  classCode: params[offset + 2],
  level: params[offset + 3],
  section: params[offset + 4],
  capacity: params[offset + 5],
  teacherId: params[offset + 6],
  roomNumber: params[offset + 7],
  startDate: params[offset + 8],
  endDate: params[offset + 9],
  paymentAmount: params[offset + 10],
  paymentFrequency: params[offset + 11],
});

const paymentValues = (params: any[], offset = 0) => ({
  studentId: params[offset + 0],
  centerId: params[offset + 1],
  paymentDate: params[offset + 2],
  amount: params[offset + 3],
  currency: params[offset + 4],
  paymentMethod: params[offset + 5],
  transactionReference: params[offset + 6],
  receiptNumber: params[offset + 7],
  paymentStatus: params[offset + 8],
  paymentType: params[offset + 9],
  notes: params[offset + 10],
  discountId: params[offset + 11],
  discountKind: params[offset + 12],
  discountValueType: params[offset + 13],
  discountValue: params[offset + 14],
  originalAmount: params[offset + 15],
  discountAmount: params[offset + 16],
  finalAmount: params[offset + 17],
  isComplete: params[offset + 18] ?? true,
});

const upsertById = async (table: any, idColumn: any, idKey: string, id: number | null, values: any, client: any = db) => {
  if (id) {
    const existing = await client.select({ id: idColumn }).from(table).where(eq(idColumn, id)).limit(1);
    if (existing[0]) {
      await client.update(table).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(idColumn, id));
      return;
    }
    await client.insert(table).values({ [idKey]: id, ...values });
    return;
  }
  await client.insert(table).values(values);
};

const insertStudent = async (params: any[], client: any = db) => {
  const existingId = await findStudentIdByEnrollmentNumber(params[1], params[0], client);
  if (existingId) return client.update(students).set({ ...studentValues(params), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(students.studentId, existingId));
  return client.insert(students).values(studentValues(params));
};

const insertTeacher = async (params: any[], client: any = db) => {
  const existingId = await findTeacherIdByEmployeeId(params[1], params[0], client);
  if (existingId) return client.update(teachers).set({ ...teacherValues(params), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(teachers.teacherId, existingId));
  return client.insert(teachers).values(teacherValues(params));
};

const upsertClassByCode = async (params: any[], client: any = db) => {
  const existingId = await findClassIdByNameOrCode(null, params[2], params[0], client);
  if (existingId) return client.update(classes).set({ ...classValues(params), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(classes.classId, existingId));
  return client.insert(classes).values(classValues(params));
};

const insertPayment = async (params: any[], client: any = db) => {
  if (params[7]) {
    const existing = await client
      .select({ payment_id: payments.paymentId })
      .from(payments)
      .where(and(eq(payments.receiptNumber, params[7]), isNull(payments.deletedAt)))
      .limit(1);
    if (existing[0]) return client.update(payments).set({ ...paymentValues(params), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(payments.paymentId, existing[0].payment_id));
  }
  return client.insert(payments).values(paymentValues(params));
};

const upsertSerialDiscount = async (params: any[], client: any = db) => {
  const [studentId, centerId, discountType, value, originalPrice, finalPrice, reason] = params;
  const existing = await client
    .select({ discount_id: discounts.discountId })
    .from(discounts)
    .where(and(eq(discounts.studentId, studentId), eq(discounts.discountKind, 'serial_discount'), eq(discounts.active, true)))
    .limit(1);
  if (existing[0]) {
    return client
      .update(discounts)
      .set({ centerId, discountType, value, originalPrice, finalPrice, reason, active: true, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(discounts.discountId, existing[0].discount_id));
  }
  return client.insert(discounts).values({
    studentId,
    centerId,
    discountType,
    discountKind: 'serial_discount',
    value,
    originalPrice,
    finalPrice,
    reason,
    startDate: sql`CURRENT_DATE`,
    active: true,
  });
};

const insertRoom = (params: any[], client: any = db) =>
  client.insert(rooms).values({ centerId: params[0], roomNumber: params[1], classId: params[2], day: params[3], time: params[4], endTime: params[5] });

const insertAssignment = (params: any[], client: any = db) =>
  client.insert(assignments).values({
    centerId: params[0],
    classId: params[1],
    studentId: params[2],
    teacherId: params[3],
    assignmentTitle: params[4],
    description: params[5],
    dueDate: params[6],
    submissionDate: params[7],
    status: params[8],
    grade: params[9],
  });

const insertSubject = async (params: any[], client: any = db) => {
  const existing = params[3]
    ? await client
        .select({ subject_id: subjects.subjectId })
        .from(subjects)
        .where(and(eq(subjects.centerId, params[0]), eq(subjects.classId, params[1]), ilike(sql`TRIM(COALESCE(${subjects.subjectCode}, ''))`, normalizeClassText(params[3]))))
        .limit(1)
    : [];
  const values = {
    centerId: params[0],
    classId: params[1],
    subjectName: params[2],
    subjectCode: params[3],
    teacherId: params[4],
    totalMarks: params[5],
    passingMarks: params[6],
  };
  if (existing[0]) return client.update(subjects).set(values).where(eq(subjects.subjectId, existing[0].subject_id));
  return client.insert(subjects).values(values);
};

const upsertStudent = (params: any[], hasStudentId: boolean, client: any = db) => {
  if (!hasStudentId) return insertStudent(params, client);
  return upsertById(students, students.studentId, 'studentId', params[0], studentValues(params, 1), client);
};

const upsertTeacher = (params: any[], hasTeacherId: boolean, client: any = db) => {
  if (!hasTeacherId) return insertTeacher(params, client);
  return upsertById(teachers, teachers.teacherId, 'teacherId', params[0], teacherValues(params, 1), client);
};

const upsertPayment = (params: any[], hasPaymentId: boolean, client: any = db) => {
  if (!hasPaymentId) return insertPayment(params, client);
  return upsertById(payments, payments.paymentId, 'paymentId', params[0], paymentValues(params, 1), client);
};

const upsertRoom = async (params: any[], hasRoomId: boolean, client: any = db) => {
  if (!hasRoomId) return insertRoom(params, client);
  return upsertById(rooms, rooms.roomId, 'roomId', params[0], {
    centerId: params[1],
    roomNumber: params[2],
    classId: params[3],
    day: params[4],
    time: params[5],
    endTime: params[6],
  }, client);
};

const upsertAssignment = (params: any[], hasAssignmentId: boolean, client: any = db) => {
  if (!hasAssignmentId) return insertAssignment(params, client);
  return upsertById(assignments, assignments.assignmentId, 'assignmentId', params[0], {
    centerId: params[1],
    classId: params[2],
    studentId: params[3],
    teacherId: params[4],
    assignmentTitle: params[5],
    description: params[6],
    dueDate: params[7],
    submissionDate: params[8],
    status: params[9],
    grade: params[10],
  }, client);
};

const upsertSubject = (params: any[], hasSubjectId: boolean, client: any = db) => {
  if (!hasSubjectId) return insertSubject(params, client);
  return upsertById(subjects, subjects.subjectId, 'subjectId', params[0], {
    centerId: params[1],
    classId: params[2],
    subjectName: params[3],
    subjectCode: params[4],
    teacherId: params[5],
    totalMarks: params[6],
    passingMarks: params[7],
  }, client);
};

const syncSerialSequence = (table: string, idColumn: string, client: any = db) =>
  client.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${table}', '${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1), true)`));

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
  upsertSerialDiscount,
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
  withTransaction: (callback: (tx: any) => Promise<any>) => db.transaction(callback),
};

export {};
