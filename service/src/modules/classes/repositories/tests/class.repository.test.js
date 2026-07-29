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

const classRepository = require('../class.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const createMutationChain = (rows) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

describe('classes repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds center and teacher scope to findAll with Drizzle builders', async () => {
    const chain = createSelectChain([{ class_id: 1 }]);
    mockDb.select.mockReturnValueOnce(chain);

    const rows = await classRepository.findAll(2, 7);

    expect(mockDb.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.orderBy).toHaveBeenCalled();
    expect(rows).toEqual([{ class_id: 1 }]);
  });

  it('checks teacher existence inside center scope with Drizzle builders', async () => {
    const chain = createSelectChain([{ teacher_id: 4 }]);
    mockDb.select.mockReturnValueOnce(chain);

    await expect(classRepository.teacherExists(4, 2)).resolves.toBe(true);

    expect(mockDb.select).toHaveBeenCalledWith(expect.objectContaining({ teacher_id: expect.any(Object) }));
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('soft deletes classes with center scope using Drizzle update', async () => {
    const chain = createMutationChain([{ class_id: 9 }]);
    mockDb.update.mockReturnValueOnce(chain);

    await expect(classRepository.remove(9, 3)).resolves.toEqual({ class_id: 9 });

    expect(mockDb.update).toHaveBeenCalled();
    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Object), updatedAt: expect.any(Object) }));
    expect(chain.where).toHaveBeenCalled();
    expect(chain.returning).toHaveBeenCalled();
  });
});
