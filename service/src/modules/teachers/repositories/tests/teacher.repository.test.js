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

const { PgDialect } = require('drizzle-orm/pg-core');
const teacherRepository = require('../teacher.repository');

const dialect = new PgDialect();

const renderWhere = (chain) => dialect.sqlToQuery(chain.where.mock.calls[0][0]).sql;

const queueSelect = (rows = []) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.offset = jest.fn(() => chain);
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  mockDb.select.mockReturnValueOnce(chain);
  return chain;
};

const queueInsert = (rows = []) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  mockDb.insert.mockReturnValueOnce(chain);
  return chain;
};

const queueUpdate = (rows = []) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  mockDb.update.mockReturnValueOnce(chain);
  return chain;
};

const queueDelete = (rows = []) => {
  const chain = {};
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  mockDb.delete.mockReturnValueOnce(chain);
  return chain;
};

describe('teachers repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('hides soft-deleted teachers and orders by id', () => {
      const chain = queueSelect([{ teacher_id: 1 }]);

      teacherRepository.findAll();

      expect(renderWhere(chain)).toContain('deleted_at" is null');
      expect(chain.orderBy).toHaveBeenCalled();
    });

    it('scopes the listing to a center when one is given', () => {
      const chain = queueSelect([]);

      teacherRepository.findAll(4);

      const where = renderWhere(chain);
      expect(where).toContain('center_id');
      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toContain(4);
    });
  });

  describe('findPaginated', () => {
    it('defaults to twenty rows on the first page', async () => {
      queueSelect([{ total: 7 }]);
      const rowChain = queueSelect([{ teacher_id: 1 }]);

      const result = await teacherRepository.findPaginated();

      expect(rowChain.limit).toHaveBeenCalledWith(20);
      expect(rowChain.offset).toHaveBeenCalledWith(0);
      expect(result).toEqual({ data: [{ teacher_id: 1 }], total: 7, page: 1, limit: 20 });
    });

    it('caps the page size at one hundred', async () => {
      queueSelect([{ total: 0 }]);
      const rowChain = queueSelect([]);

      const result = await teacherRepository.findPaginated({ limit: 5000, page: 2 });

      expect(rowChain.limit).toHaveBeenCalledWith(100);
      expect(rowChain.offset).toHaveBeenCalledWith(100);
      expect(result.limit).toBe(100);
    });

    it('treats a page below one as the first page', async () => {
      queueSelect([{ total: 0 }]);
      const rowChain = queueSelect([]);

      await teacherRepository.findPaginated({ page: -3 });

      expect(rowChain.offset).toHaveBeenCalledWith(0);
    });

    it('reports a total of zero when the count query returns nothing', async () => {
      queueSelect([]);
      queueSelect([]);

      const result = await teacherRepository.findPaginated();

      expect(result.total).toBe(0);
    });

    it('searches across name, contact and status columns', async () => {
      const countChain = queueSelect([{ total: 1 }]);
      queueSelect([]);

      await teacherRepository.findPaginated({ q: 'ada' });

      const where = dialect.sqlToQuery(countChain.where.mock.calls[0][0]);
      expect(where.sql.toLowerCase()).toContain('ilike');
      expect(where.params).toContain('%ada%');
    });

    it('accepts the search term under either q or search', async () => {
      const countChain = queueSelect([{ total: 0 }]);
      queueSelect([]);

      await teacherRepository.findPaginated({ search: 'lovelace' });

      expect(dialect.sqlToQuery(countChain.where.mock.calls[0][0]).params).toContain('%lovelace%');
    });

    it('filters by status when one is given', async () => {
      const countChain = queueSelect([{ total: 0 }]);
      queueSelect([]);

      await teacherRepository.findPaginated({ status: 'Active' });

      expect(dialect.sqlToQuery(countChain.where.mock.calls[0][0]).params).toContain('Active');
    });

    it('ignores a blank search term', async () => {
      const countChain = queueSelect([{ total: 0 }]);
      queueSelect([]);

      await teacherRepository.findPaginated({ q: '   ' });

      expect(dialect.sqlToQuery(countChain.where.mock.calls[0][0]).sql.toLowerCase()).not.toContain('ilike');
    });
  });

  describe('findById', () => {
    it('returns the teacher', async () => {
      queueSelect([{ teacher_id: 3 }]);

      await expect(teacherRepository.findById(3)).resolves.toEqual({ teacher_id: 3 });
    });

    it('returns null when nothing matches', async () => {
      queueSelect([]);

      await expect(teacherRepository.findById(3)).resolves.toBeNull();
    });

    it('adds the center to the scope when one is given', async () => {
      const chain = queueSelect([]);

      await teacherRepository.findById(3, 4);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toEqual(expect.arrayContaining([3, 4]));
    });
  });

  describe('findByUsername', () => {
    it('returns the credential row for a live teacher', async () => {
      const chain = queueSelect([{ teacher_id: 3, password_hash: 'hash' }]);

      await expect(teacherRepository.findByUsername('ada')).resolves.toEqual({ teacher_id: 3, password_hash: 'hash' });
      expect(renderWhere(chain)).toContain('deleted_at" is null');
    });

    it('returns null for an unknown username', async () => {
      queueSelect([]);

      await expect(teacherRepository.findByUsername('ghost')).resolves.toBeNull();
    });
  });

  describe('insert', () => {
    it('maps the positional parameters onto named columns', async () => {
      const chain = queueInsert([{ teacher_id: 9 }]);

      await expect(teacherRepository.insert([
        4, 'EMP-1', 'Ada', 'Lovelace', 'ada@example.com', '+1', '1990-01-01',
        'F', 'MSc', 'Maths', 40, 'Active', '["teacher"]', 'ada', 'hash',
      ])).resolves.toEqual({ teacher_id: 9 });

      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({
        centerId: 4,
        employeeId: 'EMP-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        salaryPercentage: 40,
        username: 'ada',
        passwordHash: 'hash',
      }));
    });

    it('parses a roles payload supplied as JSON text', async () => {
      const chain = queueInsert([{}]);

      await teacherRepository.insert([4, 'EMP-1', 'Ada', 'L', null, null, null, null, null, null, null, null, '["teacher","lead"]', 'ada', 'hash']);

      expect(chain.values.mock.calls[0][0].roles).toEqual(['teacher', 'lead']);
    });

    it('leaves an unparseable roles string as it was given', async () => {
      const chain = queueInsert([{}]);

      await teacherRepository.insert([4, 'EMP-1', 'Ada', 'L', null, null, null, null, null, null, null, null, 'not json', 'ada', 'hash']);

      expect(chain.values.mock.calls[0][0].roles).toBe('not json');
    });

    it('passes a roles array straight through', async () => {
      const chain = queueInsert([{}]);

      await teacherRepository.insert([4, 'EMP-1', 'Ada', 'L', null, null, null, null, null, null, null, null, ['teacher'], 'ada', 'hash']);

      expect(chain.values.mock.calls[0][0].roles).toEqual(['teacher']);
    });
  });

  describe('uniqueness counts', () => {
    it.each([
      ['countByUsername', 'ada'],
      ['countByEmployeeId', 'EMP-1'],
      ['countByEmail', 'ada@example.com'],
    ])('%s counts only live teachers', async (method, value) => {
      const chain = queueSelect([{ count: 2 }]);

      await expect(teacherRepository[method](value)).resolves.toBe(2);
      expect(renderWhere(chain)).toContain('deleted_at" is null');
    });

    it('reports zero when the count query returns nothing', async () => {
      queueSelect([]);

      await expect(teacherRepository.countByUsername('ada')).resolves.toBe(0);
    });
  });

  describe('update', () => {
    it('writes only the fields that were supplied', async () => {
      const chain = queueUpdate([{ teacher_id: 3 }]);

      await teacherRepository.update(3, ['Ada', null, null, 'ada@example.com']);

      const setData = chain.set.mock.calls[0][0];
      expect(setData.firstName).toBe('Ada');
      expect(setData.email).toBe('ada@example.com');
      expect(setData).not.toHaveProperty('lastName');
      expect(setData).not.toHaveProperty('username');
      expect(setData.updatedAt).toBeDefined();
    });

    it('parses a roles payload supplied as JSON text', async () => {
      const chain = queueUpdate([{}]);

      await teacherRepository.update(3, [null, null, null, null, null, null, null, '["lead"]']);

      expect(chain.set.mock.calls[0][0].roles).toEqual(['lead']);
    });

    it('returns null when the teacher is out of scope', async () => {
      queueUpdate([]);

      await expect(teacherRepository.update(3, ['Ada'], 4)).resolves.toBeNull();
    });
  });

  describe('getDeleteDependencies', () => {
    const queueDependencyReads = () => {
      queueSelect([{ class_id: 1 }]);
      queueSelect([{ student_id: 2 }]);
      queueSelect([{ subject_id: 3 }]);
      queueSelect([{ assignment_id: 4 }]);
      queueSelect([{ session_id: 5 }]);
      queueSelect([{ count: 6 }]);
      queueSelect([{ count: 7 }]);
    };

    it('gathers every record that still points at the teacher', async () => {
      queueDependencyReads();

      await expect(teacherRepository.getDeleteDependencies(3)).resolves.toEqual({
        classes: [{ class_id: 1 }],
        students: [{ student_id: 2 }],
        subjects: [{ subject_id: 3 }],
        assignments: [{ assignment_id: 4 }],
        sessions: [{ session_id: 5 }],
        attendance_count: 6,
        grades_count: 7,
      });
    });

    it('reports zero counts when the aggregate queries return nothing', async () => {
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);

      const result = await teacherRepository.getDeleteDependencies(3);

      expect(result.attendance_count).toBe(0);
      expect(result.grades_count).toBe(0);
    });

    it('adds the center to each dependency query when one is given', async () => {
      const classChain = queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);
      queueSelect([]);

      await teacherRepository.getDeleteDependencies(3, 4);

      expect(dialect.sqlToQuery(classChain.where.mock.calls[0][0]).params).toEqual(expect.arrayContaining([3, 4]));
    });
  });

  describe('hasDeleteDependencies', () => {
    const empty = {
      classes: [],
      students: [],
      subjects: [],
      assignments: [],
      sessions: [],
      attendance_count: 0,
      grades_count: 0,
    };

    it('reports no dependencies for an entirely clear teacher', () => {
      expect(teacherRepository.hasDeleteDependencies(empty)).toBe(false);
    });

    it.each([
      ['classes', { classes: [{}] }],
      ['students', { students: [{}] }],
      ['subjects', { subjects: [{}] }],
      ['assignments', { assignments: [{}] }],
      ['sessions', { sessions: [{}] }],
      ['attendance', { attendance_count: 1 }],
      ['grades', { grades_count: 1 }],
    ])('reports a dependency when %s is not empty', (_name, overrides) => {
      expect(teacherRepository.hasDeleteDependencies({ ...empty, ...overrides })).toBe(true);
    });
  });

  describe('unassignDeleteDependencies', () => {
    it('clears every teacher reference inside one transaction', async () => {
      const tx = { update: jest.fn() };
      const updates = [];
      tx.update.mockImplementation(() => {
        const chain = { set: jest.fn(() => chain), where: jest.fn(() => Promise.resolve()) };
        updates.push(chain);
        return chain;
      });
      mockDb.transaction.mockImplementation(async (callback) => callback(tx));

      await teacherRepository.unassignDeleteDependencies(3, 4);

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(tx.update).toHaveBeenCalledTimes(5);
      expect(updates[0].set.mock.calls[0][0].teacherId).toBeNull();
    });
  });

  describe('remove', () => {
    it('soft deletes the teacher and retires them', async () => {
      const chain = queueUpdate([{ teacher_id: 3 }]);

      await expect(teacherRepository.remove(3)).resolves.toEqual({ teacher_id: 3 });

      const setData = chain.set.mock.calls[0][0];
      expect(setData.status).toBe('Retired');
      expect(setData.deletedAt).toBeDefined();
    });

    it('returns null when the teacher is out of scope', async () => {
      queueUpdate([]);

      await expect(teacherRepository.remove(3, 4)).resolves.toBeNull();
    });
  });

  describe('purge', () => {
    it('hard deletes only a teacher that was already soft deleted', async () => {
      const chain = queueDelete([{ teacher_id: 3 }]);

      await expect(teacherRepository.purge(3)).resolves.toEqual({ teacher_id: 3 });
      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).sql).toContain('is not null');
    });

    it('returns null when no soft-deleted teacher matches', async () => {
      queueDelete([]);

      await expect(teacherRepository.purge(3, 4)).resolves.toBeNull();
    });
  });

  describe('credentials', () => {
    it('reads the stored password hash', async () => {
      queueSelect([{ password_hash: 'hash' }]);

      await expect(teacherRepository.findPasswordHash(3)).resolves.toBe('hash');
    });

    it('returns undefined when the teacher has no row', async () => {
      queueSelect([]);

      await expect(teacherRepository.findPasswordHash(3)).resolves.toBeUndefined();
    });

    it('sets a username and hash together and returns no hash in the result', async () => {
      const chain = queueUpdate([{ teacher_id: 3, username: 'ada' }]);

      await expect(teacherRepository.setCredentials(3, 'ada', 'hash', 4)).resolves.toEqual({ teacher_id: 3, username: 'ada' });
      expect(chain.set.mock.calls[0][0]).toMatchObject({ username: 'ada', passwordHash: 'hash' });
    });

    it('returns null when the credential update is out of scope', async () => {
      queueUpdate([]);

      await expect(teacherRepository.setCredentials(3, 'ada', 'hash', 4)).resolves.toBeNull();
    });

    it('updates only the hash when rotating a password', async () => {
      const chain = queueUpdate([]);

      await teacherRepository.updatePasswordHash(3, 'new-hash');

      const setData = chain.set.mock.calls[0][0];
      expect(setData.passwordHash).toBe('new-hash');
      expect(setData).not.toHaveProperty('username');
    });
  });
});
