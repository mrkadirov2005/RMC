// A teacher's own money view for one month: per group, what was expected, what came in and what is
// still owed, plus the teacher's share of what came in.
//
// The per-student rules mirror the admin group payment view (ui PaymentListView + shared/billingPeriod):
// the class fee is prorated by lessons (12 a month) in a month a student joined or left partway, the largest
// discount on the month's payments comes off it, and a student is paid once that is covered.

type PaymentState = 'paid' | 'partial' | 'unpaid';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDay = (value: unknown) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The group's lesson days (e.g. ["Monday", "Wednesday", "Friday"]) from its schedule. */
const lessonDaysOf = (section: unknown): string[] => {
  try {
    const parsed = typeof section === 'string' ? JSON.parse(section) : section;
    const days = Array.isArray((parsed as any)?.days) ? (parsed as any).days : [];
    return days.filter((day: unknown) => DAY_NAMES.includes(String(day)));
  } catch {
    return [];
  }
};

/**
 * The share of the month's price the record owes: a whole month is 1; a month the student joined
 * or left partway through is 1/12 per lesson day in the group (at most 12), or by calendar days
 * when the group has no lesson days. Same rule as the SQL billing_month_share.
 */
const getMonthShare = (record: { start_date?: unknown; end_date?: unknown }, monthKey: string, lessonDays: string[] = []) => {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(totalDays).padStart(2, '0')}`;
  const start = toDay(record?.start_date);
  const end = toDay(record?.end_date);
  const from = start && start > monthStart ? start : monthStart;
  const to = end && end < monthEnd ? end : monthEnd;
  if (from > to) return 0;
  if (from === monthStart && to === monthEnd) return 1;
  const firstDay = Number(from.slice(8, 10));
  const lastDay = Number(to.slice(8, 10));
  if (!lessonDays.length) return (lastDay - firstDay + 1) / totalDays;
  let lessons = 0;
  for (let day = firstDay; day <= lastDay; day += 1) {
    if (lessonDays.includes(DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()])) lessons += 1;
  }
  return Math.min(lessons, 12) / 12;
};

const getExpectedAmountForMonth = (
  record: { start_date?: unknown; end_date?: unknown },
  monthlyAmount: unknown,
  monthKey: string,
  lessonDays: string[] = []
) => {
  const monthly = Number(monthlyAmount || 0);
  if (!monthly) return 0;
  const share = getMonthShare(record, monthKey, lessonDays);
  return share === 1 ? monthly : roundMoney(monthly * share);
};

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const buildTeacherGroupPayments = ({
  monthKey,
  salaryPercentage,
  classes,
  students,
  payments,
  salary = null,
}: {
  monthKey: string;
  salaryPercentage: unknown;
  classes: Array<{ class_id: number; class_name?: string | null; payment_amount?: unknown; section?: unknown }>;
  students: Array<{ student_id: number; class_id: number | null; first_name?: string | null; last_name?: string | null; start_date?: unknown; end_date?: unknown; status?: string | null }>;
  payments: Array<{ student_id: number | null; amount?: unknown; discount_amount?: unknown }>;
  salary?: any;
}) => {
  const share = Number(salaryPercentage);
  const sharePercent = Number.isFinite(share) && share > 0 ? share : 0;

  const paymentsByStudent = new Map<number, Array<{ amount?: unknown; discount_amount?: unknown }>>();
  payments.forEach((payment) => {
    const studentId = Number(payment.student_id);
    if (!studentId) return;
    if (!paymentsByStudent.has(studentId)) paymentsByStudent.set(studentId, []);
    paymentsByStudent.get(studentId)!.push(payment);
  });

  const groups = classes.map((classRow) => {
    const classId = Number(classRow.class_id);
    const monthlyFee = Number(classRow.payment_amount || 0);
    const lessonDays = lessonDaysOf(classRow.section);

    const groupStudents = students
      .filter((student) => Number(student.class_id) === classId)
      .map((student) => {
        const studentPayments = paymentsByStudent.get(Number(student.student_id)) || [];
        const paid = roundMoney(studentPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
        const discount = Math.max(0, ...studentPayments.map((payment) => Number(payment.discount_amount || 0)));
        const expected = roundMoney(Math.max(0, getExpectedAmountForMonth(student, monthlyFee, monthKey, lessonDays) - discount));
        const state: PaymentState = paid <= 0 ? 'unpaid' : expected > 0 && paid + 0.01 < expected ? 'partial' : 'paid';
        return {
          student_id: Number(student.student_id),
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || `#${student.student_id}`,
          state,
          expected,
          paid,
          remaining: state === 'paid' ? 0 : roundMoney(Math.max(0, expected - paid)),
          // Moved to another teacher's group this month: still part of this teacher's salary for the
          // days they were here, shown in red, and gone from the list once the month is over.
          transferred: String(student.status || '') === 'Transferred',
        };
      })
      // A record that was not in this group during the month (transferred out before it, or in
      // after it) and paid nothing for it has nothing to show here.
      .filter((student) => student.expected > 0 || student.paid > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    const expected = roundMoney(groupStudents.reduce((sum, student) => sum + student.expected, 0));
    const collected = roundMoney(groupStudents.reduce((sum, student) => sum + student.paid, 0));
    const remaining = roundMoney(groupStudents.reduce((sum, student) => sum + student.remaining, 0));
    return {
      class_id: classId,
      class_name: classRow.class_name || `#${classId}`,
      monthly_fee: monthlyFee,
      total_students: groupStudents.length,
      paid_students: groupStudents.filter((student) => student.state === 'paid').length,
      partial_students: groupStudents.filter((student) => student.state === 'partial').length,
      unpaid_students: groupStudents.filter((student) => student.state === 'unpaid').length,
      expected,
      collected,
      remaining,
      collected_percent: percentOf(collected, expected),
      teacher_share: roundMoney((collected * sharePercent) / 100),
      students: groupStudents,
    };
  });

  const sum = (key: 'expected' | 'collected' | 'remaining' | 'total_students' | 'paid_students' | 'partial_students' | 'unpaid_students') =>
    groups.reduce((total, group) => total + group[key], 0);
  const expected = roundMoney(sum('expected'));
  const collected = roundMoney(sum('collected'));

  return {
    month: monthKey,
    salary_percentage: sharePercent,
    totals: {
      groups: groups.length,
      total_students: sum('total_students'),
      paid_students: sum('paid_students'),
      partial_students: sum('partial_students'),
      unpaid_students: sum('unpaid_students'),
      expected,
      collected,
      remaining: roundMoney(sum('remaining')),
      collected_percent: percentOf(collected, expected),
      // What the teacher earns from the money already in, and what they would earn if every
      // student paid in full.
      current_salary: roundMoney((collected * sharePercent) / 100),
      potential_salary: roundMoney((Math.max(expected, collected) * sharePercent) / 100),
    },
    // The salary the center actually recorded for this month, if any.
    salary_record: salary,
    groups,
  };
};

module.exports = { buildTeacherGroupPayments, getExpectedAmountForMonth, getMonthShare, lessonDaysOf };

export {};
