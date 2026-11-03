const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const salaryRepository = require('../salary.repository');

const summaryChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.groupBy = jest.fn(() => Promise.resolve(rows));
  return chain;
};

// The center started using RMC for salaries in October 2026: earlier months have no records and
// must not show as unpaid months.
describe('salary months before the start month', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 15));
    mockDb.select.mockReturnValue(summaryChain([{ salary_year: 2026, salary_month: 10, total_amount: '5000000', paid_count: 3 }]));
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env = { ...env };
  });

  it('the monthly summary starts at October 2026 even when six months are asked for', async () => {
    delete process.env.SALARY_START_MONTH;
    await expect(salaryRepository.monthlySummary({ months: 6 })).resolves.toEqual([
      { year: 2026, month: 10, total_amount: 5000000, paid_count: 3 },
      { year: 2026, month: 11, total_amount: 0, paid_count: 0 },
    ]);
  });

  it('SALARY_START_MONTH moves the start', async () => {
    process.env.SALARY_START_MONTH = '2026-08';
    const months = await salaryRepository.monthlySummary({ months: 6 });
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-8', '2026-9', '2026-10', '2026-11']);
  });

});
