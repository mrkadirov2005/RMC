// Which of a teacher's students paid for a month, group by group (salary page → Students' payments).

export type StudentPaymentState = 'paid' | 'partial' | 'unpaid';

/** One row of GET /payments/students-summary (the same data as Dashboard → To'lovlar). */
export interface StudentPaymentRow {
  student_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  parent_phone: string | null;
  class_id: number | null;
  class_name: string | null;
  monthly_fee: number;
  paid_amount: number;
  expected: number;
  remaining: number;
  payments_count: number;
  last_payment_date: string | null;
  state: StudentPaymentState;
}

export interface StudentPaymentGroup {
  classId: number | null;
  className: string;
  monthlyFee: number;
  students: StudentPaymentRow[];
  paid: number;
  partial: number;
  unpaid: number;
  collected: number;
  expected: number;
}

export interface StudentPaymentTotals {
  students: number;
  paid: number;
  partial: number;
  unpaid: number;
  collected: number;
  remaining: number;
}

export const studentName = (row: Pick<StudentPaymentRow, 'first_name' | 'last_name' | 'student_id'>) =>
  `${row.first_name || ''} ${row.last_name || ''}`.trim() || `ID ${row.student_id}`;

/** First and last day of a month as YYYY-MM-DD. */
export const monthRange = (year: number, month: number) => {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
};

/** Students grouped by their group, groups by name; inside a group unpaid first, then partly paid, then paid. */
export const groupStudentPayments = (rows: StudentPaymentRow[]): StudentPaymentGroup[] => {
  const order: Record<StudentPaymentState, number> = { unpaid: 0, partial: 1, paid: 2 };
  const groups = new Map<string, StudentPaymentGroup>();
  rows.forEach((row) => {
    const key = String(row.class_id ?? 'none');
    const group = groups.get(key) ?? {
      classId: row.class_id,
      className: row.class_name || '—',
      monthlyFee: Number(row.monthly_fee || 0),
      students: [],
      paid: 0,
      partial: 0,
      unpaid: 0,
      collected: 0,
      expected: 0,
    };
    group.students.push(row);
    group[row.state] += 1;
    group.collected += Number(row.paid_amount || 0);
    group.expected += Number(row.expected || 0);
    groups.set(key, group);
  });
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      students: group.students.slice().sort((a, b) => order[a.state] - order[b.state] || studentName(a).localeCompare(studentName(b))),
    }))
    .sort((a, b) => a.className.localeCompare(b.className));
};

export const totalStudentPayments = (rows: StudentPaymentRow[]): StudentPaymentTotals =>
  rows.reduce<StudentPaymentTotals>(
    (sum, row) => ({
      students: sum.students + 1,
      paid: sum.paid + (row.state === 'paid' ? 1 : 0),
      partial: sum.partial + (row.state === 'partial' ? 1 : 0),
      unpaid: sum.unpaid + (row.state === 'unpaid' ? 1 : 0),
      collected: sum.collected + Number(row.paid_amount || 0),
      remaining: sum.remaining + Number(row.remaining || 0),
    }),
    { students: 0, paid: 0, partial: 0, unpaid: 0, collected: 0, remaining: 0 }
  );
