// To'lovlar -> Statistics: one month at a glance. What should come in, what came in and the
// share collected, then how many teachers have already been paid their salary.

export type SummaryTotals = {
  students: number;
  paid_students: number;
  partial_students: number;
  unpaid_students: number;
  collected: number;
  remaining: number;
};

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const paymentMonthStats = (totals: Partial<SummaryTotals> | null | undefined) => {
  const collected = Number(totals?.collected || 0);
  const remaining = Number(totals?.remaining || 0);
  const expected = collected + remaining;
  const students = Number(totals?.students || 0);
  const paidStudents = Number(totals?.paid_students || 0);
  const collectedPercent = percent(collected, expected);
  return {
    expected,
    collected,
    remaining,
    collectedPercent,
    unpaidPercent: expected > 0 ? Math.round((100 - collectedPercent) * 10) / 10 : 0,
    students,
    paidStudents,
    partialStudents: Number(totals?.partial_students || 0),
    unpaidStudents: Number(totals?.unpaid_students || 0),
    paidStudentsPercent: percent(paidStudents, students),
  };
};

/** Teachers whose salary for the month is marked paid, out of all teachers in the overview. */
export const salaryPaidStats = (rows: Array<{ salary?: { is_paid?: boolean } | null }>) => {
  const teachers = rows.length;
  const paid = rows.filter((row) => row.salary?.is_paid === true).length;
  const paidPercent = percent(paid, teachers);
  return { teachers, paid, waiting: teachers - paid, paidPercent, waitingPercent: teachers > 0 ? Math.round((100 - paidPercent) * 10) / 10 : 0 };
};
