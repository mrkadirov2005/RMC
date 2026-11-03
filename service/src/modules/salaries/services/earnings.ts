// What a teacher earns for a salary month: their pay rate (teachers.salary_percentage, set by the owner)
// of the money their students paid. Money paid on time for the month counts in it; a payment for an
// earlier month that came in late counts in the month it came in, and is listed so everyone can see why.

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type EarningPayment = {
  payment_id: number;
  student_id: number;
  amount?: unknown;
  for_month?: string | null;
  entered_day?: string | null;
  late?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  class_id?: number | null;
  class_name?: string | null;
};

const ratePercent = (value: unknown) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
};

const buildTeacherEarnings = ({ salaryPercentage, payments }: { salaryPercentage: unknown; payments: EarningPayment[] }) => {
  const rate = ratePercent(salaryPercentage);
  const share = (amount: number) => roundMoney((amount * rate) / 100);
  const onTime = payments.filter((payment) => !payment.late);
  const late = payments.filter((payment) => payment.late);
  const total = (rows: EarningPayment[]) => roundMoney(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  const onTimeAmount = total(onTime);
  const lateAmount = total(late);
  return {
    rate,
    on_time_amount: onTimeAmount,
    late_amount: lateAmount,
    base_amount: roundMoney(onTimeAmount + lateAmount),
    // What the center owes the teacher for the month.
    due: share(onTimeAmount + lateAmount),
    paying_students: new Set(onTime.map((payment) => Number(payment.student_id))).size,
    late_payments: late.map((payment) => ({
      payment_id: Number(payment.payment_id),
      student_id: Number(payment.student_id),
      name: `${payment.first_name || ''} ${payment.last_name || ''}`.trim() || `#${payment.student_id}`,
      class_id: payment.class_id == null ? null : Number(payment.class_id),
      class_name: payment.class_name || null,
      for_month: payment.for_month || null,
      // The Tashkent day the payment was entered.
      entered_at: payment.entered_day || null,
      amount: roundMoney(Number(payment.amount) || 0),
      teacher_share: share(Number(payment.amount) || 0),
    })),
  };
};

/** The overview's per-teacher figures: everything but the late payment list, which only has a count. */
const summarizeEarnings = (earnings: ReturnType<typeof buildTeacherEarnings>) => {
  const { late_payments: latePayments, ...totals } = earnings;
  return { ...totals, late_count: latePayments.length };
};

module.exports = { buildTeacherEarnings, summarizeEarnings };

export {};
