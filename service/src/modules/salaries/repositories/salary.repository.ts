const { and, asc, eq, inArray, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, expenses, payments, students, teachers, teacherSalaries, teacherSalaryAdvances } = require('../../../db/schema');

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
  expense_id: teacherSalaries.expenseId,
  created_at: teacherSalaries.createdAt,
  updated_at: teacherSalaries.updatedAt,
};

const advanceSelection = {
  advance_id: teacherSalaryAdvances.advanceId,
  center_id: teacherSalaryAdvances.centerId,
  teacher_id: teacherSalaryAdvances.teacherId,
  salary_year: teacherSalaryAdvances.salaryYear,
  salary_month: teacherSalaryAdvances.salaryMonth,
  amount: teacherSalaryAdvances.amount,
  given_at: teacherSalaryAdvances.givenAt,
  payment_method: teacherSalaryAdvances.paymentMethod,
  notes: teacherSalaryAdvances.notes,
  given_by_name: teacherSalaryAdvances.givenByName,
  given_by_role: teacherSalaryAdvances.givenByRole,
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

// An advance is money out of the kassa, so it lands in `expenses` too; the advance keeps the link.
const insertAdvance = async (data: {
  teacherId: number;
  centerId?: number | null;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  paymentMethod?: string | null;
  notes?: string | null;
  givenById?: number | null;
  givenByRole?: string | null;
  givenByName?: string | null;
  expense: { expenseDate: string; paymentMethod: string; description: string };
}) => {
  const [expense] = await db
    .insert(expenses)
    .values({
      centerId: Number(data.centerId),
      expenseDate: data.expense.expenseDate,
      amount: String(data.amount),
      paymentMethod: data.expense.paymentMethod,
      description: data.expense.description,
      createdByName: data.givenByName ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
    })
    .returning({ expense_id: expenses.expenseId });
  try {
    return await insertAdvanceRow(data, expense.expense_id);
  } catch (error) {
    // No advance without its expense, and no expense without its advance.
    await db.update(expenses).set({ deletedAt: sql`CURRENT_TIMESTAMP` }).where(eq(expenses.expenseId, expense.expense_id));
    throw error;
  }
};

const insertAdvanceRow = async (data: any, expenseId: number) => {
  const rows = await db
    .insert(teacherSalaryAdvances)
    .values({
      centerId: data.centerId ?? null,
      teacherId: data.teacherId,
      salaryYear: data.salaryYear,
      salaryMonth: data.salaryMonth,
      amount: String(data.amount),
      givenAt: sql`CURRENT_TIMESTAMP`,
      paymentMethod: data.paymentMethod ?? null,
      notes: data.notes ?? null,
      givenById: data.givenById ?? null,
      givenByRole: data.givenByRole ?? null,
      givenByName: data.givenByName ?? null,
      expenseId,
      createdAt: sql`CURRENT_TIMESTAMP`,
    })
    .returning(advanceSelection);
  return rows[0];
};

const deleteAdvance = async (id: number, centerId?: number) => {
  const conditions = [eq(teacherSalaryAdvances.advanceId, id)];
  if (centerId) conditions.push(eq(teacherSalaryAdvances.centerId, centerId));
  const rows = await db
    .delete(teacherSalaryAdvances)
    .where(and(...conditions))
    .returning({ ...advanceSelection, expense_id: teacherSalaryAdvances.expenseId });
  const removed = rows[0] || null;
  // The money goes back into the kassa.
  if (removed?.expense_id) {
    await db.update(expenses).set({ deletedAt: sql`CURRENT_TIMESTAMP` }).where(eq(expenses.expenseId, removed.expense_id));
  }
  return removed;
};

// A teacher's advances, newest first; one salary month when `year`/`month` are given.
const listAdvances = (teacherIds: number[], centerId?: number, period?: { year: number; month: number }) => {
  if (!teacherIds.length) return Promise.resolve([]);
  const conditions: any[] = [inArray(teacherSalaryAdvances.teacherId, teacherIds)];
  if (centerId) conditions.push(eq(teacherSalaryAdvances.centerId, centerId));
  if (period) {
    conditions.push(eq(teacherSalaryAdvances.salaryYear, period.year));
    conditions.push(eq(teacherSalaryAdvances.salaryMonth, period.month));
  }
  return db
    .select(advanceSelection)
    .from(teacherSalaryAdvances)
    .where(and(...conditions))
    .orderBy(sql`${teacherSalaryAdvances.givenAt} DESC`, sql`${teacherSalaryAdvances.advanceId} DESC`);
};

const sumAdvances = (rows: Array<{ amount?: unknown }>) =>
  Math.round(rows.reduce((total, row) => total + (Number(row.amount) || 0), 0) * 100) / 100;

// Keeps the kassa expense behind a paid salary in step with it: created on the first payout, updated
// when the amount or method changes, and taken back out (amount 0) when the salary is un-marked.
const syncSalaryExpense = async (data: {
  salaryId: number;
  expenseId?: number | null;
  centerId?: number | null;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  description: string;
  createdByName?: string | null;
}) => {
  if (data.amount <= 0) {
    if (data.expenseId) {
      await db.update(expenses).set({ deletedAt: sql`CURRENT_TIMESTAMP` }).where(eq(expenses.expenseId, data.expenseId));
      await db.update(teacherSalaries).set({ expenseId: null }).where(eq(teacherSalaries.salaryId, data.salaryId));
    }
    return null;
  }
  if (data.expenseId) {
    await db
      .update(expenses)
      .set({ amount: String(data.amount), paymentMethod: data.paymentMethod, description: data.description, deletedAt: null })
      .where(eq(expenses.expenseId, data.expenseId));
    return data.expenseId;
  }
  const [expense] = await db
    .insert(expenses)
    .values({
      centerId: Number(data.centerId),
      expenseDate: data.expenseDate,
      amount: String(data.amount),
      paymentMethod: data.paymentMethod,
      description: data.description,
      createdByName: data.createdByName ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
    })
    .returning({ expense_id: expenses.expenseId });
  await db.update(teacherSalaries).set({ expenseId: expense.expense_id }).where(eq(teacherSalaries.salaryId, data.salaryId));
  return expense.expense_id;
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

  const advanceRows = await listAdvances(teacherIds, centerId, { year, month });
  const advancesByTeacher = new Map<number, any[]>();
  advanceRows.forEach((row: any) => {
    const key = Number(row.teacher_id);
    advancesByTeacher.set(key, [...(advancesByTeacher.get(key) || []), row]);
  });

  return teacherRows.map((teacher: any) => ({
    advance_total: sumAdvances(advancesByTeacher.get(Number(teacher.teacher_id)) || []),
    teacher_id: teacher.teacher_id,
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    center_id: teacher.center_id,
    salary: salaryByTeacher.get(Number(teacher.teacher_id)) || null,
    student_stats: toStudentStats(statsByTeacher.get(Number(teacher.teacher_id))),
  }));
};

// The center started paying salaries through RMC in October 2026; months before that have no
// records and must not show as unpaid. SALARY_START_MONTH (YYYY-MM) moves the start.
const salaryStartIndex = () => {
  const match = String(process.env.SALARY_START_MONTH || '2026-10').match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : 0;
};
const isOnOrAfterSalaryStart = (date: Date) => date.getFullYear() * 12 + date.getMonth() >= salaryStartIndex();

const listHistoryForTeacher = async (teacherId: number, centerId: number | undefined, months: number) => {
  const now = new Date();
  const periods: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (isOnOrAfterSalaryStart(d)) periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const salaryConditions = [eq(teacherSalaries.teacherId, teacherId)];
  if (centerId) salaryConditions.push(eq(teacherSalaries.centerId, centerId));
  const salaryRows = await db.select(salarySelection).from(teacherSalaries).where(and(...salaryConditions));
  const salaryByPeriod = new Map(salaryRows.map((row: any) => [`${row.salary_year}-${row.salary_month}`, row]));

  const advanceRows = await listAdvances([teacherId], centerId);
  const advancesByPeriod = new Map<string, any[]>();
  advanceRows.forEach((row: any) => {
    const key = `${row.salary_year}-${row.salary_month}`;
    advancesByPeriod.set(key, [...(advancesByPeriod.get(key) || []), row]);
  });

  const history: any[] = [];
  for (const period of periods) {
    const statRows = await studentStatsByTeacher({ centerId, teacherId, year: period.year, month: period.month });
    const advances = advancesByPeriod.get(`${period.year}-${period.month}`) || [];
    history.push({
      salary_year: period.year,
      salary_month: period.month,
      advances,
      advance_total: sumAdvances(advances),
      salary: salaryByPeriod.get(`${period.year}-${period.month}`) || null,
      student_stats: toStudentStats(statRows[0]),
    });
  }
  return history;
};

// Raw rows behind a teacher's own per-group payment view for one month: their classes, the
// students in them, and those students' completed payments dated inside the month.
const findTeacherGroupPaymentRows = async ({
  teacherId,
  centerId,
  year,
  month,
}: {
  teacherId: number;
  centerId?: number;
  year: number;
  month: number;
}) => {
  const teacherConditions = [eq(teachers.teacherId, teacherId)];
  if (centerId) teacherConditions.push(eq(teachers.centerId, centerId));
  const [teacher] = await db
    .select({ teacher_id: teachers.teacherId, salary_percentage: teachers.salaryPercentage })
    .from(teachers)
    .where(and(...teacherConditions))
    .limit(1);
  if (!teacher) return null;

  const classConditions = [eq(classes.teacherId, teacherId), isNull(classes.deletedAt)];
  if (centerId) classConditions.push(eq(classes.centerId, centerId));
  const classRows = await db
    .select({
      class_id: classes.classId,
      class_name: classes.className,
      payment_amount: classes.paymentAmount,
    })
    .from(classes)
    .where(and(...classConditions))
    .orderBy(asc(classes.className));

  const classIds = classRows.map((row: any) => Number(row.class_id));
  const studentRows = classIds.length
    ? await db
        .select({
          student_id: students.studentId,
          class_id: students.classId,
          first_name: students.firstName,
          last_name: students.lastName,
          start_date: students.startDate,
          end_date: students.endDate,
          status: students.status,
        })
        .from(students)
        .where(and(inArray(students.classId, classIds), isNull(students.deletedAt)))
    : [];

  const { start, end } = monthRange(year, month);
  const studentIds = studentRows.map((row: any) => Number(row.student_id));
  const paymentRows = studentIds.length
    ? await db
        .select({
          student_id: payments.studentId,
          amount: payments.amount,
          discount_amount: payments.discountAmount,
        })
        .from(payments)
        .where(
          and(
            inArray(payments.studentId, studentIds),
            // Same statuses the admin group payment view counts as money received.
            sql`LOWER(${payments.paymentStatus}) IN ('completed', 'paid')`,
            isNull(payments.deletedAt),
            sql`${payments.paymentDate} >= ${start}`,
            sql`${payments.paymentDate} < ${end}`
          )
        )
    : [];

  const salary = await findRecord(teacherId, year, month, centerId);

  return { teacher, classes: classRows, students: studentRows, payments: paymentRows, salary };
};

// Trailing-N-months totals of paid salary amount + paid-teacher count, oldest first.
const monthlySummary = async ({ centerId, months }: { centerId?: number; months: number }) => {
  const now = new Date();
  const periods: Array<{ year: number; month: number }> = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (isOnOrAfterSalaryStart(d)) periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
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
  findTeacherGroupPaymentRows,
  insertAdvance,
  deleteAdvance,
  listAdvances,
  sumAdvances,
  syncSalaryExpense,
};

export {};
