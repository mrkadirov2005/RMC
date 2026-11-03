const { sql } = require('drizzle-orm');
const salaryRepository = require('../repositories/salary.repository');
const { methodGroup, EXPENSE_METHODS } = require('../../cash_report/services/cashReport.service');
const paymentRepository = require('../../payments/repositories/payment.repository');
const { buildTeacherGroupPayments } = require('./groupPayments');
const { buildTeacherEarnings, summarizeEarnings } = require('./earnings');
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
  const [teachersOverview, earningPayments, progress] = await Promise.all([
    salaryRepository.listTeacherOverview({ centerId, year: period.year, month: period.month }),
    salaryRepository.findEarningPayments({ centerId, year: period.year, month: period.month }),
    // The list still loads when this fails; the line just stays empty.
    studentPaymentProgress(centerId, period.year, period.month).catch((error: any) => {
      console.error('Salary student payment progress failed:', error);
      return new Map();
    }),
  ]);
  const paymentsByTeacher = new Map<number, any[]>();
  earningPayments.forEach((payment: any) => {
    const key = Number(payment.teacher_id);
    paymentsByTeacher.set(key, [...(paymentsByTeacher.get(key) || []), payment]);
  });
  const teachers = teachersOverview.map((row: any) => ({
    ...row,
    payment_progress: progress.get(Number(row.teacher_id)) || null,
    earnings: summarizeEarnings(
      buildTeacherEarnings({ salaryPercentage: row.salary_percentage, payments: paymentsByTeacher.get(Number(row.teacher_id)) || [] })
    ),
  }));
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
  // An amount typed in by hand is the whole salary from now on, not the sum of the payouts.
  if (payload.patch.amount !== undefined) {
    patch.amount = payload.patch.amount;
    patch.fromPayouts = false;
  }
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

// Where a month's salary stands: what the teacher is owed by their pay rate, what they received
// (advances, salary payouts and the rest of a salary typed in by hand) and what is left.
const monthPayoutState = async (teacherId: number, centerId: number | undefined, year: number, month: number) => {
  const [rate, earningPayments, entries, record] = await Promise.all([
    salaryRepository.findTeacherRate(teacherId, centerId),
    salaryRepository.findEarningPayments({ centerId, teacherId, year, month }),
    salaryRepository.listAdvances([teacherId], centerId, { year, month }),
    salaryRepository.findRecord(teacherId, year, month, centerId),
  ]);
  const due = buildTeacherEarnings({ salaryPercentage: rate, payments: earningPayments }).due;
  const given = salaryRepository.sumAdvances(entries);
  const received = given + (record?.is_paid ? Math.max(0, Number(record.amount) - given) : 0);
  return { due, entries, given, record, received, left: Math.max(0, Math.round((due - received) * 100) / 100) };
};

// Keeps the month's salary record in step after money was given or taken back.
//  - A salary typed in by hand (Mark as paid) is the whole salary: a salary payout adds to it, and its
//    kassa expense stays what is left of it after the advances and payouts.
//  - Otherwise the record follows the payouts: everything given, paid once it reaches the salary by rate.
//    Its own kassa expense is nothing, as each payout is its own expense.
const syncPayoutRecord = async (
  teacherId: number,
  year: number,
  month: number,
  centerId: number | undefined,
  identity: any,
  salaryDelta: number,
  paymentMethod?: string
) => {
  const state = await monthPayoutState(teacherId, centerId, year, month);
  const { record } = state;
  if (record && !record.from_payouts) {
    const updated = salaryDelta && record.is_paid
      ? await salaryRepository.updateRecord(record.salary_id, { amount: Math.max(0, Number(record.amount) + salaryDelta) }, centerId)
      : record;
    await reconcileSalaryExpense(updated, centerId, identity?.markedByName ?? null);
    return;
  }
  const hasPayouts = state.entries.some((entry: any) => entry.kind === 'salary');
  if (!record && !hasPayouts) return;
  const saved = await salaryRepository.upsertRecord({
    teacherId,
    centerId: centerId ?? null,
    salaryYear: year,
    salaryMonth: month,
    amount: state.given,
    isPaid: hasPayouts && state.given > 0 && state.given + 0.01 >= state.due,
    ...(identity || {}),
    paymentMethod: paymentMethod ?? record?.payment_method ?? null,
    notes: record?.notes ?? null,
    fromPayouts: true,
  });
  await reconcileSalaryExpense(saved, centerId, identity?.markedByName ?? null);
};

// Money given against a month's salary: an advance (before it is due) or a part of the salary itself,
// which may not go over what is left of the salary by pay rate. Either is money out of the kassa: it is
// saved with a matching expense, in the till it was paid from.
const addAdvance = async (payload: {
  teacherId: number;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  centerId?: number;
  actingUser: any;
  kind?: 'advance' | 'salary';
}) => {
  // The kassa has cash, card and bank only; an advance paid some other way would not fit any till.
  const group = methodGroup(payload.paymentMethod || 'Cash');
  if (group === 'other') return { error: 'invalid_method' as const };
  const kind = payload.kind === 'salary' ? 'salary' : 'advance';
  if (kind === 'salary') {
    const { left } = await monthPayoutState(payload.teacherId, payload.centerId, payload.salaryYear, payload.salaryMonth);
    if (payload.amount > left + 0.01) return { error: 'over_limit' as const, left };
  }
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
    kind,
    expense: {
      expenseDate: tashkentToday(),
      paymentMethod: EXPENSE_METHODS[group as 'cash' | 'card' | 'bank'],
      description: `${kind === 'salary' ? 'Maosh' : 'Avans'}: ${teacherName} — ${MONTH_NAMES[payload.salaryMonth - 1]} ${payload.salaryYear}${payload.notes ? ` (${payload.notes})` : ''}`,
    },
  });
  // A salary already paid out is paid out less by what was advanced after all; a payout is part of it.
  await syncPayoutRecord(
    payload.teacherId,
    payload.salaryYear,
    payload.salaryMonth,
    payload.centerId,
    identity,
    kind === 'salary' ? payload.amount : 0,
    payload.paymentMethod
  );
  return advance;
};

const removeAdvance = async ({ id, centerId }: { id: number; centerId?: number }) => {
  const removed = await salaryRepository.deleteAdvance(id, centerId);
  if (removed) {
    const delta = removed.kind === 'salary' ? -Number(removed.amount) : 0;
    await syncPayoutRecord(Number(removed.teacher_id), Number(removed.salary_year), Number(removed.salary_month), centerId, null, delta);
  }
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
  const [earningPayments, advances] = await Promise.all([
    salaryRepository.findEarningPayments({ centerId, teacherId, year, month }),
    salaryRepository.listAdvances([teacherId], centerId, { year, month }),
  ]);
  return {
    ...buildTeacherGroupPayments({
      monthKey,
      salaryPercentage: rows.teacher.salary_percentage,
      classes: rows.classes,
      students: rows.students,
      payments: rows.payments,
      salary: rows.salary,
    }),
    // The month's salary by the pay rate, with the late payments it includes, and the advances taken.
    earnings: buildTeacherEarnings({ salaryPercentage: rows.teacher.salary_percentage, payments: earningPayments }),
    advances,
    ...salaryRepository.splitPayouts(advances),
  };
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
