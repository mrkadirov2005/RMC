const mockDb = {
  select: jest.fn(),
  selectDistinct: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const studentRepository = require('../student.repository');

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

describe('students repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds scoped paginated student queries with search and teacher filters using Drizzle builders', async () => {
    const countChain = createSelectChain([{ total: 2 }]);
    const rowsChain = createSelectChain([{ student_id: 10 }, { student_id: 9 }]);
    mockDb.select.mockReturnValueOnce(countChain);
    mockDb.selectDistinct.mockReturnValueOnce(rowsChain);

    const result = await studentRepository.findPaginatedWithClass(
      { q: 'Ali', teacher_id: 11, page: 2, limit: 25 },
      4
    );

    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.selectDistinct).toHaveBeenCalled();
    expect(countChain.leftJoin).toHaveBeenCalledTimes(3);
    expect(rowsChain.leftJoin).toHaveBeenCalledTimes(3);
    expect(countChain.where).toHaveBeenCalled();
    expect(rowsChain.where).toHaveBeenCalled();
    expect(rowsChain.orderBy).toHaveBeenCalled();
    expect(rowsChain.limit).toHaveBeenCalledWith(25);
    expect(rowsChain.offset).toHaveBeenCalledWith(25);
    expect(result).toEqual({ data: [{ student_id: 10 }, { student_id: 9 }], total: 2, page: 2, limit: 25 });
  });

  it('matches teacher filters through the effective teacher expression', async () => {
    const countChain = createSelectChain([{ total: 1 }]);
    const rowsChain = createSelectChain([{ student_id: 12, class_id: 3 }]);
    mockDb.select.mockReturnValueOnce(countChain);
    mockDb.selectDistinct.mockReturnValueOnce(rowsChain);

    await studentRepository.findPaginatedWithClass({ teacher_id: 7, page: 1, limit: 20 });

    expect(countChain.where).toHaveBeenCalled();
    expect(rowsChain.where).toHaveBeenCalled();
    expect(rowsChain.limit).toHaveBeenCalledWith(20);
    expect(rowsChain.offset).toHaveBeenCalledWith(0);
  });

  it('uses null-class filter without breaking pagination builders', async () => {
    const countChain = createSelectChain([{ total: 0 }]);
    const rowsChain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(countChain);
    mockDb.selectDistinct.mockReturnValueOnce(rowsChain);

    await studentRepository.findPaginatedWithClass({ class_id: -1, page: 1, limit: 10 });

    expect(countChain.where).toHaveBeenCalled();
    expect(rowsChain.where).toHaveBeenCalled();
    expect(rowsChain.limit).toHaveBeenCalledWith(10);
    expect(rowsChain.offset).toHaveBeenCalledWith(0);
  });

  it('looks students up by username excluding deleted rows with Drizzle builders', async () => {
    const chain = createSelectChain([{ student_id: 1, username: 'ali' }]);
    mockDb.select.mockReturnValueOnce(chain);

    const result = await studentRepository.findByUsername('ali');

    expect(mockDb.select).toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(result).toEqual({ student_id: 1, username: 'ali' });
  });

  it('persists and returns parent and profile fields during student updates', async () => {
    const returning = jest.fn().mockResolvedValue([{
      student_id: 4,
      parent_name: 'Vali Valiyev',
      parent_phone: '998901234567',
      date_of_birth: '2010-01-02',
      gender: 'Male',
      enrollment_number: 'ST-004',
    }]);
    const chain = {
      set: jest.fn(),
      where: jest.fn(),
      returning,
    };
    chain.set.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    mockDb.update.mockReturnValue(chain);

    const result = await studentRepository.update(4, {
      parent_name: 'Vali Valiyev',
      parent_phone: '998901234567',
      date_of_birth: '2010-01-02',
      gender: 'Male',
      enrollment_number: 'ST-004',
    }, 2);

    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({
      parentName: 'Vali Valiyev',
      parentPhone: '998901234567',
      dateOfBirth: '2010-01-02',
      gender: 'Male',
      enrollmentNumber: 'ST-004',
    }));
    expect(result).toMatchObject({ parent_name: 'Vali Valiyev', parent_phone: '998901234567' });
  });
});
