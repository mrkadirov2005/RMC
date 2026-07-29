const mockDb = {
  select: jest.fn(),
};

jest.mock('../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { studentBelongsToTeacher } = require('../tenantDb');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  return chain;
};

describe('tenant db ownership helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks student teacher ownership using class teacher first, then direct student teacher', async () => {
    const chain = createSelectChain([{ student_id: 12 }]);
    mockDb.select.mockReturnValueOnce(chain);

    await expect(studentBelongsToTeacher(12, 7)).resolves.toBe(true);

    expect(mockDb.select).toHaveBeenCalledWith(expect.objectContaining({ student_id: expect.any(Object) }));
    expect(chain.from).toHaveBeenCalled();
    expect(chain.leftJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('returns false when no effective teacher match exists', async () => {
    const chain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(chain);

    await expect(studentBelongsToTeacher(12, 7)).resolves.toBe(false);
  });
});
