// Months for the "Debts by month" view: a from/to month pair (YYYY-MM) as the day range the
// payments summary takes, and a few shortcuts.

const pad = (value: number) => String(value).padStart(2, '0');

export const monthKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const lastDayOfMonth = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return `${monthKey}-${pad(new Date(year, month, 0).getDate())}`;
};

export const shiftMonth = (monthKey: string, by: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  return monthKeyOf(new Date(year, month - 1 + by, 1));
};

/** From the first day of `from` to the last day of `to`; a reversed pair is swapped. */
export const monthRange = (from: string, to: string) => {
  const [start, end] = from <= to ? [from, to] : [to, from];
  return { from: `${start}-01`, to: lastDayOfMonth(end) };
};

/** "This month", "Last month" and "Earlier months" (the 6 months before this one). */
export const debtShortcuts = (today: Date) => {
  const now = monthKeyOf(today);
  return [
    { id: 'this', label: 'This month', from: now, to: now },
    { id: 'last', label: 'Last month', from: shiftMonth(now, -1), to: shiftMonth(now, -1) },
    { id: 'earlier', label: 'Earlier months', from: shiftMonth(now, -6), to: shiftMonth(now, -1) },
  ];
};
