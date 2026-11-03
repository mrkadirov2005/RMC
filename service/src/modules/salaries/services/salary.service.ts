const { sql } = require('drizzle-orm');
const salaryRepository = require('../repositories/salary.repository');
const { methodGroup, EXPENSE_METHODS } = require('../../cash_report/services/cashReport.service');
const paymentRepository = require('../../payments/repositories/payment.repository');
const { buildTeacherGroupPayments } = require('./groupPayments');
const teacherService = require('../../teachers/services/teacher.service');
const ownerService = require('../../owners/services/owner.service');
const superuserService = require('../../superusers/services/superuser.service');

const getPreviousPeriod = () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
};

// Each teacher's students in the salary month: what they should pay and what they paid, from the
// same calculation as Dashboard → To'lovlar (fees, discounts, a first month from the start date).
const studentPaymentProgress = async (centerId: number | undefined, year: number, month: number) => {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const summary = await paymentRepository.findStudentPaymentSummary({
    centerId,
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
    months: 1,
    limit: 0,
    offset: 0,
  });
  const num = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
  const byTeacher = new Map<number, any>();
  (summary?.by_teacher || []).forEach((row: any) => {
    if (row.teacher_id == null) return;
    byTeacher.set(Number(row.teacher_id), {
      students: Number(row.students) || 0,
      paid_students: Number(row.paid_students) || 0,
      partial_students: Number(row.partial_students) || 0,
      unpaid_students: Number(row.unpaid_students) || 0,
      expected: num(row.expected),
      collected: num(row.collected),
      remaining: num(row.remaining),
    });
  });
  return byTeacher;
};

const getOverview = async ({ centerId, year, month }: { centerId?: number; year?: number; month?: number }) => {
  const period = year && month ? { year: Number(year), month: Number(month) } : getPreviousPeriod();
  const [teachersOverview, progress] = await Promise.all([
    salaryRepository.listTeacherOverview({ centerId, year: period.year, month: period.month }),
    // The list still loads when this fails; the line just stays empty.
    studentPaymentProgress(centerId, period.year, period.month).catch((error: any) => {
      console.error('Salary student payment progress failed:', error);
      return new Map();
    }),
  ]);
  const teachers = teachersOverview.map((row: any) => ({ ...row, payment_progress: progress.get(Number(row.teacher_id)) || null }));
  return { year: period.year, month: period.month, teachers };
};

const getTeacherDetail = async ({
  teacherId,
  centerId,
  months = 6,
}: {
  teacherId: number;
  centerId?: number;
  months?: number;
}) => {
  const teacher = await teacherService.getTeacher(teacherId, centerId);
  if (!teacher) return null;
  const history = await salaryRepository.listHistoryForTeacher(teacherId, centerId, months);
  return {
    teacher: {
      teacher_id: teacher.teacher_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
    },
    history,
  };
};

// The acting user's JWT id is polymorphic: for an owner it points at a row in `owners`,
// for everyone else it points at a row in `superusers` — see owner.controller.ts's login.
const resolveActingUserIdentity = async (actingUser: any, centerId?: number) => {
  const role = String(actingUser?.role || '').toLowerCase();
  let row: any = null;
  if (role === 'owner') {
    row = await ownerService.getOwner(Number(actingUser?.id));
  } else {
    row = await superuserService.getSuperuser(Number(actingUser?.id), centerId ?? null);
  }
  const name =
    [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() ||
    row?.username ||
    actingUser?.username ||
    'Unknown';
  return {
    markedById: Number(actingUser?.id) || null,
    markedByUserType: actingUser?.userType || null,
    markedByRole: actingUser?.role || null,
    markedByName: name,
  };
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Centers bill by Tashkent time, so a payout is spent on the Tashkent day.
const tashkentToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const teacherDisplayName = async (teacherId: number, centerId?: number) => {
  const teacher = await teacherService.getTeacher(teacherId, centerId);
  return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ').trim() || `#${teacherId}`;
};

// A paid salary is money out of the kassa too: what is paid out now, after the advances (those already
// left the kassa when they were given), as "Maosh: <teacher> — <month year>".
const reconcileSalaryExpense = async (salary: any, centerId: number | undefined, createdByName: string | null) => {
  if (!salary) return;
  const advances = await salaryRepository.listAdvances([Number(salary.teacher_id)], centerId, {
    year: Number(salary.salary_year),
    month: Number(salary.salary_month),
  });
  const due = salary.is_paid ? Math.max(0, Math.round((Number(salary.amount) - salaryRepository.sumAdvances(advances)) * 100) / 100) : 0;
  const group = methodGroup(salary.payment_method || 'Cash');
  const method = EXPENSE_METHODS[(group === 'other' ? 'cash' : group) as 'cash' | 'card' | 'bank'];
  const teacherName = await teacherDisplayName(Number(salary.teacher_id), centerId);
  await salaryRepository.syncSalaryExpense({
    salaryId: salary.salary_id,
    expenseId: salary.expense_id,
    centerId: salary.center_id ?? centerId,
    amount: due,
    expenseDate: tashkentToday(),
    paymentMethod: method,
    description: `Maosh: ${teacherName} — ${MONTH_NAMES[Number(salary.salary_month) - 1]} ${salary.salary_year}`,
    createdByName,
  });
};

const markPaid = async (payload: {
  teacherId: number;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  centerId?: number;
  actingUser: any;
}) => {
  // The kassa has cash, card and bank only; a payout made some other way would not fit any till.
  if (methodGroup(payload.paymentMethod || 'Cash') === 'other') return { error: 'invalid_method' as const };
  const identity = await resolveActingUserIdentity(payload.actingUser, payload.centerId);
  const record = await salaryRepository.upsertRecord({
    teacherId: payload.teacherId,
    centerId: payload.centerId ?? null,
    salaryYear: payload.salaryYear,
    salaryMonth: payload.salaryMonth,
    amount: payload.amount,
    isPaid: true,
    ...identity,
    paymentMethod: payload.paymentMethod ?? null,
    notes: payload.notes ?? null,
  });
  await reconcileSalaryExpense(record, payload.centerId, identity.markedByName);
  return record;
};

const updateSalaryRecord = async (payload: {
  id: number;
  patch: { amount?: number; is_paid?: boolean; payment_method?: string; notes?: string };
  centerId?: number;
  actingUser: any;
}) => {
  if (payload.patch.payment_method !== undefined && methodGroup(payload.patch.payment_method || 'Cash') === 'other') {
    return { error: 'invalid_method' as const };
  }
  const identity = await resolveActingUserIdentity(payload.actingUser, payload.centerId);
  const patch: any = { ...identity };
  if (payload.patch.amount !== undefined) patch.amount = payload.patch.amount;
  if (payload.patch.is_paid !== undefined) {
    patch.isPaid = payload.patch.is_paid;
    patch.paidAt = payload.patch.is_paid ? sql`CURRENT_TIMESTAMP` : null;
  }
  if (payload.patch.payment_method !== undefined) patch.paymentMethod = payload.patch.payment_method;
  if (payload.patch.notes !== undefined) patch.notes = payload.patch.notes;
  const record = await salaryRepository.updateRecord(payload.id, patch, payload.centerId);
  await reconcileSalaryExpense(record, payload.centerId, identity.markedByName);
  return record;
};

// An advance is money out of the kassa: it is saved with a matching expense, in the till it was paid from.
const addAdvance = async (payload: {
  teacherId: number;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  centerId?: number;
  actingUser: any;
}) => {
  // The kassa has cash, card and bank only; an advance paid some other way would not fit any till.
  const group = methodGroup(payload.paymentMethod || 'Cash');
  if (group === 'other') return { error: 'invalid_method' as const };
  const teacherName = await teacherDisplayName(payload.teacherId, payload.centerId);
  const identity = await resolveActingUserIdentity(payload.actingUser, payload.centerId);
  const advance = await salaryRepository.insertAdvance({
    teacherId: payload.teacherId,
    centerId: payload.centerId ?? null,
    salaryYear: payload.salaryYear,
    salaryMonth: payload.salaryMonth,
    amount: payload.amount,
    paymentMethod: EXPENSE_METHODS[group as 'cash' | 'card' | 'bank'],
    notes: payload.notes ?? null,
    givenById: identity.markedById,
    givenByRole: identity.markedByRole,
    givenByName: identity.markedByName,
    expense: {
      expenseDate: tashkentToday(),
      paymentMethod: EXPENSE_METHODS[group as 'cash' | 'card' | 'bank'],
      description: `Avans: ${teacherName} — ${MONTH_NAMES[payload.salaryMonth - 1]} ${payload.salaryYear}${payload.notes ? ` (${payload.notes})` : ''}`,
    },
  });
  // A salary already paid out is paid out less by what was advanced after all.
  await reconcileSalaryAfterAdvance(payload.teacherId, payload.salaryYear, payload.salaryMonth, payload.centerId, identity.markedByName);
  return advance;
};

const reconcileSalaryAfterAdvance = async (teacherId: number, year: number, month: number, centerId: number | undefined, byName: string | null) => {
  const salary = await salaryRepository.findRecord(teacherId, year, month, centerId);
  if (salary?.is_paid) await reconcileSalaryExpense(salary, centerId, byName);
};

const removeAdvance = async ({ id, centerId }: { id: number; centerId?: number }) => {
  const removed = await salaryRepository.deleteAdvance(id, centerId);
  if (removed) await reconcileSalaryAfterAdvance(Number(removed.teacher_id), Number(removed.salary_year), Number(removed.salary_month), centerId, null);
  return removed;
};

const getMonthlySummary = async ({ centerId, months = 6 }: { centerId?: number; months?: number }) => {
  const summary = await salaryRepository.monthlySummary({ centerId, months });
  return { months: summary };
};

// The signed-in teacher's per-group money for one month (YYYY-MM); null when the teacher is unknown.
const getMyGroupPayments = async ({ teacherId, centerId, monthKey }: { teacherId: number; centerId?: number; monthKey: string }) => {
  const [year, month] = monthKey.split('-').map(Number);
  const rows = await salaryRepository.findTeacherGroupPaymentRows({ teacherId, centerId, year, month });
  if (!rows) return null;
  return buildTeacherGroupPayments({
    monthKey,
    salaryPercentage: rows.teacher.salary_percentage,
    classes: rows.classes,
    students: rows.students,
    payments: rows.payments,
    salary: rows.salary,
  });
};

module.exports = {
  getOverview,
  getTeacherDetail,
  markPaid,
  updateSalaryRecord,
  getMonthlySummary,
  getMyGroupPayments,
  addAdvance,
  removeAdvance,
};

export {};
