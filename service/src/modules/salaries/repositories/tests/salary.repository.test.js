const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { teacherSalaries } = require('../../../../db/schema');
const salaryRepository = require('../salary.repository');

const createInsertChain = (rows) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.onConflictDoUpdate = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

describe('salary repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts on the (teacher, year, month) conflict target instead of inserting a duplicate row', async () => {
    const chain = createInsertChain([
      { salary_id: 42, teacher_id: 7, salary_year: 2026, salary_month: 9, is_paid: true },
    ]);
    mockDb.insert.mockReturnValue(chain);

    const payload = {
      teacherId: 7,
      centerId: 2,
      salaryYear: 2026,
      salaryMonth: 9,
      amount: 1500000,
      isPaid: true,
      markedById: 3,
      markedByUserType: 'superuser',
      markedByRole: 'owner',
      markedByName: 'Jane',
      paymentMethod: 'cash',
      notes: 'paid in full',
    };

    const first = await salaryRepository.upsertRecord(payload);
    const second = await salaryRepository.upsertRecord(payload);

    // Two calls to mark-as-paid should insert twice at the SQL level (each is
    // an INSERT ... ON CONFLICT DO UPDATE statement) but always target the same
    // conflict key, so Postgres updates the existing row rather than creating a
    // second one.
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    expect(chain.onConflictDoUpdate).toHaveBeenCalledTimes(2);

    const firstConflict = chain.onConflictDoUpdate.mock.calls[0][0];
    const secondConflict = chain.onConflictDoUpdate.mock.calls[1][0];

    expect(firstConflict.target).toEqual([
      teacherSalaries.teacherId,
      teacherSalaries.salaryYear,
      teacherSalaries.salaryMonth,
    ]);
    expect(secondConflict.target).toEqual(firstConflict.target);

    expect(firstConflict.set).toMatchObject({ isPaid: true, amount: '1500000' });
    expect(secondConflict.set).toMatchObject({ isPaid: true, amount: '1500000' });

    // Both calls resolve to the same identity because .returning() reflects the
    // single row Postgres would have after an upsert -- a real duplicate-row bug
    // would surface here as two different salary_ids.
    expect(first.salary_id).toBe(42);
    expect(second.salary_id).toBe(42);
    expect(first.salary_id).toBe(second.salary_id);
  });

  it('re-marking a salary as unpaid updates isPaid/paidAt in the same conflict clause rather than creating a new row', async () => {
    const chain = createInsertChain([{ salary_id: 42, teacher_id: 7, salary_year: 2026, salary_month: 9, is_paid: false }]);
    mockDb.insert.mockReturnValue(chain);

    await salaryRepository.upsertRecord({
      teacherId: 7,
      centerId: 2,
      salaryYear: 2026,
      salaryMonth: 9,
      amount: 1500000,
      isPaid: false,
    });

    const conflict = chain.onConflictDoUpdate.mock.calls[0][0];
    expect(conflict.set.isPaid).toBe(false);
    expect(conflict.target).toEqual([
      teacherSalaries.teacherId,
      teacherSalaries.salaryYear,
      teacherSalaries.salaryMonth,
    ]);
  });

  it('findRecord looks up by the same (teacher, year, month) key used for the upsert conflict target', async () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.limit = jest.fn(() => Promise.resolve([{ salary_id: 42 }]));
    mockDb.select.mockReturnValue(chain);

    const record = await salaryRepository.findRecord(7, 2026, 9, 2);

    expect(mockDb.select).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(1);
    expect(record).toEqual({ salary_id: 42 });
  });
});
