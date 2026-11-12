export {};

// A student moved to another teacher partway through a month and later pays for the whole month
// in the new group. The money is split by the lessons each group taught that month: each earlier
// group gets the part of the payment its lessons were worth (its lessons' share of the month
// times that month's group price), never more than it is still owed for that month. The rest
// stays with the group the payment was taken in. So the first teacher is paid for the lessons
// they taught and the student does not show as unpaid in their old group.

export type MonthShare = { student_id: number; expected: number; paid: number; share?: number; center_id?: number | null; class_id?: number | null };

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** The parts of `amount` that go to earlier group records; empty when nothing is split. */
const splitTransferPayment = (amount: number, shares: MonthShare[], studentId: number) => {
  const paid = Number(amount || 0);
  if (!(paid > 0)) return [];
  const earlier = shares.filter((row) => row.student_id !== studentId && Number(row.expected) > 0);
  if (earlier.length === 0) return [];
  const totalExpected = shares.reduce((sum, row) => sum + Math.max(0, Number(row.expected) || 0), 0);
  if (!(totalExpected > 0)) return [];

  let left = paid;
  const parts: Array<MonthShare & { amount: number }> = [];
  for (const row of earlier) {
    const owed = Math.max(0, roundMoney(Number(row.expected) - Number(row.paid || 0)));
    const byLessons = roundMoney((paid * Number(row.expected)) / totalExpected);
    const part = Math.min(owed, byLessons, left);
    if (part > 0) {
      parts.push({ ...row, amount: part });
      left = roundMoney(left - part);
    }
  }
  return parts;
};

// Payments made by the transfer itself, or by an earlier split, are never split again.
const SPLIT_FREE_TYPES = new Set(['transfer adjustment', 'transfer split']);
const isSplittable = (paymentType: unknown) => !SPLIT_FREE_TYPES.has(String(paymentType || '').trim().toLowerCase());

module.exports = { splitTransferPayment, isSplittable };
