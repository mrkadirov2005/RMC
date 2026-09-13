const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const attendanceRepository = require('../attendance.repository');

const dialect = new PgDialect();

const whereQuery = (chain) => dialect.sqlToQuery(chain.where.mock.calls[0][0]);

const queueSelect = (rows = []) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
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

describe('attendance repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('joins classes to enforce the center scope', () => {
      const chain = queueSelect([]);

      attendanceRepository.findAll(4);

      expect(chain.innerJoin).toHaveBeenCalled();
      expect(whereQuery(chain).params).toContain(4);
    });

    it('skips the class join when no center is given', () => {
      const chain = queueSelect([]);

      attendanceRepository.findAll();

      expect(chain.innerJoin).not.toHaveBeenCalled();
    });

    it('narrows the listing to one teacher', () => {
      const chain = queueSelect([]);

      attendanceRepository.findAll(undefined, 7);

      expect(whereQuery(chain).params).toContain(7);
    });
  });

  describe('findById', () => {
    it('returns the single matching record', async () => {
      queueSelect([{ attendance_id: 3 }]);

      await expect(attendanceRepository.findById(3)).resolves.toEqual({ attendance_id: 3 });
    });

    it('returns null when nothing matches', async () => {
      queueSelect([]);

      await expect(attendanceRepository.findById(3)).resolves.toBeNull();
    });
  });

  describe('insert', () => {
    it('creates a new record when the student has none for that session', async () => {
      queueSelect([]);
      const chain = queueInsert([{ attendance_id: 1 }]);

      await expect(attendanceRepository.insert([4, 9, 7, 2, 5, '2026-09-01', 'Present', 'ok']))
        .resolves.toEqual({ attendance_id: 1 });

      expect(chain.values).toHaveBeenCalledWith({
        centerId: 4,
        studentId: 9,
        teacherId: 7,
        classId: 2,
        sessionId: 5,
        attendanceDate: '2026-09-01',
        status: 'Present',
        remarks: 'ok',
      });
    });

    it('matches an existing record by session when one is named', async () => {
      const lookup = queueSelect([{ attendance_id: 12 }]);
      queueUpdate([{ attendance_id: 12 }]);

      await expect(attendanceRepository.insert([4, 9, 7, 2, 5, '2026-09-01', 'Late', null]))
        .resolves.toEqual({ attendance_id: 12 });

      expect(whereQuery(lookup).params).toEqual(expect.arrayContaining([9, 5]));
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('matches an existing record by class and date when no session is named', async () => {
      const lookup = queueSelect([{ attendance_id: 13 }]);
      queueUpdate([{ attendance_id: 13 }]);

      await attendanceRepository.insert([4, 9, 7, 2, null, '2026-09-01', 'Absent', null]);

      const query = whereQuery(lookup);
      expect(query.params).toEqual(expect.arrayContaining([9, 2, '2026-09-01']));
      expect(query.sql).toContain('is null');
    });

    it('stores a missing session id as null rather than as a falsy value', async () => {
      queueSelect([]);
      const chain = queueInsert([{}]);

      await attendanceRepository.insert([4, 9, 7, 2, 0, '2026-09-01', 'Present', null]);

      expect(chain.values.mock.calls[0][0].sessionId).toBeNull();
    });

    it('overwrites the whole row when updating an existing record', async () => {
      queueSelect([{ attendance_id: 12 }]);
      const chain = queueUpdate([{ attendance_id: 12 }]);

      await attendanceRepository.insert([4, 9, 7, 2, 5, '2026-09-01', 'Excused', 'sick']);

      expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'Excused', remarks: 'sick' }));
    });
  });

  describe('update', () => {
    it('refuses to write when the record is out of scope', async () => {
      queueSelect([]);

      await expect(attendanceRepository.update(3, ['Present'], 4)).resolves.toBeNull();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('leaves an unspecified field at its stored value', async () => {
      queueSelect([{ attendance_id: 3 }]);
      const chain = queueUpdate([{ attendance_id: 3 }]);

      await expect(attendanceRepository.update(3, ['Late'])).resolves.toEqual({ attendance_id: 3 });

      const setData = chain.set.mock.calls[0][0];
      expect(dialect.sqlToQuery(setData.status).params).toContain('Late');
      expect(dialect.sqlToQuery(setData.remarks).params).toContain(null);
    });

    it('returns null when the write matched nothing', async () => {
      queueSelect([{ attendance_id: 3 }]);
      queueUpdate([]);

      await expect(attendanceRepository.update(3, ['Late'])).resolves.toBeNull();
    });
  });

  describe('scoped reads', () => {
    it('orders a student history by date', () => {
      const chain = queueSelect([]);

      attendanceRepository.findByStudent(9);

      expect(chain.orderBy).toHaveBeenCalled();
      expect(whereQuery(chain).params).toContain(9);
    });

    it('orders a class register by date', () => {
      const chain = queueSelect([]);

      attendanceRepository.findByClass(2, 4);

      expect(whereQuery(chain).params).toEqual(expect.arrayContaining([2, 4]));
    });

    it('narrows a session read to that session', () => {
      const chain = queueSelect([]);

      attendanceRepository.findBySession(5, 4, 7);

      expect(whereQuery(chain).params).toEqual(expect.arrayContaining([5, 4, 7]));
    });
  });

  describe('remove', () => {
    it('refuses to delete when the record is out of scope', async () => {
      queueSelect([]);

      await expect(attendanceRepository.remove(3, 4)).resolves.toBeNull();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('deletes the record and returns the removed row', async () => {
      queueSelect([{ attendance_id: 3 }]);
      queueDelete([{ attendance_id: 3 }]);

      await expect(attendanceRepository.remove(3)).resolves.toEqual({ attendance_id: 3 });
    });

    it('returns null when the delete matched nothing', async () => {
      queueSelect([{ attendance_id: 3 }]);
      queueDelete([]);

      await expect(attendanceRepository.remove(3)).resolves.toBeNull();
    });
  });

  describe('removeByClass', () => {
    it('reports how many rows were removed', async () => {
      queueDelete([{ attendance_id: 1 }, { attendance_id: 2 }]);

      await expect(attendanceRepository.removeByClass(2)).resolves.toBe(2);
    });

    it('adds the center to the scope when one is given', async () => {
      const chain = queueDelete([]);

      await expect(attendanceRepository.removeByClass(2, 4)).resolves.toBe(0);
      expect(whereQuery(chain).params).toEqual(expect.arrayContaining([2, 4]));
    });
  });

  describe('tenancy checks', () => {
    it('confirms a live student in the center', async () => {
      const chain = queueSelect([{ student_id: 9 }]);

      await expect(attendanceRepository.studentInCenter(9, 4)).resolves.toBe(true);
      expect(whereQuery(chain).sql).toContain('is null');
    });

    it('rejects a student outside the center', async () => {
      queueSelect([]);

      await expect(attendanceRepository.studentInCenter(9, 4)).resolves.toBe(false);
    });

    it('confirms a live class in the center', async () => {
      queueSelect([{ class_id: 2 }]);

      await expect(attendanceRepository.classInCenter(2, 4)).resolves.toBe(true);
    });

    it('rejects a class outside the center', async () => {
      queueSelect([]);

      await expect(attendanceRepository.classInCenter(2, 4)).resolves.toBe(false);
    });
  });
});
