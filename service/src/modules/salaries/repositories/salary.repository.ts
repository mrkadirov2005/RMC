const { and, asc, eq, inArray, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, payments, students, teachers, teacherSalaries } = require('../../../db/schema');

const db = pool.db;

const salarySelection = {
  salary_id: teacherSalaries.salaryId,
  center_id: teacherSalaries.centerId,
  teacher_id: teacherSalaries.teacherId,
  salary_year: teacherSalaries.salaryYear,
  salary_month: teacherSalaries.salaryMonth,
  amount: teacherSalaries.amount,
  is_paid: teacherSalaries.isPaid,
  paid_at: teacherSalaries.paidAt,
  marked_by_id: teacherSalaries.markedById,
  marked_by_user_type: teacherSalaries.markedByUserType,
  marked_by_role: teacherSalaries.markedByRole,
  marked_by_name: teacherSalaries.markedByName,
  payment_method: teacherSalaries.paymentMethod,
  notes: teacherSalaries.notes,
  created_at: teacherSalaries.createdAt,
  updated_at: teacherSalaries.updatedAt,
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const monthRange = (year: number, month: number) => {
  const start = `${year}-${pad2(month)}-01`;
  const endDate = new Date(year, month, 1);
  const end = `${endDate.getFullYear()}-${pad2(endDate.getMonth() + 1)}-01`;
  return { start, end };
};

const findRecord = async (teacherId: number, year: number, month: number, centerId?: number) => {
  const conditions = [
    eq(teacherSalaries.teacherId, teacherId),
    eq(teacherSalaries.salaryYear, year),
    eq(teacherSalaries.salaryMonth, month),
  ];
  if (centerId) conditions.push(eq(teacherSalaries.centerId, centerId));
  const rows = await db.select(salarySelection).from(teacherSalaries).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const findById = async (id: number, centerId?: number) => {
  const conditions = [eq(teacherSalaries.salaryId, id)];
  if (centerId) conditions.push(eq(teacherSalaries.centerId, centerId));
  const rows = await db.select(salarySelection).from(teacherSalaries).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const upsertRecord = async (data: {
  teacherId: number;
  centerId?: number | null;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  isPaid: boolean;
  markedById?: number | null;
  markedByUserType?: string | null;
  markedByRole?: string | null;
  markedByName?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}) => {
  const rows = await db
    .insert(teacherSalaries)
    .values({
      centerId: data.centerId ?? null,
      teacherId: data.teacherId,
      salaryYear: data.salaryYear,
      salaryMonth: data.salaryMonth,
      amount: String(data.amount),
      isPaid: data.isPaid,
      paidAt: sql`CURRENT_TIMESTAMP`,
      markedById: data.markedById ?? null,
      markedByUserType: data.markedByUserType ?? null,
      markedByRole: data.markedByRole ?? null,
      markedByName: data.markedByName ?? null,
      paymentMethod: data.paymentMethod ?? null,
      notes: data.notes ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      target: [teacherSalaries.teacherId, teacherSalaries.salaryYear, teacherSalaries.salaryMonth],
      set: {
        centerId: data.centerId ?? null,
        amount: String(data.amount),
        isPaid: data.isPaid,
        paidAt: sql`CURRENT_TIMESTAMP`,
        markedById: data.markedById ?? null,
        markedByUserType: data.markedByUserType ?? null,
        markedByRole: data.markedByRole ?? null,
        markedByName: data.markedByName ?? null,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning(salarySelection);
  return rows[0];
};

const updateRecord = async (
  id: number,
  patch: {
    amount?: number;
    isPaid?: boolean;
    paidAt?: any;
    markedById?: number | null;
    markedByUserType?: string | null;
    markedByRole?: string | null;
    markedByName?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
  },
  centerId?: number
) => {
  const existing = await findById(id, centerId);
  if (!existing) return null;

  const setValues: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  if (patch.amount !== undefined) setValues.amount = String(patch.amount);
  if (patch.isPaid !== undefined) setValues.isPaid = patch.isPaid;
  if (patch.paidAt !== undefined) setValues.paidAt = patch.paidAt;
  if (patch.markedById !== undefined) setValues.markedById = patch.markedById;
  if (patch.markedByUserType !== undefined) setValues.markedByUserType = patch.markedByUserType;
  if (patch.markedByRole !== undefined) setValues.markedByRole = patch.markedByRole;
  if (patch.markedByName !== undefined) setValues.markedByName = patch.markedByName;
  if (patch.paymentMethod !== undefined) setValues.paymentMethod = patch.paymentMethod;
  if (patch.notes !== undefined) setValues.notes = patch.notes;

  const rows = await db
    .update(teacherSalaries)
    .set(setValues)
    .where(eq(teacherSalaries.salaryId, id))
    .returning(salarySelection);
  return rows[0] || null;
};

const listTeachers = (centerId?: number) => {
  const conditions = [isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  return db
    .select({
      teacher_id: teachers.teacherId,
      center_id: teachers.centerId,
      first_name: teachers.firstName,
      last_name: teachers.lastName,
    })
    .from(teachers)
    .where(and(...conditions))
    .orderBy(asc(teachers.firstName), asc(teachers.lastName));
};

// Aggregate, per effective teacher (COALESCE(classes.teacher_id, students.teacher_id)), how many active
// students exist and how many of them have a Completed payment inside [year, month]'s date range.
// When `teacherId` is provided the result is scoped to a single teacher (still grouped).
const studentStatsByTeacher = async ({
  centerId,
  teacherId,
  year,
  month,
}: {
  centerId?: number;
  teacherId?: number;
  year: number;
  month: number;
}) => {
  const { start, end } = monthRange(year, month);
  const conditions: any[] = [isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);

  const rows = await db
    .select({
      teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
      total_students: sql`COUNT(DISTINCT ${students.studentId})::int`,
      paid_students: sql`COUNT(DISTINCT CASE WHEN ${payments.paymentId} IS NOT NULL THEN ${students.studentId} END)::int`,
      collected_amount: sql`COALESCE(SUM(${payments.amount}), 0)`,
    })
    .from(students)
    .leftJoin(classes, and(eq(classes.classId, students.classId), isNull(classes.deletedAt)))
    .leftJoin(
      payments,
      and(
        eq(payments.studentId, students.studentId),
        eq(payments.paymentStatus, 'Completed'),
        isNull(payments.deletedAt),
        sql`${payments.paymentDate} >= ${start}`,
        sql`${payments.paymentDate} < ${end}`
      )
    )
    .where(and(...conditions))
    .groupBy(sql`COALESCE(${classes.teacherId}, ${students.teacherId})`);

  return rows as Array<{ teacher_id: number | null; total_students: number; paid_students: number; collected_amount: string | number }>;
};

const toStudentStats = (row?: { total_students: number; paid_students: number; collected_amount?: string | number } | null) => {
  const totalStudents = Number(row?.total_students) || 0;
  const paidStudents = Number(row?.paid_students) || 0;
  const unpaidStudents = Math.max(totalStudents - paidStudents, 0);
  const paidPercent = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 1000) / 10 : 0;
  const unpaidPercent = totalStudents > 0 ? Math.round((unpaidStudents / totalStudents) * 1000) / 10 : 0;
  return {
    total_students: totalStudents,
    paid_students: paidStudents,
    unpaid_students: unpaidStudents,
    paid_percent: paidPercent,
    unpaid_percent: unpaidPercent,
    collected_amount: Number(row?.collected_amount) || 0,
  };
};

const listTeacherOverview = async ({
  centerId,
  year,
  month,
}: {
  centerId?: number;
  year: number;
  month: number;
}) => {
  const teacherRows = await listTeachers(centerId);
  if (!teacherRows.length) return [];
  const teacherIds = teacherRows.map((t: any) => t.teacher_id);

  const salaryRows = await db
    .select(salarySelection)
    .from(teacherSalaries)
    .where(
      and(
        eq(teacherSalaries.salaryYear, year),
        eq(teacherSalaries.salaryMonth, month),
        inArray(teacherSalaries.teacherId, teacherIds)
      )
    );
  const salaryByTeacher = new Map(salaryRows.map((row: any) => [Number(row.teacher_id), row]));

  const statRows = await studentStatsByTeacher({ centerId, year, month });
  const statsByTeacher = new Map(
    statRows.filter((row) => row.teacher_id != null).map((row) => [Number(row.teacher_id), row])
  );

  return teacherRows.map((teacher: any) => ({
    teacher_id: teacher.teacher_id,
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    center_id: teacher.center_id,
    salary: salaryByTeacher.get(Number(teacher.teacher_id)) || null,
    student_stats: toStudentStats(statsByTeacher.get(Number(teacher.teacher_id))),
  }));
};

const listHistoryForTeacher = async (teacherId: number, centerId: number | undefined, months: number) => {
  const now = new Date();
  const periods: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const salaryConditions = [eq(teacherSalaries.teacherId, teacherId)];
  if (centerId) salaryConditions.push(eq(teacherSalaries.centerId, centerId));
  const salaryRows = await db.select(salarySelection).from(teacherSalaries).where(and(...salaryConditions));
  const salaryByPeriod = new Map(salaryRows.map((row: any) => [`${row.salary_year}-${row.salary_month}`, row]));

  const history: any[] = [];
  for (const period of periods) {
    const statRows = await studentStatsByTeacher({ centerId, teacherId, year: period.year, month: period.month });
    history.push({
      salary_year: period.year,
      salary_month: period.month,
      salary: salaryByPeriod.get(`${period.year}-${period.month}`) || null,
      student_stats: toStudentStats(statRows[0]),
    });
  }
  return history;
};

// Trailing-N-months totals of paid salary amount + paid-teacher count, oldest first.
const monthlySummary = async ({ centerId, months }: { centerId?: number; months: number }) => {
  const now = new Date();
  const periods: Array<{ year: number; month: number }> = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const earliestYear = periods[0]?.year ?? now.getFullYear();

  const conditions: any[] = [eq(teacherSalaries.isPaid, true), sql`${teacherSalaries.salaryYear} >= ${earliestYear}`];
  if (centerId) conditions.push(eq(teacherSalaries.centerId, centerId));

  const rows = await db
    .select({
      salary_year: teacherSalaries.salaryYear,
      salary_month: teacherSalaries.salaryMonth,
      total_amount: sql`COALESCE(SUM(${teacherSalaries.amount}), 0)`,
      paid_count: sql`COUNT(*)::int`,
    })
    .from(teacherSalaries)
    .where(and(...conditions))
    .groupBy(teacherSalaries.salaryYear, teacherSalaries.salaryMonth);

  const byPeriod = new Map(rows.map((row: any) => [`${row.salary_year}-${row.salary_month}`, row]));

  return periods.map((period) => {
    const row: any = byPeriod.get(`${period.year}-${period.month}`);
    return {
      year: period.year,
      month: period.month,
      total_amount: row ? Number(row.total_amount) || 0 : 0,
      paid_count: row ? Number(row.paid_count) || 0 : 0,
    };
  });
};

module.exports = {
  findRecord,
  findById,
  upsertRecord,
  updateRecord,
  listTeacherOverview,
  listHistoryForTeacher,
  monthlySummary,
};

export {};
