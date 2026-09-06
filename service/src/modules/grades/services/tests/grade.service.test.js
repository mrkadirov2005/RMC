const transaction = jest.fn();
jest.mock('../../../../db/pool', () => ({ db: { transaction } }));
jest.mock('../../../../db/schema', () => ({
  attendance: { attendanceId: 'attendanceId', centerId: 'centerId', studentId: 'studentId', teacherId: 'teacherId', classId: 'classId', sessionId: 'sessionId', attendanceDate: 'attendanceDate', status: 'status', remarks: 'remarks' },
  grades: { gradeId: 'gradeId', centerId: 'centerId', studentId: 'studentId', teacherId: 'teacherId', subject: 'subject', classId: 'classId', sessionId: 'sessionId', totalMarks: 'totalMarks', attendanceScore: 'attendanceScore', homeworkScore: 'homeworkScore', activityScore: 'activityScore', pointsScore: 'pointsScore', marksObtained: 'marksObtained', percentage: 'percentage', academicYear: 'academicYear', term: 'term' },
  studentCoinTransactions: { transactionId: 'transactionId', studentId: 'studentId', centerId: 'centerId', delta: 'delta', reason: 'reason', createdBy: 'createdBy', createdByType: 'createdByType', sourceType: 'sourceType', sourceId: 'sourceId', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  students: { studentId: 'studentId', centerId: 'centerId', deletedAt: 'deletedAt', coins: 'coins' },
}));
jest.mock('drizzle-orm', () => ({ and: jest.fn((...x) => x), eq: jest.fn((...x) => x), isNull: jest.fn((x) => x), sql: jest.fn() }));
jest.mock('../../repositories/grade.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), insert: jest.fn(), update: jest.fn(), findByStudent: jest.fn(),
  findBySession: jest.fn(), remove: jest.fn(), upsertSessionScores: jest.fn(), updateLessonCoins: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn(), classInCenter: jest.fn() }));
jest.mock('../../../students/services/student.service', () => ({ addCoins: jest.fn(), upsertSourceCoins: jest.fn() }));
jest.mock('../../../../utils/coinCalculator', () => ({ calculateCoins: jest.fn(() => 5) }));
jest.mock('../../../settings/services/settings.service', () => ({ getLessonScoring: jest.fn(() => ({ stellarBonusCoins: 10, coinScoreMapping: [] })) }));

const repository = require('../../repositories/grade.repository');
const tenantDb = require('../../../../shared/tenantDb');
const students = require('../../../students/services/student.service');
const service = require('../grade.service');

describe('grade service', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'error').mockImplementation(() => {}); });

  test('forwards scoped reads, update, and delete', () => {
    service.listGrades(2, 3, 4); service.getGrade(1, 2, 3); service.listByStudent(4, 2, 3);
    service.listBySession(5, 2, 3); service.updateGrade(1, { marks_obtained: 80 }, 2, 3); service.deleteGrade(1, 2, 3);
    expect(repository.findAll).toHaveBeenCalledWith(2, 3, 4); expect(repository.findById).toHaveBeenCalledWith(1, 2, 3);
    expect(repository.update).toHaveBeenCalledWith(1, [80, undefined, undefined, undefined, undefined, undefined, undefined], 2, 3);
    expect(repository.remove).toHaveBeenCalledWith(1, 2, 3);
  });

  test('rejects grade creation for cross-center student or class', async () => {
    tenantDb.studentInCenter.mockResolvedValue(true); tenantDb.classInCenter.mockResolvedValue(false);
    await expect(service.createGrade({ student_id: 1, class_id: 3 }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('derives marks and percentage from score components and awards coins', async () => {
    tenantDb.studentInCenter.mockResolvedValue(true); tenantDb.classInCenter.mockResolvedValue(true);
    repository.insert.mockImplementation(async (params) => ({ grade_id: 1, student_id: params[0], subject: params[2], marks_obtained: params[5], total_marks: params[6], percentage: params[7] }));
    const result = await service.createGrade({ student_id: 1, class_id: 3, subject: 'Math', attendance_score: 20, homework_score: 25, activity_score: 15, points_score: 30 }, 2);
    expect(result).toMatchObject({ marks_obtained: 90, total_marks: 100, percentage: 90 });
    expect(students.addCoins).toHaveBeenCalledWith(1, 5, expect.stringContaining('90.0%'), null, 'system');
  });

  test('handles zero total marks without invalid percentage', async () => {
    tenantDb.studentInCenter.mockResolvedValue(true); tenantDb.classInCenter.mockResolvedValue(true);
    repository.insert.mockImplementation(async (params) => ({ grade_id: 1, student_id: 1, marks_obtained: params[5], total_marks: params[6], percentage: params[7] }));
    const result = await service.createGrade({ student_id: 1, class_id: 3, total_marks: 0, marks_obtained: 0 }, 2);
    expect(result.percentage).toBe(0);
  });

  test('rejects invalid workflow shape, multiple stellar students, and cross-center class', async () => {
    await expect(service.saveSessionWorkflow({}, 2)).resolves.toEqual({ error: 'invalid_payload' });
    const base = { class_id: 1, session_id: 2, records: [{ student_id: 1, is_stellar_student: true }, { student_id: 2, is_stellar_student: true }] };
    await expect(service.saveSessionWorkflow(base, 2)).resolves.toEqual({ error: 'multiple_stellar_students' });
    tenantDb.classInCenter.mockResolvedValue(false);
    await expect(service.saveSessionWorkflow({ class_id: 1, session_id: 2, records: [{ student_id: 1 }] }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(transaction).not.toHaveBeenCalled();
  });

  test('requires a session for score upsert', async () => {
    await expect(service.upsertSessionScores({ student_id: 1 }, 2)).resolves.toEqual({ error: 'session_id_required' });
    expect(repository.upsertSessionScores).not.toHaveBeenCalled();
  });

  // RMC-062: createBulk wraps every insert of the batch in a single db.transaction
  // so a mid-array failure rolls back the whole batch rather than leaving a partial write.
  describe('createBulk atomicity', () => {
    test('a failing insert partway through the batch aborts the whole transaction and stops the loop', async () => {
      tenantDb.studentInCenter.mockResolvedValue(true);
      tenantDb.classInCenter.mockResolvedValue(true);
      transaction.mockImplementation(async (cb) => cb({}));
      let calls = 0;
      repository.insert.mockImplementation(async (params) => {
        calls += 1;
        if (calls === 2) throw new Error('constraint violation on grade #2');
        return { grade_id: calls, student_id: params[0], marks_obtained: params[5], total_marks: params[6], percentage: params[7] };
      });

      await expect(service.createBulk([
        { student_id: 1, class_id: 3 },
        { student_id: 2, class_id: 3 },
        { student_id: 3, class_id: 3 },
      ], 2)).rejects.toThrow('constraint violation on grade #2');

      // Everything ran inside one db.transaction call, and the third grade was
      // never attempted once the second failed -- the failure propagates out of
      // the transaction callback so a real DB would roll back grade #1's insert too.
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(repository.insert).toHaveBeenCalledTimes(2);
    });

    test('an invalid_center error partway through the batch aborts the transaction without inserting the remaining grades', async () => {
      tenantDb.studentInCenter.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      tenantDb.classInCenter.mockResolvedValue(true);
      transaction.mockImplementation(async (cb) => cb({}));
      repository.insert.mockResolvedValue({ grade_id: 1, student_id: 1, marks_obtained: 1, total_marks: 100, percentage: 1 });

      const result = await service.createBulk([
        { student_id: 1, class_id: 3 },
        { student_id: 2, class_id: 3 },
      ], 2);

      expect(result).toEqual([{ error: 'invalid_center' }]);
      expect(transaction).toHaveBeenCalledTimes(1);
      // Only the first grade's insert was ever attempted inside the aborted transaction.
      expect(repository.insert).toHaveBeenCalledTimes(1);
    });
  });
});
