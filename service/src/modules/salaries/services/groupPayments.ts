// A teacher's own money view for one month: per group, what was expected, what came in and what is
// still owed, plus the teacher's share of what came in.
//
// The per-student rules mirror the admin group payment view (ui PaymentListView + shared/billingPeriod):
// the class fee is prorated by calendar days in the group for transferred students, the largest
// discount on the month's payments comes off it, and a student is paid once that is covered.

type PaymentState = 'paid' | 'partial' | 'unpaid';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDay = (value: unknown) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

const getDaysInGroupForMonth = (record: { start_date?: unknown; end_date?: unknown }, monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(totalDays).padStart(2, '0')}`;
  const start = toDay(record?.start_date);
  const end = toDay(record?.end_date);
  const from = start && start > monthStart ? start : monthStart;
  const to = end && end < monthEnd ? end : monthEnd;
  if (from > to) return { days: 0, totalDays };
  return { days: Number(to.slice(8, 10)) - Number(from.slice(8, 10)) + 1, totalDays };
};

const getExpectedAmountForMonth = (record: { start_date?: unknown; end_date?: unknown }, monthlyAmount: unknown, monthKey: string) => {
  const monthly = Number(monthlyAmount || 0);
  if (!monthly) return 0;
  const { days, totalDays } = getDaysInGroupForMonth(record, monthKey);
  return days === totalDays ? monthly : roundMoney((monthly * days) / totalDays);
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
  classes: Array<{ class_id: number; class_name?: string | null; payment_amount?: unknown }>;
  students: Array<{ student_id: number; class_id: number | null; first_name?: string | null; last_name?: string | null; start_date?: unknown; end_date?: unknown }>;
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

    const groupStudents = students
      .filter((student) => Number(student.class_id) === classId)
      .map((student) => {
        const studentPayments = paymentsByStudent.get(Number(student.student_id)) || [];
        const paid = roundMoney(studentPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
        const discount = Math.max(0, ...studentPayments.map((payment) => Number(payment.discount_amount || 0)));
        const expected = roundMoney(Math.max(0, getExpectedAmountForMonth(student, monthlyFee, monthKey) - discount));
        const state: PaymentState = paid <= 0 ? 'unpaid' : expected > 0 && paid + 0.01 < expected ? 'partial' : 'paid';
        return {
          student_id: Number(student.student_id),
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || `#${student.student_id}`,
          state,
          expected,
          paid,
          remaining: state === 'paid' ? 0 : roundMoney(Math.max(0, expected - paid)),
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

module.exports = { buildTeacherGroupPayments, getExpectedAmountForMonth };

export {};
