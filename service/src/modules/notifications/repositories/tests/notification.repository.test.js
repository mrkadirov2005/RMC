const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const notificationRepository = require('../notification.repository');

const dialect = new PgDialect();

const createMutationChain = (rows) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

// RMC-040 / RMC-075: markRead and remove already scope their WHERE clause by the caller's own
// userType + userId (in addition to the notification id), so one user cannot act on another
// user's notification even without a route-level ownership check. These tests prove the filter
// is actually built from the caller's own identity and that a mismatched id/user is a no-op.
describe('notifications repository user isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('markRead scopes its WHERE clause to the notification id and the caller own userType/userId', async () => {
    const chain = createMutationChain([{ notification_id: 5, is_read: true }]);
    mockDb.update.mockReturnValueOnce(chain);

    const result = await notificationRepository.markRead(5, 'teacher', 4, 2);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([5, 'teacher', 4, 2]);
    expect(result).toEqual({ notification_id: 5, is_read: true });
  });

  it('markRead is a no-op (returns null) when the notification does not belong to the calling user', async () => {
    // Simulates notification #5 actually belonging to user 4; user 999 (a different account)
    // tries to mark it read. The real WHERE clause (userId = 999) would match zero rows.
    const chain = createMutationChain([]);
    mockDb.update.mockReturnValueOnce(chain);

    const result = await notificationRepository.markRead(5, 'teacher', 999);

    const condition = chain.where.mock.calls[0][0];
    // The filter is built from the caller's own id (999), never the owning user's id (4) --
    // there is no way for the caller to smuggle another user's id into the scope.
    expect(dialect.sqlToQuery(condition).params).toEqual([5, 'teacher', 999]);
    expect(result).toBeNull();
  });

  it('remove scopes its WHERE clause to the notification id and the caller own userType/userId', async () => {
    const chain = createMutationChain([{ notification_id: 7 }]);
    mockDb.delete.mockReturnValueOnce(chain);

    const result = await notificationRepository.remove(7, 'superuser', 3, 2);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([7, 'superuser', 3, 2]);
    expect(result).toEqual({ notification_id: 7 });
  });

  it('remove is a no-op (returns null) when attempting to delete another user notification', async () => {
    const chain = createMutationChain([]);
    mockDb.delete.mockReturnValueOnce(chain);

    const result = await notificationRepository.remove(7, 'superuser', 999);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([7, 'superuser', 999]);
    expect(result).toBeNull();
  });

  it('findByUser only ever queries by the given userType and userId, optionally center-scoped', async () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => Promise.resolve([]));
    mockDb.select.mockReturnValueOnce(chain);

    await notificationRepository.findByUser('teacher', 4, 2);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual(['teacher', 4, 2]);
  });
});
