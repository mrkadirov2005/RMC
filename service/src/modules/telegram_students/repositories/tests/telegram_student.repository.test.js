const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const repository = require('../telegram_student.repository');

const dialect = new PgDialect();

const makeChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.groupBy = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.as = jest.fn(() => ({ points: {}, student_id: {} }));
  chain.limit = jest.fn(() => chain);
  chain.offset = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  return chain;
};

const queueSelect = (rows = []) => {
  const chain = makeChain(rows);
  mockDb.select.mockReturnValueOnce(chain);
  return chain;
};

const student = (id, coins, points, overrides = {}) => ({
  student_id: id,
  first_name: `First${id}`,
  last_name: `Last${id}`,
  coins,
  points,
  ...overrides,
});

// classRankRows issues a sub-select for points and then the main student select.
const queueRankRows = (rows) => {
  queueSelect([]);
  queueSelect(rows);
};

describe('telegram student repository', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
  });

  describe('resolveStudent', () => {
    it('matches only an imported registration that was converted to a student', async () => {
      const chain = queueSelect([{ student_id: 9 }]);

      await expect(repository.resolveStudent('12345')).resolves.toEqual({ student_id: 9 });

      const where = dialect.sqlToQuery(chain.where.mock.calls[0][0]);
      expect(where.params).toContain(12345);
      expect(where.params).toContain('imported');
      expect(where.sql).toContain('is not null');
    });

    it('returns null when the Telegram account is not linked', async () => {
      queueSelect([]);

      await expect(repository.resolveStudent('999')).resolves.toBeNull();
    });

    it('takes the most recent conversion when an account was linked twice', async () => {
      const chain = queueSelect([{ student_id: 9 }]);

      await repository.resolveStudent('12345');

      expect(chain.orderBy).toHaveBeenCalled();
      expect(chain.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('findLastLesson', () => {
    it('returns null when the student has no graded session', async () => {
      queueSelect([]);

      await expect(repository.findLastLesson(9)).resolves.toBeNull();
    });

    it('ranks the student within the lesson by percentage', async () => {
      queueSelect([{ grade_id: 3, session_id: 5, student_id: 9, total_daily_coin: 4 }]);
      queueSelect([
        { student_id: 8, percentage: 90, marks_obtained: 90, total_daily_coin: 10, grade_id: 1 },
        { student_id: 9, percentage: 80, marks_obtained: 80, total_daily_coin: 5, grade_id: 3 },
        { student_id: 10, percentage: 70, marks_obtained: 70, total_daily_coin: 1, grade_id: 2 },
      ]);
      queueSelect([{ coins_given: 5 }]);

      const result = await repository.findLastLesson(9);

      expect(result.rank).toBe(2);
      expect(result.total_students).toBe(3);
      expect(result.coins_given).toBe(5);
    });

    it('gives students with identical scores the same rank', async () => {
      queueSelect([{ grade_id: 3, session_id: 5, student_id: 9 }]);
      queueSelect([
        { student_id: 8, percentage: 90, marks_obtained: 90, total_daily_coin: 10, grade_id: 1 },
        { student_id: 9, percentage: 90, marks_obtained: 90, total_daily_coin: 10, grade_id: 3 },
      ]);
      queueSelect([{ coins_given: 0 }]);

      const result = await repository.findLastLesson(9);

      expect(result.rank).toBe(1);
    });

    it('falls back to the coins recorded on the grade when the ledger has none', async () => {
      queueSelect([{ grade_id: 3, session_id: 5, student_id: 9, total_daily_coin: 7 }]);
      queueSelect([{ student_id: 9, percentage: 80, grade_id: 3 }]);
      queueSelect([]);

      const result = await repository.findLastLesson(9);

      expect(result.coins_given).toBe(7);
    });

    it('reports no rank when the student has no grade in that lesson', async () => {
      queueSelect([{ grade_id: 3, session_id: 5, student_id: 9 }]);
      queueSelect([{ student_id: 8, percentage: 90, grade_id: 1 }]);
      queueSelect([{ coins_given: 0 }]);

      const result = await repository.findLastLesson(9);

      expect(result.rank).toBeNull();
      expect(result.total_students).toBe(1);
    });
  });

  describe('ranking', () => {
    it('orders a class by coins, then points, then id', async () => {
      queueRankRows([
        student(1, 5, 100),
        student(2, 10, 50),
        student(3, 10, 80),
      ]);

      const rows = await repository.classRank(3, 12);

      expect(rows.map((row) => row.student_id)).toEqual([3, 2, 1]);
      expect(rows.map((row) => row.rank)).toEqual([1, 2, 3]);
    });

    it('gives students with identical coins and points the same rank', async () => {
      queueRankRows([student(1, 10, 50), student(2, 10, 50), student(3, 5, 10)]);

      const rows = await repository.classRank(3, 12);

      expect(rows.map((row) => row.rank)).toEqual([1, 1, 3]);
    });

    it('reports how many students the ranking covers', async () => {
      queueRankRows([student(1, 10, 50), student(2, 5, 10)]);

      const rows = await repository.classRank(3, 12);

      expect(rows[0].total_students).toBe(2);
    });

    it('narrows the class ranking to one class', async () => {
      queueSelect([]);
      const chain = queueSelect([]);

      await repository.classRank(3, 12);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toEqual(expect.arrayContaining([3, 12]));
    });

    it('pulls one student row out of the class ranking', async () => {
      queueRankRows([student(1, 10, 50), student(9, 5, 10)]);

      await expect(repository.classRankSummary(3, 12, 9)).resolves.toMatchObject({ student_id: 9, rank: 2 });
    });

    it('returns null when the student is not in the class ranking', async () => {
      queueRankRows([student(1, 10, 50)]);

      await expect(repository.classRankSummary(3, 12, 9)).resolves.toBeNull();
    });

    it('ranks the whole center when no class is named', async () => {
      queueSelect([]);
      const chain = queueSelect([]);

      await repository.centerRank(3);

      expect(dialect.sqlToQuery(chain.where.mock.calls[0][0]).params).toEqual([3]);
    });

    it('caps the center leaderboard at the requested length', async () => {
      queueRankRows([student(1, 30, 0), student(2, 20, 0), student(3, 10, 0)]);

      const rows = await repository.centerRank(3, 2);

      expect(rows).toHaveLength(2);
    });

    it('defaults the center leaderboard to one hundred students', async () => {
      queueRankRows(Array.from({ length: 150 }, (_, index) => student(index + 1, 150 - index, 0)));

      const rows = await repository.centerRank(3);

      expect(rows).toHaveLength(100);
    });

    it('pulls one student row out of the center ranking', async () => {
      queueRankRows([student(1, 10, 0), student(9, 5, 0)]);

      await expect(repository.centerRankSummary(3, 9)).resolves.toMatchObject({ student_id: 9, rank: 2 });
    });

    it('returns null when the student is not in the center ranking', async () => {
      queueRankRows([student(1, 10, 0)]);

      await expect(repository.centerRankSummary(3, 9)).resolves.toBeNull();
    });
  });

  describe('results', () => {
    it('returns the page alongside its total', async () => {
      const rowChain = queueSelect([{ grade_id: 1 }]);
      queueSelect([{ total: 42 }]);

      await expect(repository.results(9, 2, 10)).resolves.toEqual({
        data: [{ grade_id: 1 }],
        total: 42,
        page: 2,
        limit: 10,
      });
      expect(rowChain.limit).toHaveBeenCalledWith(10);
      expect(rowChain.offset).toHaveBeenCalledWith(10);
    });

    it('reports a total of zero when the count query returns nothing', async () => {
      queueSelect([]);
      queueSelect([]);

      await expect(repository.results(9, 1, 10)).resolves.toMatchObject({ total: 0 });
    });
  });

  describe('payments', () => {
    it('returns only the student live payments in their own center', async () => {
      const rowChain = queueSelect([{ payment_id: 1 }]);
      queueSelect([{ total: 3 }]);

      const result = await repository.payments(9, 3, 1, 20);

      expect(result).toEqual({ data: [{ payment_id: 1 }], total: 3, page: 1, limit: 20 });
      const where = dialect.sqlToQuery(rowChain.where.mock.calls[0][0]);
      expect(where.params).toEqual(expect.arrayContaining([9, 3]));
      expect(where.sql).toContain('is null');
    });

    it('reports a total of zero when the count query returns nothing', async () => {
      queueSelect([]);
      queueSelect([]);

      await expect(repository.payments(9, 3, 1, 20)).resolves.toMatchObject({ total: 0 });
    });
  });
});
