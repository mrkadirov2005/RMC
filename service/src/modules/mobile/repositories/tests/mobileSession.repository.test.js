const mockDb = { select: jest.fn(), transaction: jest.fn() };

jest.mock('../../../../db/pool', () => ({ db: mockDb, sql: require('drizzle-orm').sql }));

const repo = require('../mobileSession.repository');

// A drizzle query stand-in: every builder call returns the chain, awaiting it yields `rows`.
const chain = (rows) => {
  const c = {};
  ['from', 'innerJoin', 'where', 'orderBy', 'for', 'values', 'set'].forEach((m) => {
    c[m] = jest.fn(() => c);
  });
  c.returning = jest.fn(() => Promise.resolve(rows));
  c.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  return c;
};

const txWith = (...results) => {
  const queue = [...results];
  const next = () => chain(queue.length ? queue.shift() : []);
  return { insert: jest.fn(next), update: jest.fn(next), select: jest.fn(next) };
};

describe('mobile session repository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('runs callbacks in a transaction', async () => {
    mockDb.transaction.mockImplementation((cb) => cb('tx'));
    await expect(repo.withTransaction(async (tx) => tx)).resolves.toBe('tx');
  });

  // @MOB-022
  it('createSession first revokes the device earlier sessions and their tokens', async () => {
    const tx = txWith([{ session_id: 3 }], [], [{ session_id: 4 }]);

    const session = await repo.createSession(tx, { userType: 'student', userId: 7, deviceId: 'd' });

    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(session).toEqual({ session_id: 4 });
  });

  it('inserts, marks, touches and revokes through the transaction', async () => {
    const tx = txWith();
    await repo.insertRefreshToken(tx, 4, 'hash', new Date());
    await repo.markTokenUsed(tx, 1);
    await repo.touchSession(tx, 4);
    await repo.revokeSession(tx, 4);
    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(4);
  });

  // @MOB-023
  it('locks the refresh token row it reads', async () => {
    const tx = txWith([{ token_id: 1 }]);
    await expect(repo.findRefreshTokenForUpdate(tx, 'h')).resolves.toEqual({ token_id: 1 });

    const c = tx.select.mock.results[0].value;
    expect(c.for).toHaveBeenCalledWith('update');

    await expect(repo.findRefreshTokenForUpdate(txWith([]), 'h')).resolves.toBeNull();
  });

  it('reads active sessions', async () => {
    mockDb.select.mockReturnValueOnce(chain([{ session_id: 1 }]));
    await expect(repo.findActiveSession(1)).resolves.toEqual({ session_id: 1 });

    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(repo.findActiveSession(2)).resolves.toBeNull();

    mockDb.select.mockReturnValueOnce(chain([{ session_id: 1 }, { session_id: 2 }]));
    await expect(repo.listActiveSessions('parent', 11)).resolves.toHaveLength(2);

    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(repo.findUserSession('parent', 11, 9)).resolves.toBeNull();
  });
});
