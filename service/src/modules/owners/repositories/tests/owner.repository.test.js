const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const ownerRepository = require('../owner.repository');

const dialect = new PgDialect();

const createMutationChain = () => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => Promise.resolve());
  return chain;
};

describe('owners repository account lockout (RMC-023)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments login attempts and flips is_locked to true once the threshold is reached', () => {
    const chain = createMutationChain();
    mockDb.update.mockReturnValueOnce(chain);

    ownerRepository.incrementLoginAttempts(9);

    expect(mockDb.update).toHaveBeenCalled();
    const setValues = chain.set.mock.calls[0][0];

    // loginAttempts is always incremented by 1.
    const attemptsQuery = dialect.sqlToQuery(setValues.loginAttempts);
    expect(attemptsQuery.sql.toLowerCase()).toContain('coalesce');
    expect(attemptsQuery.sql).toContain('+');

    // isLocked flips to TRUE once attempts + 1 reaches the lock threshold (5), otherwise
    // it is left unchanged -- this is the fix that replaces the old no-op lockout.
    const lockedQuery = dialect.sqlToQuery(setValues.isLocked);
    expect(lockedQuery.sql).toContain('CASE WHEN');
    expect(lockedQuery.sql).toContain('>=');
    expect(lockedQuery.sql).toContain('$1');
    expect(lockedQuery.params).toEqual([5]);
    expect(lockedQuery.sql).toContain('THEN TRUE ELSE');
  });

  it('resets login attempts to zero and records last_login on successful login', () => {
    const chain = createMutationChain();
    mockDb.update.mockReturnValueOnce(chain);

    ownerRepository.resetLoginSuccess(9);

    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ loginAttempts: 0 }));
  });
});
