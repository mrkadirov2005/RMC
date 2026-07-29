const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const paymentRepository = require('../payment.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.offset = jest.fn(() => chain);
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const createMutationChain = (rows) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

describe('payments repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters payment listing by teacher, center, student, limit, and offset with Drizzle builders', async () => {
    const chain = createSelectChain([{ payment_id: 1 }]);
    mockDb.select.mockReturnValueOnce(chain);

    const rows = await paymentRepository.findAll({ teacherId: 4, centerId: 2, studentId: 9, limit: 10, offset: 20 });

    expect(mockDb.select).toHaveBeenCalled();
    expect(chain.leftJoin).toHaveBeenCalledTimes(2);
    expect(chain.where).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.offset).toHaveBeenCalledWith(20);
    expect(rows).toEqual([{ payment_id: 1 }]);
  });

  it('updates payments after scoped lookup', async () => {
    const lookup = createSelectChain([{ payment_id: 3 }]);
    const update = createMutationChain([{ payment_id: 3 }]);
    mockDb.select.mockReturnValueOnce(lookup);
    mockDb.update.mockReturnValueOnce(update);

    await expect(paymentRepository.update(3, [1000, 'Completed', 'ok'], 2, 4)).resolves.toEqual({ payment_id: 3 });

    expect(mockDb.update).toHaveBeenCalled();
    expect(update.set).toHaveBeenCalled();
    expect(update.where).toHaveBeenCalled();
  });

  it('orders student payments by newest payment date', async () => {
    const chain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(chain);

    await paymentRepository.findByStudent(5, 2);

    expect(chain.orderBy).toHaveBeenCalled();
  });
});
