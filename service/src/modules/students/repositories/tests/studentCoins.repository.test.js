const mockDb = {
  transaction: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const studentCoinsRepository = require('../studentCoins.repository');

// A single chain shape covers every Drizzle builder call this repository makes:
// whichever terminal method is invoked (.limit(), .returning(), or a bare await
// of the builder itself) resolves to the configured value.
const createChain = (resolvedValue) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  chain.values = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(resolvedValue));
  chain.returning = jest.fn(() => Promise.resolve(resolvedValue));
  chain.then = jest.fn((resolve) => resolve(resolvedValue));
  return chain;
};

describe('studentCoins repository', () => {
  let tx;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = { select: jest.fn(), update: jest.fn(), insert: jest.fn(), delete: jest.fn() };
    mockDb.transaction.mockImplementation(async (callback) => callback(tx));
  });

  // RMC-053 (characterization, NOT fixed): addTransaction floors a resulting balance
  // at -9999, while updateTransaction/deleteTransaction floor at 0. These tests pin
  // down the current, still-asymmetric behavior of each function at its own floor.
  describe('coin floor asymmetry between add and edit paths', () => {
    it('addTransaction allows a balance down to exactly -9999 (its own floor)', async () => {
      tx.select.mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, teacher_id: null, coins: 1 }]));
      tx.update.mockReturnValueOnce(createChain(undefined));
      tx.insert.mockReturnValueOnce(createChain([{ transaction_id: 10 }]));

      const result = await studentCoinsRepository.addTransaction(1, -10000, 'penalty', null, null);

      expect(result).toEqual({ balance: -9999, transaction: { transaction_id: 10 } });
    });

    it('addTransaction rejects a balance one below its -9999 floor', async () => {
      tx.select.mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, coins: 1 }]));

      const result = await studentCoinsRepository.addTransaction(1, -10001, 'penalty', null, null);

      expect(result).toEqual({ error: 'insufficient', balance: 1 });
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('updateTransaction rejects a balance that addTransaction would have allowed, because its floor is 0 not -9999', async () => {
      // Student already sits at -9000 coins (reachable only through addTransaction's
      // permissive -9999 floor). Editing the transaction that put them there so the
      // result becomes -9001 -- still above addTransaction's own floor -- is rejected
      // by updateTransaction purely because updateTransaction's floor is 0.
      tx.select
        .mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, coins: -9000 }])) // findStudent
        .mockReturnValueOnce(createChain([{ delta: -9000 }])); // existing transaction

      const result = await studentCoinsRepository.updateTransaction(1, 55, -9001, 'adjustment');

      expect(result).toEqual({ error: 'insufficient', balance: -9000 });
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('updateTransaction allows a balance down to exactly 0 (its own floor)', async () => {
      tx.select
        .mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, coins: 100 }]))
        .mockReturnValueOnce(createChain([{ delta: 100 }]));
      tx.update
        .mockReturnValueOnce(createChain(undefined)) // students.coins update
        .mockReturnValueOnce(createChain([{ transaction_id: 55, delta: 0 }])); // transaction row update

      const result = await studentCoinsRepository.updateTransaction(1, 55, 0, 'adjustment');

      expect(result).toEqual({ balance: 0, transaction: { transaction_id: 55, delta: 0 } });
    });

    it('deleteTransaction rejects a balance that addTransaction would have allowed, because its floor is 0 not -9999', async () => {
      // Same student at -9000 coins. Removing a transaction that only contributed
      // -500 of that would leave -8500 -- comfortably above addTransaction's -9999
      // floor -- but deleteTransaction rejects any negative result.
      tx.select
        .mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, coins: -9000 }])) // findStudent
        .mockReturnValueOnce(createChain([{ delta: -500 }])); // existing transaction

      const result = await studentCoinsRepository.deleteTransaction(1, 77);

      expect(result).toEqual({ error: 'insufficient', balance: -9000 });
      expect(tx.update).not.toHaveBeenCalled();
      expect(tx.delete).not.toHaveBeenCalled();
    });

    it('deleteTransaction allows a balance down to exactly 0 (its own floor)', async () => {
      tx.select
        .mockReturnValueOnce(createChain([{ student_id: 1, center_id: 2, coins: 500 }]))
        .mockReturnValueOnce(createChain([{ delta: 500 }]));
      tx.update.mockReturnValueOnce(createChain(undefined));
      tx.delete.mockReturnValueOnce(createChain(undefined));

      const result = await studentCoinsRepository.deleteTransaction(1, 77);

      expect(result).toEqual({ balance: 0 });
    });
  });
});
