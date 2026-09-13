const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const gradeRepository = require('../grade.repository');

const dialect = new PgDialect();

const renderWhere = (chain) => dialect.sqlToQuery(chain.where.mock.calls[0][0]).sql;

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

describe('grades repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('joins classes to enforce the center scope', () => {
      const chain = queueSelect([]);

      gradeRepository.findAll(4);

      expect(chain.innerJoin).toHaveBeenCalled();
      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toContain(4);
    });

    it('skips the class join when no center is given', () => {
      const chain = queueSelect([]);

      gradeRepository.findAll();

      expect(chain.innerJoin).not.toHaveBeenCalled();
    });

    it('falls back to an always-true predicate when nothing narrows the query', () => {
      const chain = queueSelect([]);

      gradeRepository.findAll();

      expect(renderWhere(chain).toUpperCase()).toContain('TRUE');
    });

    it('narrows by teacher and student when both are given', () => {
      const chain = queueSelect([]);

      gradeRepository.findAll(undefined, 7, 9);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toEqual(expect.arrayContaining([7, 9]));
    });
  });

  describe('findById', () => {
    it('returns the single matching grade', async () => {
      queueSelect([{ grade_id: 3 }]);

      await expect(gradeRepository.findById(3)).resolves.toEqual({ grade_id: 3 });
    });

    it('returns null when nothing matches', async () => {
      queueSelect([]);

      await expect(gradeRepository.findById(3)).resolves.toBeNull();
    });
  });

  describe('insert', () => {
    it('maps the positional parameters onto named columns', async () => {
      const chain = queueInsert([{ grade_id: 1 }]);

      await expect(gradeRepository.insert([9, 7, 'Maths', 2, 5, 80, 100, 80, 'A', '2026', 'T1', 4, 10, 20, 30, 20]))
        .resolves.toEqual({ grade_id: 1 });

      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 9,
        teacherId: 7,
        subject: 'Maths',
        classId: 2,
        sessionId: 5,
        marksObtained: 80,
        centerId: 4,
        pointsScore: 20,
      }));
    });

    it('writes through a caller-supplied transaction client', async () => {
      const chain = { values: jest.fn(() => chain), returning: jest.fn(() => Promise.resolve([{ grade_id: 2 }])) };
      const tx = { insert: jest.fn(() => chain) };

      await expect(gradeRepository.insert([9, 7], tx)).resolves.toEqual({ grade_id: 2 });
      expect(tx.insert).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('refuses to write when the grade is out of scope', async () => {
      queueSelect([]);

      await expect(gradeRepository.update(3, [90], 4)).resolves.toBeNull();
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('leaves unspecified score columns at their stored values', async () => {
      queueSelect([{ grade_id: 3 }]);
      const chain = queueUpdate([{ grade_id: 3 }]);

      await expect(gradeRepository.update(3, [90])).resolves.toEqual({ grade_id: 3 });

      const setData = chain.set.mock.calls[0][0];
      expect(dialect.sqlToQuery(setData.marksObtained).sql).toContain('COALESCE');
      expect(dialect.sqlToQuery(setData.percentage).params).toContain(null);
    });

    it('returns null when the write matched nothing', async () => {
      queueSelect([{ grade_id: 3 }]);
      queueUpdate([]);

      await expect(gradeRepository.update(3, [90])).resolves.toBeNull();
    });
  });

  describe('upsertSessionScores', () => {
    const params = (overrides = {}) => {
      const base = [9, 7, 'Maths', 2, 5, 100, '2026', 'T1', 4, 10, 20, 30, 15];
      Object.entries(overrides).forEach(([index, value]) => {
        base[Number(index)] = value;
      });
      return base;
    };

    it('inserts a new row with the component scores summed', async () => {
      queueSelect([]);
      const chain = queueInsert([{ grade_id: 1 }]);

      await expect(gradeRepository.upsertSessionScores(params())).resolves.toEqual({ grade_id: 1 });

      const values = chain.values.mock.calls[0][0];
      expect(values.marksObtained).toBe(75);
      expect(values.percentage).toBe(75);
    });

    it('treats a zero total as the default of one hundred rather than dividing by zero', async () => {
      queueSelect([]);
      const chain = queueInsert([{}]);

      await gradeRepository.upsertSessionScores(params({ 5: 0 }));

      expect(chain.values.mock.calls[0][0].percentage).toBe(75);
    });

    it('records a null percentage when the total is negative', async () => {
      queueSelect([]);
      const chain = queueInsert([{}]);

      await gradeRepository.upsertSessionScores(params({ 5: -10 }));

      expect(chain.values.mock.calls[0][0].percentage).toBeNull();
    });

    it('rounds the percentage to two decimal places', async () => {
      queueSelect([]);
      const chain = queueInsert([{}]);

      await gradeRepository.upsertSessionScores(params({ 5: 90, 9: 10, 10: 10, 11: 10, 12: 10 }));

      expect(chain.values.mock.calls[0][0].percentage).toBe(44.44);
    });

    it('merges into an existing row and recalculates the total', async () => {
      queueSelect([{
        grade_id: 12,
        attendance_score: 5,
        homework_score: 5,
        activity_score: 5,
        points_score: 5,
        total_marks: 100,
        subject: 'Maths',
        teacher_id: 7,
        class_id: 2,
        academic_year: '2026',
        term: 'T1',
        center_id: 4,
      }]);
      const chain = queueUpdate([{ grade_id: 12 }]);

      await expect(gradeRepository.upsertSessionScores(params({ 9: 40 }))).resolves.toEqual({ grade_id: 12 });

      const setData = chain.set.mock.calls[0][0];
      expect(setData.attendanceScore).toBe(40);
      expect(setData.marksObtained).toBe(105);
    });

    it('keeps the stored component scores when the payload omits them', async () => {
      queueSelect([{
        grade_id: 12,
        attendance_score: 8,
        homework_score: 9,
        activity_score: 7,
        points_score: 6,
        total_marks: 50,
      }]);
      const chain = queueUpdate([{}]);

      await gradeRepository.upsertSessionScores(params({ 9: null, 10: null, 11: null, 12: null, 5: null }));

      const setData = chain.set.mock.calls[0][0];
      expect(setData.attendanceScore).toBe(8);
      expect(setData.totalMarks).toBe(50);
      expect(setData.marksObtained).toBe(30);
    });

    it('defaults the stored total to one hundred when the row never had one', async () => {
      queueSelect([{ grade_id: 12, attendance_score: 1, homework_score: 0, activity_score: 0, points_score: 0 }]);
      const chain = queueUpdate([{}]);

      await gradeRepository.upsertSessionScores(params({ 5: null, 9: null, 10: null, 11: null, 12: null }));

      expect(chain.set.mock.calls[0][0].totalMarks).toBe(100);
    });
  });

  describe('findByStudent and findBySession', () => {
    it('orders a student history by academic year', () => {
      const chain = queueSelect([]);

      gradeRepository.findByStudent(9);

      expect(chain.orderBy).toHaveBeenCalled();
      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toContain(9);
    });

    it('narrows a session read to that session', () => {
      const chain = queueSelect([]);

      gradeRepository.findBySession(5, 4, 7);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toEqual(expect.arrayContaining([5, 4, 7]));
    });
  });

  describe('updateLessonCoins', () => {
    it('writes the coin fields and stamps the update time', async () => {
      const chain = queueUpdate([{ grade_id: 3 }]);

      await expect(gradeRepository.updateLessonCoins(3, 5, 12, 'Great work')).resolves.toEqual({ grade_id: 3 });

      expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({
        baseCoin: 5,
        totalDailyCoin: 12,
        coinComment: 'Great work',
      }));
    });
  });

  describe('remove', () => {
    it('refuses to delete when the grade is out of scope', async () => {
      queueSelect([]);

      await expect(gradeRepository.remove(3, 4)).resolves.toBeNull();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it('deletes the grade and returns the removed row', async () => {
      queueSelect([{ grade_id: 3 }]);
      queueDelete([{ grade_id: 3 }]);

      await expect(gradeRepository.remove(3)).resolves.toEqual({ grade_id: 3 });
    });

    it('returns null when the delete matched nothing', async () => {
      queueSelect([{ grade_id: 3 }]);
      queueDelete([]);

      await expect(gradeRepository.remove(3)).resolves.toBeNull();
    });
  });
});
