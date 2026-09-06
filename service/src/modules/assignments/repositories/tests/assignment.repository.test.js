// RMC-030: assignments.remove() must soft-delete (set deletedAt) instead of
// hard-deleting, and every read path (getAll/getById, which remove()/update()
// also call internally to check existence) must filter out soft-deleted rows
// via isNull(deletedAt) in scopedConditions.
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
}));

// Keep the real drizzle-orm helpers (and, eq, desc, sql, ...) but spy on isNull
// so we can prove scopedConditions actually asks the query builder to filter
// out soft-deleted rows, without hand-rolling SQL-object equality checks.
jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return { ...actual, isNull: jest.fn(actual.isNull) };
});

const { isNull } = require('drizzle-orm');
const { assignments } = require('../../../../db/schema');
const assignmentRepository = require('../assignment.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.offset = jest.fn(() => chain);
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

describe('assignment repository — soft delete and scoping (RMC-030)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never calls db.delete: remove() soft-deletes via db.update setting deletedAt', async () => {
    // getById() existence check inside remove()
    mockDb.select.mockReturnValueOnce(createSelectChain([{ assignment_id: 9, deleted_at: null }]));
    const updateChain = createMutationChain([{ assignment_id: 9, deleted_at: new Date('2026-09-05T00:00:00Z') }]);
    mockDb.update.mockReturnValueOnce(updateChain);

    const result = await assignmentRepository.remove(9, 2, undefined);

    expect(mockDb.delete).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalledWith(assignments);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.anything(), updatedAt: expect.anything() }));
    expect(result).toEqual({ assignment_id: 9, deleted_at: new Date('2026-09-05T00:00:00Z') });
  });

  it('returns null and does not attempt to update when the assignment is already gone (soft-deleted or missing)', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    const result = await assignmentRepository.remove(9, 2, undefined);

    expect(result).toBeNull();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('filters soft-deleted rows out of getAll() via isNull(deletedAt), even with no other scope options', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([{ assignment_id: 1 }]));

    await assignmentRepository.getAll({});

    expect(isNull).toHaveBeenCalledWith(assignments.deletedAt);
  });

  it('filters soft-deleted rows out of getAll() when scoped by center, teacher, and class', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await assignmentRepository.getAll({ centerId: 2, teacherId: 4, classId: 8, limit: 20, offset: 40 });

    expect(isNull).toHaveBeenCalledWith(assignments.deletedAt);
  });

  it('filters soft-deleted rows out of getById()', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await assignmentRepository.getById(9, 2, undefined);

    expect(isNull).toHaveBeenCalledWith(assignments.deletedAt);
  });
});
