const studentTrendRepository = require('../repositories/studentTrend.repository');

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The 10th, 20th and 30th (the last day in February) of each of the last `months` months, up to
 * `today`: the points the director reads the student count on.
 */
const trendDates = (today: string, months: number) => {
  const [year, month] = today.slice(0, 7).split('-').map(Number);
  const dates: string[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const first = new Date(Date.UTC(year, month - 1 - back, 1));
    const y = first.getUTCFullYear();
    const m = first.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (const day of [10, 20, Math.min(30, lastDay)]) {
      const date = `${y}-${pad(m)}-${pad(day)}`;
      if (date <= today) dates.push(date);
    }
  }
  return dates;
};

const centerToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

const studentTrend = async (query: { months?: unknown }, centerId?: number, now?: Date) => {
  const months = Math.min(36, Math.max(1, Number(query?.months) || 12));
  const dates = trendDates(centerToday(now), months);
  return studentTrendRepository.countStudentsOn(dates, centerId);
};

module.exports = { studentTrend, trendDates };
export {};
