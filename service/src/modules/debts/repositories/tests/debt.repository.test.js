const mockDb = { select: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({ db: mockDb }));

jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  eq: jest.fn((...args) => ({ __op: 'eq', args })),
  and: jest.fn((...args) => ({ __op: 'and', args })),
}));

const { debts } = require('../../../../db/schema');
const debtRepository = require('../debt.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  return chain;
};

const createDeleteChain = (rows) => {
  const chain = {};
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

// RMC-070/RMC-037: remove() must scope the DELETE statement itself to the caller's
// center, not just the existence check that runs before it.
describe('debt repository remove() center scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes a center_id condition on the delete query when a centerId is scoped', async () => {
    mockDb.select.mockReturnValue(createSelectChain([{ debt_id: 5 }]));
    const deleteChain = createDeleteChain([{ debt_id: 5 }]);
    mockDb.delete.mockReturnValue(deleteChain);

    const result = await debtRepository.remove(5, 3, undefined);

    expect(mockDb.delete).toHaveBeenCalledWith(debts);
    const whereArg = deleteChain.where.mock.calls[0][0];
    expect(whereArg.__op).toBe('and');
    expect(whereArg.args).toContainEqual({ __op: 'eq', args: [debts.centerId, 3] });
    expect(whereArg.args).toContainEqual({ __op: 'eq', args: [debts.debtId, 5] });
    expect(result).toEqual({ debt_id: 5 });
  });

  it('does not add a center_id condition to the delete when no center is scoped (global/superuser access)', async () => {
    mockDb.select.mockReturnValue(createSelectChain([{ debt_id: 5 }]));
    const deleteChain = createDeleteChain([{ debt_id: 5 }]);
    mockDb.delete.mockReturnValue(deleteChain);

    await debtRepository.remove(5, undefined, undefined);

    const whereArg = deleteChain.where.mock.calls[0][0];
    expect(whereArg.args).toEqual([{ __op: 'eq', args: [debts.debtId, 5] }]);
  });

  it('never issues the delete when the scoped existence check finds nothing', async () => {
    mockDb.select.mockReturnValue(createSelectChain([]));

    const result = await debtRepository.remove(5, 3, undefined);

    expect(result).toBeNull();
    expect(mockDb.delete).not.toHaveBeenCalled();
  });
});
