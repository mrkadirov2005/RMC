export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthKey = (dateKey?: string) => {
  if (dateKey && /^\d{4}-\d{2}/.test(dateKey)) return dateKey.slice(0, 7);
  return toDateKey(new Date()).slice(0, 7);
};

export const shiftMonth = (monthKey: string, offset: number) => {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1 + offset, 1);
  return toDateKey(date).slice(0, 7);
};

export const monthLabel = (monthKey: string) => {
  const [yearRaw, monthRaw] = monthKey.split('-');
  return new Date(Number(yearRaw), Number(monthRaw) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
