// What the app shows about one child. Students see themselves and parents see a linked child
// through the same functions, so both always get the same numbers.
const studentService = require('../../students/services/student.service');
const attendanceService = require('../../attendance/services/attendance.service');
const debtService = require('../../debts/services/debt.service');
const paymentService = require('../../payments/services/payment.service');
const roomsRepository = require('../../rooms/repositories/rooms.repository');
const telegramStudentRepository = require('../../telegram_students/repositories/telegram_student.repository');
const { paged } = require('../mobileAccess');

const GRADE_HISTORY_LIMIT = 500;

const dateOf = (row: any) =>
  String(row?.session_date || row?.attendance_date || row?.payment_date || row?.debt_date || row?.created_at || '').slice(0, 10);
const newestFirst = (a: any, b: any) => dateOf(b).localeCompare(dateOf(a));
const fullName = (row: any, prefix = '') =>
  [row?.[`${prefix}first_name`], row?.[`${prefix}last_name`]].filter(Boolean).join(' ').trim() || null;

// A child in several groups has one record per group linked to the main one; every view
// combines them, as the student portal does.
const linkedRecords = async (studentId: number, centerId?: number) => {
  const rows = await studentService.listLinkedGroups(studentId, centerId);
  if (Array.isArray(rows) && rows.length > 0) return rows;
  const student = await studentService.getStudent(studentId, centerId);
  return student ? [{ ...student, is_main: true }] : [];
};

const collect = async (ids: number[], loader: (id: number) => Promise<any>) => {
  const results = await Promise.all(ids.map((id) => loader(id)));
  return results.flatMap((rows: any) => (Array.isArray(rows) ? rows : []));
};

const groupOf = (record: any) => ({
  student_id: record.student_id,
  class_id: record.class_id ?? null,
  class_name: record.class_name ?? null,
  teacher_name: fullName(record, 'teacher_'),
  status: record.status ?? null,
  is_main: Boolean(record.is_main),
});

// @MOB-026 Profile of one child with every group they study in.
const profile = async (studentId: number, centerId?: number) => {
  const records = await linkedRecords(studentId, centerId);
  if (records.length === 0) return null;
  const main = records.find((record: any) => record.is_main) || records[0];
  return {
    student_id: Number(main.student_id),
    first_name: main.first_name,
    last_name: main.last_name,
    center_id: main.center_id ?? null,
    status: main.status ?? null,
    is_frozen: Boolean(main.is_frozen),
    groups: records.filter((record: any) => record.status !== 'Transferred').map(groupOf),
  };
};

const attendanceKind = (status: string) => {
  const value = String(status || '');
  if (value === 'Present' || value === 'Late') return 'present';
  if (value === 'Excused') return 'excused';
  if (value.startsWith('Absent')) return 'absent';
  return 'other';
};

// @MOB-027 Attendance history, newest first, with totals over the whole history.
const attendance = async (studentId: number, centerId: number | undefined, page: number, pageSize: number) => {
  const records = await linkedRecords(studentId, centerId);
  const rows = (await collect(records.map((r: any) => Number(r.student_id)), (id) => attendanceService.byStudent(id, centerId))).sort(newestFirst);
  const summary = { total: rows.length, present: 0, absent: 0, excused: 0, rate: 0 };
  rows.forEach((row: any) => {
    const kind = attendanceKind(row.status);
    if (kind === 'present') summary.present += 1;
    if (kind === 'absent') summary.absent += 1;
    if (kind === 'excused') summary.excused += 1;
  });
  const counted = summary.present + summary.absent;
  summary.rate = counted > 0 ? Math.round((summary.present / counted) * 100) : 0;
  return { summary, ...paged(rows, page, pageSize) };
};

// @MOB-027 Weekly timetable of every active group.
const schedule = async (studentId: number, centerId?: number) => {
  const records = await linkedRecords(studentId, centerId);
  const active = records.filter((record: any) => record.status !== 'Transferred' && record.class_id);
  const slots = await Promise.all(
    active.map(async (record: any) => {
      const rows = await roomsRepository.findByClassId(Number(record.class_id), Number(record.center_id ?? centerId));
      return (rows || []).map((row: any) => ({
        class_id: Number(record.class_id),
        class_name: record.class_name ?? null,
        teacher_name: fullName(record, 'teacher_'),
        day: row.day,
        start_time: row.time,
        end_time: row.endTime ?? null,
        room: row.roomNumber ?? null,
      }));
    }),
  );
  return { items: slots.flat() };
};

const monthOf = (row: any) => dateOf(row).slice(0, 7);

// @MOB-028 Lesson results, newest first, and monthly averages per group so charts never mix
// one group's scale with another's.
const grades = async (studentId: number, centerId: number | undefined, page: number, pageSize: number) => {
  const records = await linkedRecords(studentId, centerId);
  const rows = (
    await collect(records.map((r: any) => Number(r.student_id)), async (id) => (await telegramStudentRepository.results(id, 1, GRADE_HISTORY_LIMIT)).data)
  ).sort(newestFirst);
  const buckets = new Map<string, { class_name: string | null; month: string; sum: number; count: number }>();
  rows.forEach((row: any) => {
    const month = monthOf(row);
    if (!month || row.percentage == null) return;
    const key = `${row.class_name || ''}|${month}`;
    const bucket = buckets.get(key) || { class_name: row.class_name ?? null, month, sum: 0, count: 0 };
    bucket.sum += Number(row.percentage) || 0;
    bucket.count += 1;
    buckets.set(key, bucket);
  });
  const monthly = [...buckets.values()]
    .map((b) => ({ class_name: b.class_name, month: b.month, average: Math.round(b.sum / b.count), lessons: b.count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const items = rows.map((row: any) => ({
    grade_id: row.grade_id,
    date: dateOf(row) || null,
    class_name: row.class_name ?? null,
    teacher_name: fullName(row, 'teacher_'),
    subject: row.subject ?? null,
    marks_obtained: row.marks_obtained == null ? null : Number(row.marks_obtained),
    total_marks: row.total_marks == null ? null : Number(row.total_marks),
    percentage: row.percentage == null ? null : Number(row.percentage),
    grade_letter: row.grade_letter ?? null,
    coins: row.total_daily_coin == null ? null : Number(row.total_daily_coin),
  }));
  return { monthly, ...paged(items, page, pageSize) };
};

// @MOB-029 Coin balance and history across every group record.
const coins = async (studentId: number, centerId: number | undefined, page: number, pageSize: number) => {
  const records = await linkedRecords(studentId, centerId);
  const summaries = await Promise.all(records.map((r: any) => studentService.getCoinSummary(Number(r.student_id), centerId)));
  const balance = summaries.reduce((sum: number, s: any) => sum + Number(s?.balance || 0), 0);
  const transactions = summaries
    .flatMap((s: any) => (Array.isArray(s?.transactions) ? s.transactions : []))
    .map((t: any) => ({
      transaction_id: t.transaction_id,
      delta: Number(t.delta || 0),
      reason: t.reason ?? null,
      source_type: t.source_type ?? null,
      created_at: t.created_at ?? null,
    }))
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { balance, ...paged(transactions, page, pageSize) };
};

const debtBalance = (debt: any) => {
  if (debt.balance != null) return Number(debt.balance) || 0;
  return (Number(debt.debt_amount) || 0) - (Number(debt.amount_paid) || 0);
};

// @MOB-030 Outstanding balance, next due date and payment history. Read only.
const payments = async (studentId: number, centerId: number | undefined, page: number, pageSize: number) => {
  const records = await linkedRecords(studentId, centerId);
  const ids = records.map((r: any) => Number(r.student_id));
  const [paymentRows, debtRows] = await Promise.all([
    collect(ids, (id) => paymentService.listByStudent(id, centerId)),
    collect(ids, (id) => debtService.listByStudent(id, centerId)),
  ]);
  const open = debtRows.filter((debt: any) => debtBalance(debt) > 0);
  const dueDates = open.map((debt: any) => String(debt.due_date || '').slice(0, 10)).filter(Boolean).sort();
  const items = paymentRows.sort(newestFirst).map((p: any) => ({
    payment_id: p.payment_id,
    date: String(p.payment_date || '').slice(0, 10) || null,
    amount: Number(p.final_amount ?? p.amount ?? 0),
    currency: p.currency ?? 'UZS',
    method: p.payment_method ?? null,
    status: p.payment_status ?? null,
    receipt_number: p.receipt_number ?? null,
  }));
  return {
    outstanding: open.reduce((sum: number, debt: any) => sum + debtBalance(debt), 0),
    next_due_date: dueDates[0] || null,
    open_debts: open.map((debt: any) => ({
      debt_id: debt.debt_id,
      amount: debtBalance(debt),
      debt_date: String(debt.debt_date || '').slice(0, 10) || null,
      due_date: String(debt.due_date || '').slice(0, 10) || null,
      remarks: debt.remarks ?? null,
    })),
    ...paged(items, page, pageSize),
  };
};

// @MOB-031 Leaderboard of names and coins only; grades and payments of others stay private.
const leaderboard = async (studentId: number, centerId: number, scope: string) => {
  const student = await studentService.getStudent(studentId, centerId);
  if (!student) return null;
  const byCenter = scope === 'center' || !student.class_id;
  const rows = byCenter
    ? await telegramStudentRepository.centerRank(centerId, 100)
    : await telegramStudentRepository.classRank(centerId, Number(student.class_id));
  const me = rows.find((row: any) => Number(row.student_id) === Number(studentId));
  const entry = (row: any) => ({
    rank: Number(row.rank || 0),
    name: [row.first_name, row.last_name ? `${String(row.last_name).charAt(0)}.` : ''].filter(Boolean).join(' '),
    coins: Number(row.coins || 0),
    is_me: Number(row.student_id) === Number(studentId),
  });
  return {
    scope: byCenter ? 'center' : 'class',
    me: me ? entry(me) : null,
    items: rows.filter((row: any) => row.status !== 'Transferred').slice(0, 50).map(entry),
  };
};

// @MOB-031 Everything the home screen needs in one request.
const dashboard = async (studentId: number, centerId?: number) => {
  const [info, attendanceData, gradeData, coinData, scheduleData, paymentData] = await Promise.all([
    profile(studentId, centerId),
    attendance(studentId, centerId, 1, 5),
    grades(studentId, centerId, 1, 5),
    coins(studentId, centerId, 1, 5),
    schedule(studentId, centerId),
    payments(studentId, centerId, 1, 3),
  ]);
  if (!info) return null;
  return {
    student: info,
    attendance: attendanceData.summary,
    recent_attendance: attendanceData.items,
    recent_grades: gradeData.items,
    coins: { balance: coinData.balance, recent: coinData.items },
    schedule: scheduleData.items,
    payments: { outstanding: paymentData.outstanding, next_due_date: paymentData.next_due_date },
  };
};

module.exports = { profile, attendance, schedule, grades, coins, payments, leaderboard, dashboard, attendanceKind };

export {};
