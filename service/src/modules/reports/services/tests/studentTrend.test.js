jest.mock('../../repositories/studentTrend.repository', () => ({ countStudentsOn: jest.fn(async (dates) => dates.map((day) => ({ day, students: 0 }))) }));

const repository = require('../../repositories/studentTrend.repository');
const { studentTrend, trendDates } = require('../studentTrend.service');

describe('student count trend', () => {
  it('reads the count on the 10th, 20th and 30th, the last day in February, never in the future', () => {
    expect(trendDates('2026-03-15', 2)).toEqual(['2026-02-10', '2026-02-20', '2026-02-28', '2026-03-10']);
    expect(trendDates('2026-10-30', 1)).toEqual(['2026-10-10', '2026-10-20', '2026-10-30']);
    expect(trendDates('2026-01-05', 2)).toEqual(['2025-12-10', '2025-12-20', '2025-12-30']);
  });

  it('defaults to 12 months in Tashkent time and caps the range', async () => {
    await studentTrend({}, 4, new Date('2026-10-09T20:00:00Z'));
    const [dates, centerId] = repository.countStudentsOn.mock.calls[0];
    expect(centerId).toBe(4);
    expect(dates[0]).toBe('2025-11-10');
    expect(dates[dates.length - 1]).toBe('2026-10-10');
    await studentTrend({ months: 999 }, undefined, new Date('2026-10-09T08:00:00Z'));
    expect(repository.countStudentsOn.mock.calls[1][0]).toHaveLength(35 * 3 + 0);
  });
});
