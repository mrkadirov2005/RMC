const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(), transaction: jest.fn() };

jest.mock('../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const { StudentService } = require('../StudentService');

const dialect = new PgDialect();

const queueSelect = (rows = []) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.groupBy = jest.fn(() => Promise.resolve(rows));
  chain.orderBy = jest.fn(() => Promise.resolve(rows));
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

describe('StudentService', () => {
  let service;

  beforeEach(() => {
    Object.values(mockDb).forEach((fn) => fn.mockReset());
    service = new StudentService({});
  });

  describe('create', () => {
    it('converts the snake-case payload to column names and back', async () => {
      const chain = queueInsert([{ studentId: 1, firstName: 'Ada', centerId: 3 }]);

      await expect(service.createStudent({ first_name: 'Ada', center_id: 3 }))
        .resolves.toEqual({ student_id: 1, first_name: 'Ada', center_id: 3 });

      expect(chain.values).toHaveBeenCalledWith({ firstName: 'Ada', centerId: 3 });
    });

    it('drops fields that were left undefined', async () => {
      const chain = queueInsert([{ studentId: 1 }]);

      await service.createStudent({ first_name: 'Ada', email: undefined });

      expect(chain.values.mock.calls[0][0]).not.toHaveProperty('email');
    });
  });

  describe('read', () => {
    it('reads one student by id and converts the row', async () => {
      const chain = {};
      chain.from = jest.fn(() => chain);
      chain.where = jest.fn(() => chain);
      chain.limit = jest.fn(() => Promise.resolve([{ studentId: 5, firstName: 'Ada' }]));
      mockDb.select.mockReturnValueOnce(chain);

      await expect(service.getStudentById(5)).resolves.toEqual({ student_id: 5, first_name: 'Ada' });
    });

    it('returns null when no student matches the id', async () => {
      const chain = {};
      chain.from = jest.fn(() => chain);
      chain.where = jest.fn(() => chain);
      chain.limit = jest.fn(() => Promise.resolve([]));
      mockDb.select.mockReturnValueOnce(chain);

      await expect(service.getStudentById(5)).resolves.toBeNull();
    });

    it('lists every student when no filter is given', async () => {
      const chain = queueSelect([{ studentId: 1 }]);

      await expect(service.getAllStudents()).resolves.toEqual([{ student_id: 1 }]);
      expect(chain.where).not.toHaveBeenCalled();
    });

    it('drops filters whose value is null or undefined', async () => {
      const chain = queueSelect([]);

      await service.getAllStudents({ center_id: null, teacher_id: undefined });

      expect(chain.where).not.toHaveBeenCalled();
    });

    it.each([
      ['getStudentsByCenter', 3],
      ['getStudentsByTeacher', 7],
      ['getStudentsByClass', 12],
    ])('%s narrows the listing to the given id', async (method, id) => {
      const chain = queueSelect([]);

      await service[method](id);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toContain(id);
    });
  });

  describe('write', () => {
    it('stamps the update time alongside the changed columns', async () => {
      const chain = queueUpdate([{ studentId: 5, status: 'Active' }]);

      await expect(service.updateStudent(5, { status: 'Active' })).resolves.toEqual({ student_id: 5, status: 'Active' });

      const setData = chain.set.mock.calls[0][0];
      expect(setData.status).toBe('Active');
      expect(setData.updatedAt).toBeDefined();
    });

    it('returns null when the update matched nothing', async () => {
      queueUpdate([]);

      await expect(service.updateStudent(5, { status: 'Active' })).resolves.toBeNull();
    });

    it.each([
      ['updateStudentStatus', [5, 'Inactive'], 'status', 'Inactive'],
      ['assignStudentToClass', [5, 12], 'classId', 12],
      ['assignStudentToTeacher', [5, 7], 'teacherId', 7],
    ])('%s writes only its own column', async (method, args, column, value) => {
      const chain = queueUpdate([{ studentId: 5 }]);

      await service[method](...args);

      expect(chain.set.mock.calls[0][0][column]).toBe(value);
    });

    it('reports a delete that removed a row', async () => {
      queueDelete([{ id: 5 }]);

      await expect(service.deleteStudent(5)).resolves.toBe(true);
    });

    it('reports a delete that matched nothing', async () => {
      queueDelete([]);

      await expect(service.deleteStudent(5)).resolves.toBe(false);
    });
  });

  describe('count', () => {
    it('counts every student when no filter is given', async () => {
      const chain = queueSelect([{ count: 12 }]);

      await expect(service.getStudentCount()).resolves.toBe(12);
      expect(chain.where).not.toHaveBeenCalled();
    });

    it('counts within a filter', async () => {
      const chain = queueSelect([{ count: 4 }]);

      await expect(service.getStudentCount({ center_id: 3 })).resolves.toBe(4);
      expect(chain.where).toHaveBeenCalled();
    });

    it('reports zero when the count query returns nothing', async () => {
      queueSelect([]);

      await expect(service.getStudentCount()).resolves.toBe(0);
    });
  });

  describe('searchStudents', () => {
    it('matches the term against first name, last name and enrollment number', async () => {
      const chain = queueSelect([{ student_id: 1 }]);

      await expect(service.searchStudents('ada')).resolves.toEqual([{ student_id: 1 }]);

      const query = dialect.sqlToQuery(chain.where.mock.calls[0][0]);
      expect(query.sql.toLowerCase()).toContain('ilike');
      expect(query.params.filter((p) => p === '%ada%')).toHaveLength(3);
    });

    it('adds the center to the scope when one is given', async () => {
      const chain = queueSelect([]);

      await service.searchStudents('ada', 3);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toContain(3);
    });
  });

  describe('getStudentStatistics', () => {
    it('aggregates attendance, grades, payments and assignments in one query', async () => {
      const chain = queueSelect([{ student_id: 5, attendance_count: 10, present_count: 8 }]);

      await expect(service.getStudentStatistics(5)).resolves.toMatchObject({ attendance_count: 10 });
      expect(chain.leftJoin).toHaveBeenCalledTimes(4);
      expect(chain.groupBy).toHaveBeenCalled();
    });

    it('counts a late arrival as present', async () => {
      queueSelect([{}]);

      await service.getStudentStatistics(5);

      const selection = mockDb.select.mock.calls[0][0];
      const rendered = dialect.sqlToQuery(selection.present_count).sql;
      expect(rendered).toContain('Present');
      expect(rendered).toContain('Late');
    });

    it('returns null when the student has no row', async () => {
      queueSelect([]);

      await expect(service.getStudentStatistics(5)).resolves.toBeNull();
    });
  });

  describe('unsupported tables', () => {
    it('refuses a table the base service does not know', async () => {
      await expect(service.findById('aliens', 1)).rejects.toThrow('Unsupported table for Drizzle BaseService: aliens');
    });
  });

  describe('withTransaction', () => {
    it('hands the callback to the driver transaction', async () => {
      const callback = jest.fn();
      mockDb.transaction.mockResolvedValue('done');

      await expect(service.withTransaction(callback)).resolves.toBe('done');
      expect(mockDb.transaction).toHaveBeenCalledWith(callback);
    });
  });
});
