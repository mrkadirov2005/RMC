// RMC-066: generateMonthlySessions' duplicate guard actually lives in
// sessionRepository.bulkInsert(), which re-checks (class_id, session_date,
// start_time) for an existing non-deleted row inside a transaction before
// inserting each session. This is reinforced by a DB-level unique index
// (ux_sessions_class_date_time_active) in db/schema.ts, but the app-level
// check is what determines whether a *second* generateMonthlySessions call
// for the same class/month creates duplicate rows or reports them as
// already-created. This test proves the guard works as designed: calling
// bulkInsert a second time with the same rows inserts nothing new.
const mockTx = {
  select: jest.fn(),
  insert: jest.fn(),
};
const mockDb = {
  transaction: jest.fn(async (handler) => handler(mockTx)),
};

jest.mock('../../../../db/pool', () => ({ db: mockDb }));

const sessionRepository = require('../session.repository');

const makeSelectChain = (existingRows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(existingRows));
  return chain;
};

const makeInsertChain = () => {
  const chain = {};
  chain.values = jest.fn(() => Promise.resolve());
  return chain;
};

const rows = [
  { center_id: 2, class_id: 7, teacher_id: 4, session_date: '2026-09-07', start_time: '09:00', duration_minutes: 60, end_time: '10:00' },
  { center_id: 2, class_id: 7, teacher_id: 4, session_date: '2026-09-09', start_time: '09:00', duration_minutes: 60, end_time: '10:00' },
];

describe('session repository — bulkInsert idempotency (RMC-066)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.transaction.mockImplementation(async (handler) => handler(mockTx));
  });

  it('creates every row on the first call when none already exist', async () => {
    mockTx.select.mockImplementation(() => makeSelectChain([])); // no existing row found for any date
    mockTx.insert.mockImplementation(() => makeInsertChain());

    const result = await sessionRepository.bulkInsert(rows);

    expect(result).toEqual({ created: 2 });
    expect(mockTx.insert).toHaveBeenCalledTimes(2);
  });

  it('is idempotent: calling it again for the same class/month rows creates nothing new', async () => {
    // Simulate the second generateMonthlySessions call: every (class_id, date, start_time)
    // combination now already has a non-deleted row.
    mockTx.select.mockImplementation(() => makeSelectChain([{ session_id: 501 }]));
    mockTx.insert.mockImplementation(() => makeInsertChain());

    const result = await sessionRepository.bulkInsert(rows);

    expect(result).toEqual({ created: 0 });
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('only inserts the rows that do not already exist in a mixed batch', async () => {
    let call = 0;
    mockTx.select.mockImplementation(() => makeSelectChain(call++ === 0 ? [] : [{ session_id: 501 }]));
    mockTx.insert.mockImplementation(() => makeInsertChain());

    const result = await sessionRepository.bulkInsert(rows);

    expect(result).toEqual({ created: 1 });
    expect(mockTx.insert).toHaveBeenCalledTimes(1);
  });

  it('returns created: 0 immediately for an empty row set without opening a transaction', async () => {
    const result = await sessionRepository.bulkInsert([]);

    expect(result).toEqual({ created: 0 });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});
