const { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lte, ne, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { centers, classes, discounts, parentStudents, payments, students, studentAcquisitionSources, studentActionReasons, subjects, teachers } = require('../../../db/schema');
const { effectiveEndDate } = require('../../discounts/repositories/discount.repository');
const { buildTransferAllocation, toDateOnly, todayInCenterTimeZone } = require('../../../utils/transferAllocation');

const db = pool.db;

const listAcquisitionSources = () => db.select({
  source_id: studentAcquisitionSources.sourceId,
  source_code: studentAcquisitionSources.sourceCode,
  source_name: studentAcquisitionSources.sourceName,
}).from(studentAcquisitionSources).where(eq(studentAcquisitionSources.active, true)).orderBy(asc(studentAcquisitionSources.sourceName));

const createAcquisitionSource = async (name: string) => {
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || `source_${Date.now()}`;
  const rows = await db.insert(studentAcquisitionSources).values({ sourceCode: code, sourceName: name.trim(), active: true }).onConflictDoUpdate({ target: studentAcquisitionSources.sourceCode, set: { sourceName: name.trim(), active: true } }).returning({ source_id: studentAcquisitionSources.sourceId, source_code: studentAcquisitionSources.sourceCode, source_name: studentAcquisitionSources.sourceName });
  return rows[0];
};

const listActionReasons = (reasonType: string) => db.select({
  reason_id: studentActionReasons.reasonId,
  reason_type: studentActionReasons.reasonType,
  reason_code: studentActionReasons.reasonCode,
  reason_name: studentActionReasons.reasonName,
  needs_note: studentActionReasons.needsNote,
}).from(studentActionReasons).where(and(eq(studentActionReasons.reasonType, reasonType), eq(studentActionReasons.active, true))).orderBy(sql`${studentActionReasons.sortOrder} NULLS LAST`, asc(studentActionReasons.reasonName));

const findActionReason = async (reasonId: number) => {
  const rows = await db.select({ reason_id: studentActionReasons.reasonId, reason_type: studentActionReasons.reasonType, needs_note: studentActionReasons.needsNote })
    .from(studentActionReasons).where(eq(studentActionReasons.reasonId, reasonId)).limit(1);
  return rows[0] || null;
};

const createActionReason = async (reasonType: string, name: string) => {
  const code = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || `reason_${Date.now()}`;
  const rows = await db.insert(studentActionReasons).values({ reasonType, reasonCode: code, reasonName: name.trim(), active: true }).onConflictDoUpdate({ target: [studentActionReasons.reasonType, studentActionReasons.reasonCode], set: { reasonName: name.trim(), active: true } }).returning({ reason_id: studentActionReasons.reasonId, reason_type: studentActionReasons.reasonType, reason_code: studentActionReasons.reasonCode, reason_name: studentActionReasons.reasonName });
  return rows[0];
};

interface StudentListFilters {
  q?: string;
  school_name?: string;
  class_id?: number;
  subject_id?: number;
  level?: number;
  address?: string;
  age?: number;
  gender?: string;
  status?: string;
  teacher_id?: number;
  page?: number;
  limit?: number;
}

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
  previous_class_id: students.previousClassId,
  transferred_from_student_id: students.transferredFromStudentId,
  main_student_id: students.mainStudentId,
  start_date: students.startDate,
  end_date: students.endDate,
  school_name: students.schoolName,
  school_class: students.schoolClass,
  father_name: students.fatherName,
  passport_number: students.passportNumber,
  study_place_type: students.studyPlaceType,
  previous_school: students.previousSchool,
  is_frozen: students.isFrozen,
  coins: students.coins,
  acquisition_source_id: students.acquisitionSourceId,
  acquisition_detail: students.acquisitionDetail,
  referred_by_teacher_id: students.referredByTeacherId,
  deleted_at: students.deletedAt,
  created_at: students.createdAt,
  updated_at: students.updatedAt,
};

const studentInsertValues = (payload: Record<string, unknown>) => ({
  centerId: payload.center_id,
  enrollmentNumber: payload.enrollment_number,
  firstName: payload.first_name,
  lastName: payload.last_name,
  username: payload.username,
  passwordHash: payload.password_hash,
  email: payload.email,
  phone: payload.phone,
  dateOfBirth: payload.date_of_birth,
  parentName: payload.parent_name,
  parentPhone: payload.parent_phone,
  gender: payload.gender,
  status: payload.status || 'Active',
  teacherId: payload.teacher_id,
  classId: payload.class_id,
  schoolName: payload.school_name,
  schoolClass: payload.school_class,
  fatherName: payload.father_name,
  passportNumber: payload.passport_number,
  studyPlaceType: payload.study_place_type,
  previousSchool: payload.previous_school,
  isFrozen: payload.is_frozen ?? false,
  acquisitionSourceId: payload.acquisition_source_id,
  acquisitionDetail: payload.acquisition_detail,
  referredByTeacherId: payload.referred_by_teacher_id,
});

const effectiveTeacherExpr = sql`COALESCE(${classes.teacherId}, ${students.teacherId})`;

const matchesTeacher = (teacherId: number) => or(
  eq(classes.teacherId, teacherId),
  eq(students.teacherId, teacherId),
);

// A transferred-out record stays on its old group's roster until the month it ended is over.
// Records transferred before end dates existed have no end_date and keep showing as before.
const stillOnOldRoster = () => {
  const today = todayInCenterTimeZone();
  const currentMonthStart = toDateOnly(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  return or(isNull(students.status), ne(students.status, 'Transferred'), isNull(students.endDate), gte(students.endDate, currentMonthStart));
};

// One child in several groups has one record per group. The main record (main_student_id IS
// NULL) holds the login; the other group records point at it. This resolves any record id to
// its main record's id inside SQL, so login-related writes always land on the main record.
const mainIdExpr = (id: number) =>
  sql`COALESCE((SELECT linked.main_student_id FROM students linked WHERE linked.student_id = ${id}), ${id})`;

const isLinkedTo = (mainId: number) => or(eq(students.studentId, mainId), eq(students.mainStudentId, mainId));

const findMainId = async (queryable: any, id: number) => {
  const rows = await queryable
    .select({ student_id: students.studentId, main_student_id: students.mainStudentId })
    .from(students)
    .where(eq(students.studentId, id))
    .limit(1);
  const row = rows[0];
  return row ? Number(row.main_student_id || row.student_id) : null;
};

const copyParentLinks = async (tx: any, fromStudentId: number, toStudentId: number) => {
  const links = await tx
    .select({
      parentId: parentStudents.parentId,
      relationship: parentStudents.relationship,
      isPrimary: parentStudents.isPrimary,
    })
    .from(parentStudents)
    .where(eq(parentStudents.studentId, fromStudentId));

  for (const link of links) {
    const existing = await tx
      .select({ parentId: parentStudents.parentId })
      .from(parentStudents)
      .where(and(eq(parentStudents.parentId, link.parentId), eq(parentStudents.studentId, toStudentId)))
      .limit(1);
    if (!existing[0]) {
      await tx.insert(parentStudents).values({
        parentId: link.parentId,
        studentId: toStudentId,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      });
    }
  }
};

// When the main record leaves (removed or transferred out), the oldest remaining active group
// record takes over the login and the coin balance, and the other records re-point to it.
const handOverMainRecord = async (tx: any, oldMain: any) => {
  const candidates = await tx
    .select({ student_id: students.studentId })
    .from(students)
    .where(and(eq(students.mainStudentId, oldMain.student_id), isNull(students.deletedAt), ne(students.status, 'Transferred')))
    .orderBy(asc(students.studentId))
    .limit(1);
  const nextMainId = candidates[0]?.student_id;
  if (!nextMainId) return null;

  // Free the login first: the active-username index would reject two records holding it.
  await tx
    .update(students)
    .set({ username: null, passwordHash: null, coins: 0, mainStudentId: nextMainId, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(students.studentId, oldMain.student_id));
  await tx
    .update(students)
    .set({ mainStudentId: nextMainId, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(students.mainStudentId, oldMain.student_id), ne(students.studentId, nextMainId)));
  await tx
    .update(students)
    .set({
      mainStudentId: null,
      username: oldMain.username ?? null,
      passwordHash: oldMain.password_hash ?? null,
      coins: sql`COALESCE(${students.coins}, 0) + ${Number(oldMain.coins || 0)}`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(students.studentId, nextMainId));
  return nextMainId;
};

const addStudentFilters = (filters: StudentListFilters = {}, centerId?: number, teacherId?: number) => {
  const conditions: any[] = [isNull(students.deletedAt)];
  // A transferred-out student keeps a row in their old class (status='Transferred', deletedAt
  // stays null) so the old group's roster still shows them - marked as transferred - until an
  // owner/superuser explicitly deletes it. That row is only hidden from the general (no class
  // filter) student list; filtering by that specific class_id, or asking for status=Transferred
  // explicitly, should surface it.
  const hasSpecificClassFilter = filters.class_id != null && Number(filters.class_id) !== -1;
  const wantsTransferredStatus = String(filters.status || '').trim().toLowerCase() === 'transferred';
  if (!hasSpecificClassFilter && !wantsTransferredStatus) {
    conditions.push(or(isNull(students.status), ne(students.status, 'Transferred')));
  }
  if (centerId) conditions.push(eq(students.centerId, centerId));

  if (teacherId) {
    conditions.push(matchesTeacher(teacherId));
  } else if (filters.teacher_id != null) {
    conditions.push(matchesTeacher(filters.teacher_id));
  }

  const search = String(filters.q || '').trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(students.firstName, pattern),
        ilike(students.lastName, pattern),
        ilike(sql`CONCAT_WS(' ', ${students.firstName}, ${students.lastName})`, pattern),
        ilike(students.enrollmentNumber, pattern),
        ilike(students.email, pattern),
        ilike(students.phone, pattern),
        ilike(students.parentName, pattern),
        ilike(students.schoolName, pattern),
        ilike(students.schoolClass, pattern)
      )
    );
  }

  const schoolName = String(filters.school_name || '').trim();
  if (schoolName) conditions.push(eq(students.schoolName, schoolName));

  if (filters.class_id != null) {
    if (Number(filters.class_id) === -1) conditions.push(isNull(students.classId));
    // A group's student list shows only the students in it now; a student transferred out is
    // listed in their new group (their old record still counts for the old teacher's salary).
    else conditions.push(eq(students.classId, filters.class_id), wantsTransferredStatus ? stillOnOldRoster() : or(isNull(students.status), ne(students.status, 'Transferred')));
  }

  if (filters.subject_id != null) conditions.push(eq(subjects.subjectId, filters.subject_id));
  if (filters.level != null) conditions.push(eq(classes.level, filters.level));

  const address = String(filters.address || '').trim();
  if (address) conditions.push(eq(centers.address, address));

  if (filters.age != null) conditions.push(eq(sql`DATE_PART('year', AGE(CURRENT_DATE, ${students.dateOfBirth}))`, filters.age));

  const gender = String(filters.gender || '').trim();
  if (gender) conditions.push(eq(students.gender, gender));

  const status = String(filters.status || '').trim();
  if (status) conditions.push(eq(students.status, status));
  return conditions;
};

const findAllWithClass = async (centerId?: number, teacherId?: number) =>
  db
    .select({
      ...studentSelection,
      class_name: classes.className,
      class_teacher_id: classes.teacherId,
      effective_teacher_id: effectiveTeacherExpr,
    })
    .from(students)
    .leftJoin(classes, and(eq(students.classId, classes.classId), isNull(classes.deletedAt)))
    .where(and(...addStudentFilters({}, centerId, teacherId)))
    .orderBy(asc(students.studentId));

const findPaginatedWithClass = async (filters: StudentListFilters = {}, centerId?: number, teacherId?: number) => {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const offset = (page - 1) * limit;
  const conditions = addStudentFilters(filters, centerId, teacherId);

  const baseJoins = (query: any) =>
    query
      .leftJoin(classes, and(eq(students.classId, classes.classId), isNull(classes.deletedAt)))
      .leftJoin(centers, eq(students.centerId, centers.centerId))
      .leftJoin(subjects, eq(subjects.classId, classes.classId));

  const [countRows, rows] = await Promise.all([
    baseJoins(db.select({ total: sql`COUNT(DISTINCT ${students.studentId})::int` }).from(students)).where(and(...conditions)),
    baseJoins(
      db
        .selectDistinct({
          ...studentSelection,
          class_name: classes.className,
          class_level: classes.level,
          class_teacher_id: classes.teacherId,
          effective_teacher_id: effectiveTeacherExpr,
          center_address: centers.address,
        })
        .from(students)
    )
      .where(and(...conditions))
      .orderBy(desc(students.studentId))
      .limit(limit)
      .offset(offset),
  ]);
  return { data: rows, total: Number((countRows[0] as any)?.total || 0), page, limit };
};

const findByIdWithClass = async (id: number, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(effectiveTeacherExpr, teacherId));

  const rows = await db
    .select({
      ...studentSelection,
      class_name: classes.className,
      is_discounted: sql`EXISTS (
        SELECT 1 FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
      )`,
      discount_kind: sql`(
        SELECT d.discount_kind FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_value_type: sql`(
        SELECT d.discount_type FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_value: sql`(
        SELECT d.value FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_original_price: sql`(
        SELECT d.original_price FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_reason: sql`(
        SELECT d.reason FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_end_date: sql`(
        SELECT ${effectiveEndDate('d')}::text FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (${effectiveEndDate('d')} IS NULL OR ${effectiveEndDate('d')} >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_reason_category: sql`(
        SELECT d.reason_category FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_referrer_name: sql`(
        SELECT d.referrer_name FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
    })
    .from(students)
    .leftJoin(classes, and(eq(students.classId, classes.classId), isNull(classes.deletedAt)))
    .where(and(...conditions));
  return rows[0] || null;
};

const findDeletedWithClassAndTeacher = async (centerId?: number) => {
  const conditions: any[] = [isNotNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  return db
    .select({
      ...studentSelection,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      teacher_employee_id: teachers.employeeId,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.classId))
    .leftJoin(teachers, eq(students.teacherId, teachers.teacherId))
    .where(and(...conditions))
    .orderBy(desc(students.deletedAt), desc(students.studentId));
};

// Billing and lesson pages need a transferred-out student for the days they were still in the
// group; student lists pass excludeTransferred to show only who is in the group now.
const findByClassIncludingTransferred = async (classId: number, centerId?: number, teacherId?: number, excludeTransferred = false) => {
  const conditions: any[] = excludeTransferred
    ? [eq(students.classId, classId), isNull(students.deletedAt), or(isNull(students.status), ne(students.status, 'Transferred'))]
    : [eq(students.classId, classId), or(isNull(students.deletedAt), eq(students.status, 'Transferred')), stillOnOldRoster()];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(effectiveTeacherExpr, teacherId));

  return db
    .select({
      ...studentSelection,
      class_name: classes.className,
      class_teacher_id: classes.teacherId,
      effective_teacher_id: effectiveTeacherExpr,
      class_payment_amount: classes.paymentAmount,
      payment_amount_this_month: sql`COALESCE((
        SELECT SUM(CASE WHEN LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid') THEN p.amount ELSE 0 END)
        FROM ${payments} p
        WHERE p.student_id = ${students.studentId}
          AND p.deleted_at IS NULL
          AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
          AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
      ), 0)::numeric`,
      payment_count_this_month: sql`COALESCE((
        SELECT COUNT(*) FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid'))
        FROM ${payments} p
        WHERE p.student_id = ${students.studentId}
          AND p.deleted_at IS NULL
          AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
          AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
      ), 0)::int`,
      paid_this_month: sql`COALESCE((
        SELECT COUNT(*) FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid'))
        FROM ${payments} p
        WHERE p.student_id = ${students.studentId}
          AND p.deleted_at IS NULL
          AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
          AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
      ), 0)::int > 0`,
      last_payment_date_this_month: sql`(
        SELECT MAX(p.payment_date) FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid'))
        FROM ${payments} p
        WHERE p.student_id = ${students.studentId}
          AND p.deleted_at IS NULL
          AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
          AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
      )`,
      payment_status_this_month: sql`(
        SELECT (ARRAY_AGG(p.payment_status ORDER BY p.payment_date DESC, p.payment_id DESC)
          FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid')))[1]
        FROM ${payments} p
        WHERE p.student_id = ${students.studentId}
          AND p.deleted_at IS NULL
          AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
          AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
      )`,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.classId))
    .where(and(...conditions))
    .orderBy(sql`CASE WHEN ${students.status} = 'Transferred' THEN 1 ELSE 0 END`, asc(students.studentId));
};

const insert = async (payload: Record<string, unknown>) => {
  const rows = await db.insert(students).values(studentInsertValues(payload)).returning(studentSelection);
  return rows[0];
};

const update = async (id: number, payload: Record<string, unknown>, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));

  const setData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  const mapping: Record<string, string> = {
    enrollment_number: 'enrollmentNumber',
    first_name: 'firstName',
    last_name: 'lastName',
    username: 'username',
    email: 'email',
    phone: 'phone',
    date_of_birth: 'dateOfBirth',
    parent_name: 'parentName',
    parent_phone: 'parentPhone',
    gender: 'gender',
    status: 'status',
    class_id: 'classId',
    teacher_id: 'teacherId',
    is_frozen: 'isFrozen',
    school_name: 'schoolName',
    school_class: 'schoolClass',
    father_name: 'fatherName',
    passport_number: 'passportNumber',
    study_place_type: 'studyPlaceType',
    previous_school: 'previousSchool',
    acquisition_source_id: 'acquisitionSourceId',
    acquisition_detail: 'acquisitionDetail',
    referred_by_teacher_id: 'referredByTeacherId',
  };
  for (const [snake, camel] of Object.entries(mapping)) {
    if (payload[snake] !== undefined && payload[snake] !== null) setData[camel] = payload[snake];
  }
  // Only the main record carries a login; a group record keeps its (empty) username.
  if (setData.username !== undefined) {
    setData.username = sql`CASE WHEN ${students.mainStudentId} IS NULL THEN ${setData.username} ELSE ${students.username} END`;
  }

  const rows = await db.update(students).set(setData).where(and(...conditions)).returning(studentSelection);
  return rows[0] || null;
};

const remove = async (id: number, reasonId: number, centerId?: number, teacherId?: number, reasonNote: string | null = null) => {
  const conditions = [eq(students.studentId, id), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  return db.transaction(async (tx: any) => {
    const rows = await tx
      .update(students)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, status: 'Removed', deleteReasonId: reasonId, deleteReasonNote: reasonNote, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(...conditions))
      .returning({ ...studentSelection, password_hash: students.passwordHash });
    const removed = rows[0];
    if (!removed) return null;
    if (!removed.main_student_id) await handOverMainRecord(tx, removed);
    const { password_hash: _passwordHash, ...rest } = removed;
    return rest;
  });
};

const purge = async (id: number, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNotNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  const rows = await db.delete(students).where(and(...conditions)).returning(studentSelection);
  return rows[0] || null;
};

const transferToClass = async (id: number, targetClassId: number, reasonId: number, centerId?: number, teacherId?: number) =>
  db.transaction(async (tx: any) => {
    const sourceConditions = [eq(students.studentId, id), isNull(students.deletedAt), ne(students.status, 'Transferred')];
    if (centerId) sourceConditions.push(eq(students.centerId, centerId));
    if (teacherId) sourceConditions.push(eq(students.teacherId, teacherId));

    const sourceRows = await tx
      .select({
        ...studentSelection,
        source_password_hash: students.passwordHash,
        source_payment_amount: classes.paymentAmount,
      })
      .from(students)
      .leftJoin(classes, eq(classes.classId, students.classId))
      .where(and(...sourceConditions))
      .limit(1);
    const source = sourceRows[0];
    if (!source) return { error: 'not_found' as const };

    const targetConditions = [eq(classes.classId, targetClassId), isNull(classes.deletedAt), eq(classes.centerId, centerId || source.center_id)];
    const targetRows = await tx
      .select({
        class_id: classes.classId,
        center_id: classes.centerId,
        teacher_id: classes.teacherId,
        payment_amount: classes.paymentAmount,
      })
      .from(classes)
      .where(and(...targetConditions))
      .limit(1);
    const targetClass = targetRows[0];
    if (!targetClass) return { error: 'target_class_not_found' as const };
    if (Number(source.class_id) === Number(targetClass.class_id)) return { error: 'same_class' as const };

    const sourceMainId = Number(source.main_student_id || source.student_id);
    const linkedInTarget = await tx
      .select({ student_id: students.studentId })
      .from(students)
      .where(and(isLinkedTo(sourceMainId), eq(students.classId, targetClass.class_id), isNull(students.deletedAt), ne(students.status, 'Transferred')))
      .limit(1);
    if (linkedInTarget[0]) return { error: 'already_in_group' as const };

    const transferDate = todayInCenterTimeZone();
    const transferredRows = await tx
      .update(students)
      .set({
        status: 'Transferred',
        deletedAt: null,
        transferReasonId: reasonId,
        endDate: toDateOnly(new Date(transferDate.getTime() - 24 * 60 * 60 * 1000)),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(students.studentId, id))
      .returning(studentSelection);

    const newStudentRows = await tx
      .insert(students)
      .values({
        centerId: targetClass.center_id,
        enrollmentNumber: source.enrollment_number,
        firstName: source.first_name,
        lastName: source.last_name,
        username: source.username,
        passwordHash: source.source_password_hash,
        email: source.email,
        phone: source.phone,
        dateOfBirth: source.date_of_birth,
        parentName: source.parent_name,
        parentPhone: source.parent_phone,
        gender: source.gender,
        status: 'Active',
        teacherId: targetClass.teacher_id || null,
        classId: targetClass.class_id,
        previousClassId: source.class_id,
        transferredFromStudentId: id,
        mainStudentId: source.main_student_id ?? null,
        startDate: toDateOnly(transferDate),
        schoolName: source.school_name,
        schoolClass: source.school_class,
        fatherName: source.father_name,
        passportNumber: source.passport_number,
        studyPlaceType: source.study_place_type,
        previousSchool: source.previous_school,
        acquisitionSourceId: source.acquisition_source_id,
        acquisitionDetail: source.acquisition_detail,
        referredByTeacherId: source.referred_by_teacher_id,
        isFrozen: source.is_frozen ?? false,
        coins: Number(source.coins || 0),
      })
      .returning(studentSelection);
    const newStudent = newStudentRows[0];

    // The new record already carries the login; the student's other group records follow it.
    if (!source.main_student_id) {
      await tx
        .update(students)
        .set({ mainStudentId: newStudent.student_id, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(students.mainStudentId, id));
    }

    const monthStart = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth() + 1, 0));
    const paidRows = await tx
      .select({ paid_amount: sql`COALESCE(SUM(${payments.amount}), 0)::numeric` })
      .from(payments)
      .where(
        and(
          eq(payments.studentId, id),
          eq(payments.centerId, source.center_id),
          isNull(payments.deletedAt),
          sql`LOWER(${payments.paymentStatus}) IN ('completed', 'paid')`,
          // Includes money an earlier transfer this month moved onto this record.
          gte(payments.paymentDate, toDateOnly(monthStart)),
          lte(payments.paymentDate, toDateOnly(monthEnd))
        )
      );
    const allocation = buildTransferAllocation(source.source_payment_amount, targetClass.payment_amount, (paidRows[0] as any)?.paid_amount, transferDate, source.start_date);

    const insertTransferPayment = (studentId: number, amount: number, reference: string, notes: string, center: number) =>
      tx.insert(payments).values({
        studentId,
        centerId: center,
        paymentDate: toDateOnly(allocation.effectiveDate),
        amount,
        currency: 'UZS',
        paymentMethod: 'Cash',
        transactionReference: reference,
        receiptNumber: null,
        paymentStatus: 'Completed',
        paymentType: 'Transfer Adjustment',
        notes,
        transferSourceStudentId: id,
        transferTargetStudentId: newStudent.student_id,
        transferSourceClassId: source.class_id,
        transferTargetClassId: targetClass.class_id,
        transferEffectiveDate: toDateOnly(allocation.effectiveDate),
        coveredFrom: toDateOnly(allocation.effectiveDate),
        coveredTo: toDateOnly(allocation.monthEnd),
        coverageDays: allocation.targetDays,
        coverageTotalDays: allocation.totalDays,
      });

    // The same amount leaves the old record and lands on the new one, so the student's total
    // paid never changes; the old group keeps exactly what it earned for the days it taught.
    if (allocation.movedAmount > 0) {
      await insertTransferPayment(
        id,
        -allocation.movedAmount,
        `TRANSFER-${id}-${newStudent.student_id}-SOURCE`,
        `Transfer credit: ${allocation.sourceDays}/${allocation.totalDays} days kept in previous group`,
        source.center_id
      );
      await insertTransferPayment(
        newStudent.student_id,
        allocation.movedAmount,
        `TRANSFER-${id}-${newStudent.student_id}-TARGET`,
        `Transfer credit: ${allocation.targetDays}/${allocation.totalDays} days in new group`,
        targetClass.center_id
      );
    }

    await copyParentLinks(tx, id, newStudent.student_id);

    return {
      transferred: transferredRows[0],
      student: newStudent,
      payment_allocation: {
        applied: allocation.movedAmount > 0,
        transfer_date: toDateOnly(allocation.effectiveDate),
        paid_amount: allocation.paidAmount,
        source_monthly_amount: allocation.sourceMonthly,
        target_monthly_amount: allocation.targetMonthly,
        source_days: allocation.sourceDays,
        target_days: allocation.targetDays,
        total_days: allocation.totalDays,
        source_earned_amount: allocation.sourceEarned,
        moved_amount: allocation.movedAmount,
        target_charge_amount: allocation.targetCharge,
        target_balance: allocation.targetBalance,
      },
    };
  });

const findLinkedGroups = async (id: number, centerId?: number) => {
  const mainId = await findMainId(db, id);
  if (!mainId) return [];
  const conditions: any[] = [isLinkedTo(mainId), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  return db
    .select({
      ...studentSelection,
      class_name: classes.className,
      class_payment_amount: classes.paymentAmount,
      effective_teacher_id: effectiveTeacherExpr,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      is_main: sql`${students.mainStudentId} IS NULL`,
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, effectiveTeacherExpr))
    .where(and(...conditions))
    .orderBy(sql`CASE WHEN ${students.mainStudentId} IS NULL THEN 0 ELSE 1 END`, asc(students.studentId));
};

// Adds the child to another group as a new record that points at their main record. The new
// record copies the profile and parent links but not the login, so the child keeps signing in
// with the same username and password and sees every group from there.
const assignToGroup = async (id: number, targetClassId: number, centerId?: number) =>
  db.transaction(async (tx: any) => {
    const mainId = await findMainId(tx, id);
    if (!mainId) return { error: 'not_found' as const };

    const mainConditions = [eq(students.studentId, mainId), isNull(students.deletedAt), ne(students.status, 'Transferred')];
    if (centerId) mainConditions.push(eq(students.centerId, centerId));
    const mainRows = await tx.select(studentSelection).from(students).where(and(...mainConditions)).limit(1);
    const main = mainRows[0];
    if (!main) return { error: 'not_found' as const };

    const targetRows = await tx
      .select({ class_id: classes.classId, center_id: classes.centerId, teacher_id: classes.teacherId })
      .from(classes)
      .where(and(eq(classes.classId, targetClassId), isNull(classes.deletedAt), eq(classes.centerId, main.center_id)))
      .limit(1);
    const targetClass = targetRows[0];
    if (!targetClass) return { error: 'target_class_not_found' as const };

    const existing = await tx
      .select({ student_id: students.studentId })
      .from(students)
      .where(and(isLinkedTo(mainId), eq(students.classId, targetClass.class_id), isNull(students.deletedAt), ne(students.status, 'Transferred')))
      .limit(1);
    if (existing[0]) return { error: 'already_in_group' as const };

    const insertedRows = await tx
      .insert(students)
      .values({
        centerId: main.center_id,
        enrollmentNumber: `${main.enrollment_number || mainId}-G${targetClass.class_id}`,
        firstName: main.first_name,
        lastName: main.last_name,
        username: null,
        passwordHash: null,
        email: main.email,
        phone: main.phone,
        dateOfBirth: main.date_of_birth,
        parentName: main.parent_name,
        parentPhone: main.parent_phone,
        gender: main.gender,
        status: 'Active',
        teacherId: targetClass.teacher_id || null,
        classId: targetClass.class_id,
        mainStudentId: mainId,
        schoolName: main.school_name,
        schoolClass: main.school_class,
        fatherName: main.father_name,
        passportNumber: main.passport_number,
        studyPlaceType: main.study_place_type,
        previousSchool: main.previous_school,
        acquisitionSourceId: main.acquisition_source_id,
        acquisitionDetail: main.acquisition_detail,
        referredByTeacherId: main.referred_by_teacher_id,
        isFrozen: false,
        coins: 0,
      })
      .returning(studentSelection);
    const student = insertedRows[0];

    await copyParentLinks(tx, mainId, student.student_id);
    return { student, main_student_id: mainId };
  });

const findByUsername = async (username: string) => {
  const rows = await db
    .select({
      student_id: students.studentId,
      first_name: students.firstName,
      last_name: students.lastName,
      email: students.email,
      password_hash: students.passwordHash,
      status: students.status,
      class_id: students.classId,
      center_id: students.centerId,
      is_frozen: students.isFrozen,
    })
    .from(students)
    .where(and(eq(students.username, username), isNull(students.deletedAt), ne(students.status, 'Transferred')));
  return rows[0] || null;
};

const findPasswordHashById = async (id: number) => {
  const rows = await db
    .select({ password_hash: students.passwordHash })
    .from(students)
    .where(and(eq(students.studentId, mainIdExpr(id)), isNull(students.deletedAt)));
  return rows[0]?.password_hash ?? null;
};

const setCredentials = async (id: number, username: string, password_hash: string, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, mainIdExpr(id)), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  const rows = await db
    .update(students)
    .set({ username, passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning({ student_id: students.studentId, username: students.username, email: students.email });
  return rows[0] || null;
};

const updatePasswordHash = async (id: number, password_hash: string) => {
  await db
    .update(students)
    .set({ passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(students.studentId, mainIdExpr(id)), isNull(students.deletedAt)));
};

// A child's before/after videos live on their main record, whichever group record is open.
const findVideos = async (id: number, centerId?: number) => {
  const mainId = await findMainId(db, id);
  if (!mainId) return null;
  const conditions: any[] = [eq(students.studentId, mainId), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  const rows = await db
    .select({ student_id: students.studentId, before_video_url: students.beforeVideoUrl, after_video_url: students.afterVideoUrl })
    .from(students)
    .where(and(...conditions))
    .limit(1);
  return rows[0] || null;
};

const saveVideos = async (id: number, videos: { before_video_url: string | null; after_video_url: string | null }, centerId?: number) => {
  const mainId = await findMainId(db, id);
  if (!mainId) return null;
  const conditions: any[] = [eq(students.studentId, mainId), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  const rows = await db
    .update(students)
    .set({ beforeVideoUrl: videos.before_video_url, afterVideoUrl: videos.after_video_url, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning({ student_id: students.studentId, before_video_url: students.beforeVideoUrl, after_video_url: students.afterVideoUrl });
  return rows[0] || null;
};

module.exports = {
  findActionReason,
  findVideos,
  saveVideos,
  listAcquisitionSources,
  createAcquisitionSource,
  listActionReasons,
  createActionReason,
  findAllWithClass,
  findPaginatedWithClass,
  findByIdWithClass,
  findDeletedWithClassAndTeacher,
  findByClassIncludingTransferred,
  insert,
  update,
  remove,
  purge,
  transferToClass,
  findLinkedGroups,
  assignToGroup,
  findByUsername,
  findPasswordHashById,
  setCredentials,
  updatePasswordHash,
};

export {};
