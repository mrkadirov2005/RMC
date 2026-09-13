const mockDb = { transaction: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

jest.mock('../../repositories/grade.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByStudent: jest.fn(),
  findBySession: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  upsertSessionScores: jest.fn(),
  updateLessonCoins: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentInCenter: jest.fn(),
  classInCenter: jest.fn(),
}));

jest.mock('../../../students/services/student.service', () => ({
  addCoins: jest.fn(),
  upsertSourceCoins: jest.fn(),
}));

jest.mock('../../../../utils/coinCalculator', () => ({
  calculateCoins: jest.fn(),
}));

jest.mock('../../../settings/services/settings.service', () => ({
  getLessonScoring: jest.fn(),
}));

const gradeService = require('../grade.service');
const gradeRepository = require('../../repositories/grade.repository');
const { studentInCenter, classInCenter } = require('../../../../shared/tenantDb');
const studentService = require('../../../students/services/student.service');
const { calculateCoins } = require('../../../../utils/coinCalculator');
const settingsService = require('../../../settings/services/settings.service');

describe('grade service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    studentInCenter.mockResolvedValue(true);
    classInCenter.mockResolvedValue(true);
    calculateCoins.mockReturnValue(0);
  });

  describe('thin pass-throughs', () => {
    it.each([
      ['listGrades', [3, 7, 9], 'findAll', [3, 7, 9]],
      ['getGrade', [1, 3, 7], 'findById', [1, 3, 7]],
      ['listByStudent', [9, 3, 7], 'findByStudent', [9, 3, 7]],
      ['listBySession', [5, 3, 7], 'findBySession', [5, 3, 7]],
      ['deleteGrade', [1, 3, 7], 'remove', [1, 3, 7]],
    ])('%s forwards to the repository unchanged', (method, args, repoMethod, expected) => {
      gradeService[method](...args);

      expect(gradeRepository[repoMethod]).toHaveBeenCalledWith(...expected);
    });

    it('updateGrade passes only the editable score columns in order', () => {
      gradeService.updateGrade(1, {
        marks_obtained: 80,
        percentage: 80,
        grade_letter: 'A',
        attendance_score: 10,
        homework_score: 20,
        activity_score: 30,
        points_score: 20,
        subject: 'ignored',
      }, 3, 7);

      expect(gradeRepository.update).toHaveBeenCalledWith(1, [80, 80, 'A', 10, 20, 30, 20], 3, 7);
    });
  });

  describe('createGrade', () => {
    it('refuses a grade whose student is in another center', async () => {
      studentInCenter.mockResolvedValue(false);

      await expect(gradeService.createGrade({ student_id: 9, class_id: 2 }, 3)).resolves.toEqual({ error: 'invalid_center' });
      expect(gradeRepository.insert).not.toHaveBeenCalled();
    });

    it('refuses a grade whose class is in another center', async () => {
      classInCenter.mockResolvedValue(false);

      await expect(gradeService.createGrade({ student_id: 9, class_id: 2 }, 3)).resolves.toEqual({ error: 'invalid_center' });
    });

    it('skips the tenancy check when no center is given', async () => {
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.createGrade({ student_id: 9, class_id: 2 });

      expect(studentInCenter).not.toHaveBeenCalled();
    });

    it('derives the mark from the component scores when none is supplied', async () => {
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.createGrade({
        student_id: 9,
        class_id: 2,
        attendance_score: 10,
        homework_score: 20,
        activity_score: 30,
        points_score: 15,
      }, 3);

      const params = gradeRepository.insert.mock.calls[0][0];
      expect(params[5]).toBe(75);
      expect(params[6]).toBe(100);
      expect(params[7]).toBe(75);
    });

    it('keeps an explicit mark and percentage', async () => {
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.createGrade({ student_id: 9, class_id: 2, marks_obtained: 42, percentage: 84, total_marks: 50 }, 3);

      const params = gradeRepository.insert.mock.calls[0][0];
      expect(params[5]).toBe(42);
      expect(params[7]).toBe(84);
    });

    it('records a null percentage when the paper is worth nothing', async () => {
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.createGrade({ student_id: 9, class_id: 2, total_marks: -1 }, 3);

      expect(gradeRepository.insert.mock.calls[0][0][7]).toBeNull();
    });

    it('defaults every missing component score to zero', async () => {
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.createGrade({ student_id: 9, class_id: 2 }, 3);

      const params = gradeRepository.insert.mock.calls[0][0];
      expect(params.slice(12)).toEqual([0, 0, 0, 0]);
    });

    it('awards coins for the new grade', async () => {
      gradeRepository.insert.mockResolvedValue({
        student_id: 9,
        marks_obtained: 80,
        total_marks: 100,
        percentage: 80,
        subject: 'Maths',
      });
      calculateCoins.mockReturnValue(5);

      await gradeService.createGrade({ student_id: 9, class_id: 2 }, 3);

      expect(studentService.addCoins).toHaveBeenCalledWith(9, 5, 'Grade awarded: 80.0% in Maths', null, 'system');
    });

    it('awards nothing when the calculator returns zero', async () => {
      gradeRepository.insert.mockResolvedValue({ student_id: 9, marks_obtained: 0, total_marks: 100, percentage: 0 });

      await gradeService.createGrade({ student_id: 9, class_id: 2 }, 3);

      expect(studentService.addCoins).not.toHaveBeenCalled();
    });

    it('still returns the grade when the coin award fails', async () => {
      const row = { student_id: 9, marks_obtained: 80, total_marks: 100, percentage: 80, subject: 'Maths' };
      gradeRepository.insert.mockResolvedValue(row);
      calculateCoins.mockReturnValue(5);
      studentService.addCoins.mockRejectedValue(new Error('coin ledger down'));

      await expect(gradeService.createGrade({ student_id: 9, class_id: 2 }, 3)).resolves.toBe(row);
    });

    it('skips the coin award when the grade carries no marks', async () => {
      gradeRepository.insert.mockResolvedValue({ student_id: 9, marks_obtained: null, total_marks: 100 });

      await gradeService.createGrade({ student_id: 9, class_id: 2 }, 3);

      expect(studentService.addCoins).not.toHaveBeenCalled();
    });
  });

  describe('createBulk', () => {
    it('rolls the whole batch back when one row lands in another center', async () => {
      mockDb.transaction.mockImplementation(async (callback) => callback({}));
      studentInCenter.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      gradeRepository.insert.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await expect(gradeService.createBulk([{ student_id: 1, class_id: 2 }, { student_id: 2, class_id: 2 }], 3))
        .resolves.toEqual([{ error: 'invalid_center' }]);
    });

    it('returns every created row when the batch succeeds', async () => {
      mockDb.transaction.mockImplementation(async (callback) => callback({}));
      gradeRepository.insert
        .mockResolvedValueOnce({ grade_id: 1, marks_obtained: null, total_marks: null })
        .mockResolvedValueOnce({ grade_id: 2, marks_obtained: null, total_marks: null });

      const result = await gradeService.createBulk([{ student_id: 1, class_id: 2 }, { student_id: 2, class_id: 2 }], 3);

      expect(result).toHaveLength(2);
    });

    it('lets an unrelated database failure escape', async () => {
      mockDb.transaction.mockRejectedValue(new Error('deadlock'));

      await expect(gradeService.createBulk([], 3)).rejects.toThrow('deadlock');
    });
  });

  describe('upsertSessionScores', () => {
    it('requires a session id', async () => {
      await expect(gradeService.upsertSessionScores({})).resolves.toEqual({ error: 'session_id_required' });
      expect(gradeRepository.upsertSessionScores).not.toHaveBeenCalled();
    });

    it('defaults the subject and the paper total', async () => {
      gradeRepository.upsertSessionScores.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.upsertSessionScores({ session_id: 5, student_id: 9 }, 3);

      const params = gradeRepository.upsertSessionScores.mock.calls[0][0];
      expect(params[2]).toBe('Session');
      expect(params[5]).toBe(100);
    });

    it('passes missing component scores through as null rather than zero', async () => {
      gradeRepository.upsertSessionScores.mockResolvedValue({ marks_obtained: null, total_marks: null });

      await gradeService.upsertSessionScores({ session_id: 5, student_id: 9 }, 3);

      expect(gradeRepository.upsertSessionScores.mock.calls[0][0].slice(9)).toEqual([null, null, null, null]);
    });

    it('records the academic coins and writes them back onto the grade', async () => {
      gradeRepository.upsertSessionScores.mockResolvedValue({
        grade_id: 11,
        student_id: 9,
        session_id: 5,
        teacher_id: 7,
        marks_obtained: 80,
        total_marks: 100,
        subject: 'Session',
      });
      calculateCoins.mockReturnValue(6);

      await gradeService.upsertSessionScores({ session_id: 5, student_id: 9 }, 3);

      expect(studentService.upsertSourceCoins).toHaveBeenCalledWith(
        9, 6, 'Academic performance: 80/100 in Session', 'lesson_session', 5, 7, 'teacher',
      );
      expect(gradeRepository.updateLessonCoins).toHaveBeenCalledWith(11, 6, 6, 'Academic performance: 80/100 in Session');
    });

    it('skips the coin award when the caller opts out', async () => {
      gradeRepository.upsertSessionScores.mockResolvedValue({ marks_obtained: 80, total_marks: 100 });

      await gradeService.upsertSessionScores({ session_id: 5, student_id: 9, award_coins: false }, 3);

      expect(studentService.upsertSourceCoins).not.toHaveBeenCalled();
    });

    it('still returns the grade when the coin award fails', async () => {
      const row = { grade_id: 11, student_id: 9, marks_obtained: 80, total_marks: 100, subject: 'Session' };
      gradeRepository.upsertSessionScores.mockResolvedValue(row);
      calculateCoins.mockReturnValue(6);
      studentService.upsertSourceCoins.mockRejectedValue(new Error('ledger down'));

      await expect(gradeService.upsertSessionScores({ session_id: 5, student_id: 9 }, 3)).resolves.toBe(row);
    });
  });

  describe('saveSessionWorkflow', () => {
    const baseBody = (overrides = {}) => ({
      class_id: 2,
      session_id: 5,
      teacher_id: 7,
      attendance_date: '2026-09-01',
      subject: 'Session',
      total_marks: 100,
      records: [{ student_id: 9, attendance_score: 10, homework_score: 20, activity_score: 30, points_score: 15 }],
      ...overrides,
    });

    const createClient = () => {
      const selectQueue = [];
      const client = {
        queueSelect: (rows) => selectQueue.push(rows),
        inserts: [],
        updates: [],
        deletes: 0,
        select: jest.fn(() => {
          const rows = selectQueue.shift() || [];
          const chain = {};
          chain.from = jest.fn(() => chain);
          chain.where = jest.fn(() => chain);
          chain.limit = jest.fn(() => Promise.resolve(rows));
          chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
          return chain;
        }),
        insert: jest.fn(() => {
          const chain = {};
          chain.values = jest.fn((values) => {
            client.inserts.push(values);
            return chain;
          });
          chain.returning = jest.fn(() => Promise.resolve([{ grade_id: 11, student_id: 9, session_id: 5, marks_obtained: 75, total_marks: 100, subject: 'Session' }]));
          return chain;
        }),
        update: jest.fn(() => {
          const chain = {};
          chain.set = jest.fn((values) => {
            client.updates.push(values);
            return chain;
          });
          chain.where = jest.fn(() => chain);
          chain.returning = jest.fn(() => Promise.resolve([{ transaction_id: 1 }]));
          chain.then = (resolve, reject) => Promise.resolve().then(resolve, reject);
          return chain;
        }),
        delete: jest.fn(() => {
          const chain = {};
          chain.where = jest.fn(() => {
            client.deletes += 1;
            return Promise.resolve();
          });
          return chain;
        }),
      };
      return client;
    };

    beforeEach(() => {
      settingsService.getLessonScoring.mockResolvedValue({
        coinScoreMapping: [{ score: 90, coins: 10 }, { score: 70, coins: 5 }, { score: 0, coins: 1 }],
        stellarBonusCoins: 3,
      });
    });

    it.each([
      [{ class_id: null }],
      [{ session_id: null }],
      [{ records: [] }],
      [{ records: 'not an array' }],
    ])('refuses an incomplete payload %p', async (overrides) => {
      await expect(gradeService.saveSessionWorkflow(baseBody(overrides), 3)).resolves.toEqual({ error: 'invalid_payload' });
    });

    it('refuses more than one stellar student in a lesson', async () => {
      const body = baseBody({
        records: [{ student_id: 9, is_stellar_student: true }, { student_id: 10, is_stellar_student: true }],
      });

      await expect(gradeService.saveSessionWorkflow(body, 3)).resolves.toEqual({ error: 'multiple_stellar_students' });
    });

    it('allows several stellar flags when coins are switched off', async () => {
      classInCenter.mockResolvedValue(false);
      const body = baseBody({
        award_coins: false,
        records: [{ student_id: 9, is_stellar_student: true }, { student_id: 10, is_stellar_student: true }],
      });

      await expect(gradeService.saveSessionWorkflow(body, 3)).resolves.toEqual({ error: 'invalid_center' });
    });

    it('refuses a class from another center', async () => {
      classInCenter.mockResolvedValue(false);

      await expect(gradeService.saveSessionWorkflow(baseBody(), 3)).resolves.toEqual({ error: 'invalid_center' });
    });

    it('saves attendance, the grade and the coin ledger entry together', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([]);
      client.queueSelect([{ student_id: 9, center_id: 3, coins: 10 }]);
      client.queueSelect([]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      const body = baseBody({ records: [{ student_id: 9, attendance_status: 'Present', attendance_score: 10, homework_score: 20, activity_score: 30, points_score: 15 }] });
      const result = await gradeService.saveSessionWorkflow(body, 3);

      expect(result.attendance).toHaveLength(1);
      expect(result.grades).toHaveLength(1);
      expect(result.coins).toHaveLength(1);
    });

    it('scores the lesson against the configured coin mapping', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([{ student_id: 9, center_id: 3, coins: 10 }]);
      client.queueSelect([]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      const result = await gradeService.saveSessionWorkflow(baseBody(), 3);

      // 75 of 100 falls in the 70-point band, worth 5 coins, so the balance moves from 10 to 15.
      expect(result.coins[0].balance).toBe(15);
    });

    it('adds the stellar bonus on top of the banded award', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([{ student_id: 9, center_id: 3, coins: 0 }]);
      client.queueSelect([]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      const body = baseBody({
        records: [{ student_id: 9, attendance_score: 10, homework_score: 20, activity_score: 30, points_score: 15, is_stellar_student: true }],
      });
      const result = await gradeService.saveSessionWorkflow(body, 3);

      expect(result.coins[0].balance).toBe(8);
      expect(client.inserts.some((values) => String(values.reason || '').includes('Stellar student bonus: +3'))).toBe(true);
    });

    it('replaces an earlier award for the same lesson rather than stacking it', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([{ student_id: 9, center_id: 3, coins: 12 }]);
      client.queueSelect([{ transaction_id: 4, delta: 7 }]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      const result = await gradeService.saveSessionWorkflow(baseBody(), 3);

      // The stored balance already contains the old award of 7, so it moves to 12 - 7 + 5.
      expect(result.coins[0].balance).toBe(10);
    });

    it('clears the lesson coins when the caller switches awards off', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([{ student_id: 9, coins: 12 }]);
      client.queueSelect([{ transaction_id: 4, delta: 5 }]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      const result = await gradeService.saveSessionWorkflow(baseBody({ award_coins: false }), 3);

      expect(result.coins).toHaveLength(0);
      expect(client.deletes).toBe(1);
      expect(client.updates.some((values) => values.baseCoin === 0 && values.coinComment === null)).toBe(true);
    });

    it('refuses a record with no student id', async () => {
      mockDb.transaction.mockImplementation(async (callback) => callback(createClient()));

      await expect(gradeService.saveSessionWorkflow(baseBody({ records: [{}] }), 3))
        .rejects.toThrow('student_id is required for every record');
    });

    it('refuses a student from another center', async () => {
      const client = createClient();
      client.queueSelect([]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      await expect(gradeService.saveSessionWorkflow(baseBody(), 3))
        .rejects.toThrow('Student 9 does not belong to this center.');
    });

    it('fails the lesson when the coin ledger cannot be written', async () => {
      const client = createClient();
      client.queueSelect([{ student_id: 9 }]);
      client.queueSelect([]);
      client.queueSelect([]);
      mockDb.transaction.mockImplementation(async (callback) => callback(client));

      await expect(gradeService.saveSessionWorkflow(baseBody(), 3))
        .rejects.toThrow('Failed to save coins for student 9: student_not_found');
    });
  });
});
