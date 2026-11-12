// The yellow notice in the payment form for a student who moved groups: each teacher the student
// was with in the month the payment settles, the days there, the lessons (of 12) and the part of
// the payment each group gets.

export type TransferSplitGroup = {
  student_id: number;
  class_name: string | null;
  teacher_name: string | null;
  start_date: string | null;
  end_date: string | null;
  lessons: number;
  expected: number;
  paid: number;
  current: boolean;
  split_amount: number | null;
};

export type TransferSplitPreview = {
  months: Array<{ month: string; groups: TransferSplitGroup[] }>;
  split_total: number;
  kept_amount: number;
} | null;

const lastDayOf = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
};

/** The days of the month the student was in the group, like "1–15" or "16–31". */
export const daysInMonthText = (month: string, group: Pick<TransferSplitGroup, 'start_date' | 'end_date'>) => {
  const first = `${month}-01`;
  const last = `${month}-${String(lastDayOf(month)).padStart(2, '0')}`;
  const from = group.start_date && group.start_date > first ? group.start_date : first;
  const to = group.end_date && group.end_date < last ? group.end_date : last;
  const fromDay = Number(from.slice(8, 10));
  const toDay = Number(to.slice(8, 10));
  return fromDay === toDay ? String(fromDay) : `${fromDay}–${toDay}`;
};

/** The part of the payment the group gets: its split, or what is left for the group being paid in. */
export const partFor = (group: TransferSplitGroup, preview: NonNullable<TransferSplitPreview>) =>
  group.current ? preview.kept_amount : Number(group.split_amount || 0);
