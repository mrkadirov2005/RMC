const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const {
  attendance,
  grades,
  parentStudents,
  parents,
  payments,
  students,
  testSubmissions,
} = require('../../../db/schema');

const db = pool.db;

const parentSafeSelection = {
  parent_id: parents.parentId,
  first_name: parents.firstName,
  last_name: parents.lastName,
  email: parents.email,
  phone: parents.phone,
  username: parents.username,
  status: parents.status,
  created_at: parents.createdAt,
};

const studentSelection = {
  student_id: students.studentId,
  center_id: students.centerId,
  enrollment_number: students.enrollmentNumber,
  first_name: students.firstName,
  last_name: students.lastName,
  username: students.username,
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
  created_at: students.createdAt,
  updated_at: students.updatedAt,
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

const attendanceSelection = {
  attendance_id: attendance.attendanceId,
  center_id: attendance.centerId,
  student_id: attendance.studentId,
  class_id: attendance.classId,
  session_id: attendance.sessionId,
  teacher_id: attendance.teacherId,
  attendance_date: attendance.attendanceDate,
  status: attendance.status,
  notes: attendance.notes,
  remarks: attendance.remarks,
  created_at: attendance.createdAt,
  updated_at: sql<string | null>`NULL`,
};

const gradeSelection = {
  grade_id: grades.gradeId,
  center_id: grades.centerId,
  student_id: grades.studentId,
  class_id: grades.classId,
  subject_id: grades.subjectId,
  session_id: grades.sessionId,
  teacher_id: grades.teacherId,
  subject: grades.subject,
  marks_obtained: grades.marksObtained,
  total_marks: grades.totalMarks,
  percentage: grades.percentage,
  grade_letter: grades.gradeLetter,
  academic_year: grades.academicYear,
  term: grades.term,
  score: grades.score,
  grade_type: grades.gradeType,
  attendance_score: grades.attendanceScore,
  homework_score: grades.homeworkScore,
  activity_score: grades.activityScore,
  points_score: grades.pointsScore,
  notes: grades.notes,
  created_at: grades.createdAt,
  updated_at: grades.updatedAt,
};

const testSubmissionSelection = {
  submission_id: testSubmissions.submissionId,
  test_id: testSubmissions.testId,
  student_id: testSubmissions.studentId,
  center_id: testSubmissions.centerId,
  score: testSubmissions.obtainedMarks,
  status: testSubmissions.status,
  created_at: testSubmissions.createdAt,
  updated_at: testSubmissions.updatedAt,
};

const scopedParentCondition = (id: number, centerId?: number) => {
  const conditions = [eq(parents.parentId, id)];
  if (centerId) {
    conditions.push(eq(students.centerId, centerId), isNull(students.deletedAt));
  }
  return conditions;
};

const findAllSafe = (centerId?: number) => {
  let query = db.selectDistinct(parentSafeSelection).from(parents);
  if (centerId) {
    query = query
      .innerJoin(parentStudents, eq(parentStudents.parentId, parents.parentId))
      .innerJoin(students, eq(students.studentId, parentStudents.studentId))
      .where(and(eq(students.centerId, centerId), isNull(students.deletedAt))) as any;
  }
  return query.orderBy(desc(parents.parentId));
};

const findByIdSafe = async (id: number, centerId?: number) => {
  let query: any = db.selectDistinct(parentSafeSelection).from(parents);
  if (centerId) {
    query = query
      .innerJoin(parentStudents, eq(parentStudents.parentId, parents.parentId))
      .innerJoin(students, eq(students.studentId, parentStudents.studentId));
  }
  const rows = await query.where(and(...scopedParentCondition(id, centerId)));
  return rows[0] || null;
};

const insert = (params: any[]) =>
  db
    .insert(parents)
    .values({
      firstName: params[0],
      lastName: params[1],
      email: params[2],
      phone: params[3],
      username: params[4],
      passwordHash: params[5],
      status: params[6],
    })
    .returning(parentSafeSelection)
    .then((rows: any[]) => rows[0]);

const update = async (id: number, params: any[], centerId?: number) => {
  if (centerId) {
    const existing = await findByIdSafe(id, centerId);
    if (!existing) return null;
  }
  const setData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  if (params[0] !== undefined) setData.firstName = params[0];
  if (params[1] !== undefined) setData.lastName = params[1];
  if (params[2] !== undefined) setData.email = params[2];
  if (params[3] !== undefined) setData.phone = params[3];
  if (params[4] !== undefined) setData.status = params[4];
  const rows = await db.update(parents).set(setData).where(eq(parents.parentId, id)).returning(parentSafeSelection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  if (centerId) {
    const existing = await findByIdSafe(id, centerId);
    if (!existing) return null;
  }
  const rows = await db.delete(parents).where(eq(parents.parentId, id)).returning({ parent_id: parents.parentId });
  return rows[0] || null;
};

const upsertParentStudent = async (params: any[]) => {
  const [parentId, studentId, relationship, isPrimary] = params;
  const existing = await db
    .select({ parent_id: parentStudents.parentId })
    .from(parentStudents)
    .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
  if (existing[0]) {
    return db
      .update(parentStudents)
      .set({ relationship, isPrimary, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, studentId)));
  }
  return db.insert(parentStudents).values({ parentId, studentId, relationship, isPrimary });
};

const updatePasswordHash = (id: number, password_hash: string) =>
  db
    .update(parents)
    .set({ passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(parents.parentId, id));

const findByUsernameLogin = (username: string) =>
  db
    .select({
      parent_id: parents.parentId,
      first_name: parents.firstName,
      last_name: parents.lastName,
      email: parents.email,
      password_hash: parents.passwordHash,
      status: parents.status,
    })
    .from(parents)
    .where(eq(parents.username, username))
    .then((rows: any[]) => rows[0] || null);

const findStudentsForParent = (parentId: number) =>
  db
    .select(studentSelection)
    .from(parentStudents)
    .innerJoin(students, eq(students.studentId, parentStudents.studentId))
    .where(and(eq(parentStudents.parentId, parentId), isNull(students.deletedAt)));

const findPaymentsForParent = (parentId: number) =>
  db
    .select(paymentSelection)
    .from(parentStudents)
    .innerJoin(payments, eq(payments.studentId, parentStudents.studentId))
    .innerJoin(students, eq(students.studentId, parentStudents.studentId))
    .where(and(eq(parentStudents.parentId, parentId), isNull(payments.deletedAt), isNull(students.deletedAt)))
    .orderBy(desc(payments.paymentDate));

const findAttendanceForParent = (parentId: number) =>
  db
    .select(attendanceSelection)
    .from(parentStudents)
    .innerJoin(attendance, eq(attendance.studentId, parentStudents.studentId))
    .innerJoin(students, eq(students.studentId, parentStudents.studentId))
    .where(and(eq(parentStudents.parentId, parentId), isNull(students.deletedAt)))
    .orderBy(desc(attendance.attendanceDate));

const findGradesForParent = (parentId: number) =>
  db
    .select(gradeSelection)
    .from(parentStudents)
    .innerJoin(grades, eq(grades.studentId, parentStudents.studentId))
    .innerJoin(students, eq(students.studentId, parentStudents.studentId))
    .where(and(eq(parentStudents.parentId, parentId), isNull(students.deletedAt)))
    .orderBy(desc(grades.academicYear), desc(grades.term));

const findTestSubmissionsForParent = (parentId: number) =>
  db
    .select(testSubmissionSelection)
    .from(parentStudents)
    .innerJoin(testSubmissions, eq(testSubmissions.studentId, parentStudents.studentId))
    .where(eq(parentStudents.parentId, parentId))
    .orderBy(desc(testSubmissions.createdAt));

module.exports = {
  findAllSafe,
  findByIdSafe,
  insert,
  update,
  remove,
  upsertParentStudent,
  updatePasswordHash,
  findByUsernameLogin,
  findStudentsForParent,
  findPaymentsForParent,
  findAttendanceForParent,
  findGradesForParent,
  findTestSubmissionsForParent,
};

export {};
