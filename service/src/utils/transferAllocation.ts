/**
 * Splits a student's month between the group they leave and the group they join.
 *
 * Calendar days decide the split: the source group earns its monthly fee for the days
 * before the transfer date, and whatever the student paid beyond that moves to the new
 * group. The moved amount is never rescaled to the target price, so money is conserved:
 * if it exceeds the target's prorated charge the student carries a balance, and if it
 * falls short the student still owes the difference in the new group.
 */

const CENTER_TIME_ZONE = 'Asia/Tashkent';

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

// Centers work in Tashkent time; using the server's UTC date would move a late-evening
// transfer to the previous day.
const todayInCenterTimeZone = (now = new Date()) => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const buildTransferAllocation = (
  sourceMonthlyAmount: unknown,
  targetMonthlyAmount: unknown,
  paidAmount: unknown,
  transferDate: Date,
  sourceStartDate?: unknown
) => {
  const sourceMonthly = Number(sourceMonthlyAmount || 0);
  const targetMonthly = Number(targetMonthlyAmount || 0);
  const paid = Number(paidAmount || 0);
  const effectiveDate = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), transferDate.getUTCDate()));
  const monthStart = new Date(Date.UTC(effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth() + 1, 0));
  const totalDays = monthEnd.getUTCDate();
  // A record that itself started mid-month (an earlier transfer) only earns from its start day.
  const startedOn = sourceStartDate ? new Date(`${String(sourceStartDate).slice(0, 10)}T00:00:00Z`) : null;
  const firstSourceDay = startedOn && startedOn >= monthStart && startedOn <= effectiveDate ? startedOn.getUTCDate() : 1;
  const sourceDays = Math.max(effectiveDate.getUTCDate() - firstSourceDay, 0);
  const targetDays = totalDays - effectiveDate.getUTCDate() + 1;
  const sourceEarned = roundMoney((sourceMonthly * sourceDays) / totalDays);
  const movedAmount = roundMoney(Math.max(paid - sourceEarned, 0));
  const targetCharge = roundMoney((targetMonthly * targetDays) / totalDays);

  return {
    monthStart,
    monthEnd,
    effectiveDate,
    totalDays,
    sourceDays,
    targetDays,
    sourceMonthly,
    targetMonthly,
    paidAmount: paid,
    sourceEarned,
    movedAmount,
    targetCharge,
    // Positive: the student is ahead in the new group. Negative: they still owe this much.
    targetBalance: roundMoney(movedAmount - targetCharge),
  };
};

module.exports = {
  CENTER_TIME_ZONE,
  roundMoney,
  toDateOnly,
  todayInCenterTimeZone,
  buildTransferAllocation,
};

export {};
