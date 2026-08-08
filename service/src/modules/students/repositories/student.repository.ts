const { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lte, ne, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { centers, classes, discounts, parentStudents, payments, students, studentAcquisitionSources, subjects, teachers } = require('../../../db/schema');

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

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const buildTransferAllocation = (source: any, targetClass: any, transferDate = new Date()) => {
  const sourceMonthly = Number(source.source_payment_amount || 0);
  const targetMonthly = Number(targetClass.payment_amount || 0);
  const monthStart = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth() + 1, 1));
  const monthEnd = new Date(nextMonthStart.getTime() - 24 * 60 * 60 * 1000);
  const effectiveDate = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), transferDate.getUTCDate()));
  const totalDays = monthEnd.getUTCDate();
  const transferDay = effectiveDate.getUTCDate();
  const sourceDays = Math.max(transferDay - 1, 0);
  const targetDays = Math.max(totalDays - sourceDays, 0);
  const sourceEarned = roundMoney((sourceMonthly * sourceDays) / totalDays);
  const sourceCredit = roundMoney(Math.max(sourceMonthly - sourceEarned, 0));
  const targetCharge = roundMoney((targetMonthly * targetDays) / totalDays);

  return {
    monthStart,
    monthEnd,
    effectiveDate,
    totalDays,
    sourceDays,
    targetDays,
    sourceMonthly,
    targetMonthly,
    sourceEarned,
    sourceCredit,
    targetCharge,
  };
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
  school_name: students.schoolName,
  school_class: students.schoolClass,
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
  isFrozen: payload.is_frozen ?? false,
  acquisitionSourceId: payload.acquisition_source_id,
  acquisitionDetail: payload.acquisition_detail,
  referredByTeacherId: payload.referred_by_teacher_id,
});

const effectiveTeacherExpr = sql`COALESCE(${classes.teacherId}, ${students.teacherId})`;

const addStudentFilters = (filters: StudentListFilters = {}, centerId?: number, teacherId?: number) => {
  const conditions: any[] = [isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));

  if (teacherId) {
    conditions.push(eq(effectiveTeacherExpr, teacherId));
  } else if (filters.teacher_id != null) {
    conditions.push(eq(effectiveTeacherExpr, filters.teacher_id));
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
    else conditions.push(eq(students.classId, filters.class_id));
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
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
      )`,
      discount_kind: sql`(
        SELECT d.discount_kind FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_value_type: sql`(
        SELECT d.discount_type FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_value: sql`(
        SELECT d.value FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_original_price: sql`(
        SELECT d.original_price FROM ${discounts} d
        WHERE d.student_id = ${students.studentId}
          AND d.active = TRUE
          AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
          AND (d.end_date IS NULL OR d.end_date >= CURRENT_DATE)
        ORDER BY CASE d.discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END, d.created_at DESC
        LIMIT 1
      )`,
      discount_reason: sql`(
        SELECT d.reason FROM ${discounts} d
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

const findByClassIncludingTransferred = async (classId: number, centerId?: number, teacherId?: number) => {
  const conditions: any[] = [eq(students.classId, classId), or(isNull(students.deletedAt), eq(students.status, 'Transferred'))];
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
    first_name: 'firstName',
    last_name: 'lastName',
    username: 'username',
    email: 'email',
    phone: 'phone',
    status: 'status',
    class_id: 'classId',
    teacher_id: 'teacherId',
    is_frozen: 'isFrozen',
    school_name: 'schoolName',
    school_class: 'schoolClass',
    acquisition_source_id: 'acquisitionSourceId',
    acquisition_detail: 'acquisitionDetail',
    referred_by_teacher_id: 'referredByTeacherId',
  };
  for (const [snake, camel] of Object.entries(mapping)) {
    if (payload[snake] !== undefined && payload[snake] !== null) setData[camel] = payload[snake];
  }

  const rows = await db.update(students).set(setData).where(and(...conditions)).returning(studentSelection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  const rows = await db
    .update(students)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, status: 'Removed', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning(studentSelection);
  return rows[0] || null;
};

const purge = async (id: number, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNotNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  const rows = await db.delete(students).where(and(...conditions)).returning(studentSelection);
  return rows[0] || null;
};

const transferToClass = async (id: number, targetClassId: number, centerId?: number, teacherId?: number) =>
  db.transaction(async (tx: any) => {
    const sourceConditions = [eq(students.studentId, id), isNull(students.deletedAt)];
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

    const transferredRows = await tx
      .update(students)
      .set({ status: 'Transferred', deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
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
        schoolName: source.school_name,
        schoolClass: source.school_class,
        acquisitionSourceId: source.acquisition_source_id,
        acquisitionDetail: source.acquisition_detail,
        referredByTeacherId: source.referred_by_teacher_id,
        isFrozen: source.is_frozen ?? false,
        coins: Number(source.coins || 0),
      })
      .returning(studentSelection);
    const newStudent = newStudentRows[0];

    const allocation = buildTransferAllocation(source, targetClass);
    const paidRows = await tx
      .select({ paid_amount: sql`COALESCE(SUM(${payments.amount}), 0)::numeric` })
      .from(payments)
      .where(
        and(
          eq(payments.studentId, id),
          eq(payments.centerId, source.center_id),
          isNull(payments.deletedAt),
          sql`LOWER(${payments.paymentStatus}) IN ('completed', 'paid')`,
          ne(sql`COALESCE(${payments.paymentType}, '')`, 'Transfer Adjustment'),
          gte(payments.paymentDate, toDateOnly(allocation.monthStart)),
          lte(payments.paymentDate, toDateOnly(allocation.monthEnd))
        )
      );
    const paidAmount = Number((paidRows[0] as any)?.paid_amount || 0);
    const shouldAllocate = allocation.sourceMonthly > 0 && paidAmount >= allocation.sourceMonthly;

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

    if (shouldAllocate && allocation.sourceCredit > 0) {
      await insertTransferPayment(
        id,
        -allocation.sourceCredit,
        `TRANSFER-${id}-${newStudent.student_id}-SOURCE`,
        `Transfer credit: ${allocation.sourceDays}/${allocation.totalDays} days kept in previous group`,
        source.center_id
      );
    }

    if (shouldAllocate && allocation.targetCharge > 0) {
      await insertTransferPayment(
        newStudent.student_id,
        allocation.targetCharge,
        `TRANSFER-${id}-${newStudent.student_id}-TARGET`,
        `Transfer charge: ${allocation.targetDays}/${allocation.totalDays} days in new group`,
        targetClass.center_id
      );
    }

    const links = await tx
      .select({
        parentId: parentStudents.parentId,
        relationship: parentStudents.relationship,
        isPrimary: parentStudents.isPrimary,
      })
      .from(parentStudents)
      .where(eq(parentStudents.studentId, id));

    for (const link of links) {
      const existing = await tx
        .select({ parentId: parentStudents.parentId })
        .from(parentStudents)
        .where(and(eq(parentStudents.parentId, link.parentId), eq(parentStudents.studentId, newStudent.student_id)))
        .limit(1);
      if (!existing[0]) {
        await tx.insert(parentStudents).values({
          parentId: link.parentId,
          studentId: newStudent.student_id,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        });
      }
    }

    return {
      transferred: transferredRows[0],
      student: newStudent,
      payment_allocation: {
        applied: shouldAllocate,
        paid_amount: paidAmount,
        source_monthly_amount: allocation.sourceMonthly,
        target_monthly_amount: allocation.targetMonthly,
        source_days: allocation.sourceDays,
        target_days: allocation.targetDays,
        total_days: allocation.totalDays,
        source_earned_amount: allocation.sourceEarned,
        source_credit_amount: shouldAllocate ? allocation.sourceCredit : 0,
        target_charge_amount: shouldAllocate ? allocation.targetCharge : 0,
      },
    };
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
    .where(and(eq(students.username, username), isNull(students.deletedAt)));
  return rows[0] || null;
};

const findPasswordHashById = async (id: number) => {
  const rows = await db
    .select({ password_hash: students.passwordHash })
    .from(students)
    .where(and(eq(students.studentId, id), isNull(students.deletedAt)));
  return rows[0]?.password_hash ?? null;
};

const setCredentials = async (id: number, username: string, password_hash: string, centerId?: number, teacherId?: number) => {
  const conditions = [eq(students.studentId, id), isNull(students.deletedAt)];
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
    .where(and(eq(students.studentId, id), isNull(students.deletedAt)));
};

module.exports = {
  listAcquisitionSources,
  createAcquisitionSource,
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
  findByUsername,
  findPasswordHashById,
  setCredentials,
  updatePasswordHash,
};

export {};
