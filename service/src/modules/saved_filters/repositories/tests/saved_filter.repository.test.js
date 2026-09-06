const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const savedFilterRepository = require('../saved_filter.repository');

const dialect = new PgDialect();

const createMutationChain = (rows) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

// RMC-051: update/remove always scope by (id, userType, userId, centerId) together, so one
// user cannot update or delete another user's saved filter even by guessing its id.
describe('saved filters repository ownership isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('update scopes its WHERE clause to the filter id and the caller own userType/userId/centerId', async () => {
    const chain = createMutationChain([{ filter_id: 1, name: 'Mine' }]);
    mockDb.update.mockReturnValueOnce(chain);

    const result = await savedFilterRepository.update(1, 'teacher', 4, 2, 'Mine', null);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([1, 'teacher', 4, 2]);
    expect(result).toEqual({ filter_id: 1, name: 'Mine' });
  });

  it('update is a no-op (returns null) when the filter belongs to a different user', async () => {
    // Filter #1 actually belongs to user 4; user 999 attempts to update it. The real WHERE
    // clause is built from user 999's own id, so it matches zero rows against user 4's filter.
    const chain = createMutationChain([]);
    mockDb.update.mockReturnValueOnce(chain);

    const result = await savedFilterRepository.update(1, 'teacher', 999, 2, 'Hijacked', null);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([1, 'teacher', 999, 2]);
    expect(result).toBeNull();
  });

  it('remove scopes its WHERE clause to the filter id and the caller own userType/userId/centerId', async () => {
    const chain = createMutationChain([{ filter_id: 3 }]);
    mockDb.delete.mockReturnValueOnce(chain);

    const result = await savedFilterRepository.remove(3, 'superuser', 5, 2);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([3, 'superuser', 5, 2]);
    expect(result).toEqual({ filter_id: 3 });
  });

  it('remove is a no-op (returns null) when attempting to delete another user filter', async () => {
    const chain = createMutationChain([]);
    mockDb.delete.mockReturnValueOnce(chain);

    const result = await savedFilterRepository.remove(3, 'superuser', 999, 2);

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual([3, 'superuser', 999, 2]);
    expect(result).toBeNull();
  });

  it('findForUser only ever queries by the given userType and userId, optionally center and entity scoped', async () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => Promise.resolve([]));
    mockDb.select.mockReturnValueOnce(chain);

    await savedFilterRepository.findForUser('teacher', 4, 2, 'students');

    const condition = chain.where.mock.calls[0][0];
    expect(dialect.sqlToQuery(condition).params).toEqual(['teacher', 4, 2, 'students']);
  });
});
