jest.mock('../../repositories/test.repository', () => ({
  statisticsTotals: jest.fn(),
  statisticsByType: jest.fn(),
  statisticsByTeacher: jest.fn(),
}));

jest.mock('../../../../db/pool', () => ({ db: {}, query: jest.fn(), sql: require('drizzle-orm').sql }));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn(), classInCenter: jest.fn() }));
jest.mock('../../../students/services/student.service', () => ({ getStudent: jest.fn(), findByUsername: jest.fn() }));

const testService = require('../test.service');
const testRepository = require('../../repositories/test.repository');

const teacherRow = (overrides = {}) => ({
  teacher_id: 1,
  teacher_name: 'Ada Teacher',
  tests: 5,
  submissions: 100,
  graded_submissions: 100,
  average_score: '70.0',
  pass_rate: '70',
  ...overrides,
});

describe('test statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testRepository.statisticsTotals.mockResolvedValue({
      tests: 78, active: 61, submissions: 1284, awaiting_grading: 94, average_score: '72.4', pass_rate: '68',
    });
    testRepository.statisticsByType.mockResolvedValue([{ test_type: 'multiple_choice', tests: 33 }]);
    testRepository.statisticsByTeacher.mockResolvedValue([]);
  });

  describe('totals', () => {
    it('returns the headline figures as numbers', async () => {
      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.totals).toEqual({
        tests: 78, active: 61, submissions: 1284, awaiting_grading: 94, average_score: 72.4, pass_rate: 68,
      });
    });

    it('reports a null average when nothing has been graded', async () => {
      testRepository.statisticsTotals.mockResolvedValue({ tests: 4, active: 4, submissions: 0, awaiting_grading: 0, average_score: null, pass_rate: null });

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.totals.average_score).toBeNull();
      expect(result.totals.pass_rate).toBeNull();
    });

    it('passes the calling center to every query', async () => {
      await testService.getStatistics(3, { userType: 'superuser' });

      expect(testRepository.statisticsTotals).toHaveBeenCalledWith(3);
      expect(testRepository.statisticsByType).toHaveBeenCalledWith(3);
      expect(testRepository.statisticsByTeacher).toHaveBeenCalledWith(3);
    });
  });

  describe('type mix', () => {
    it('returns one row per question type', async () => {
      testRepository.statisticsByType.mockResolvedValue([
        { test_type: 'multiple_choice', tests: 33 },
        { test_type: 'essay', tests: 16 },
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_type).toEqual([
        { test_type: 'multiple_choice', tests: 33 },
        { test_type: 'essay', tests: 16 },
      ]);
    });
  });

  describe('teacher leaderboard', () => {
    it('ranks a teacher only once enough work has been graded', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Ranked', graded_submissions: 20 }),
        teacherRow({ teacher_id: 2, teacher_name: 'Too few', graded_submissions: 19 }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher.find((row) => row.teacher_name === 'Ranked').ranked).toBe(true);
      expect(result.by_teacher.find((row) => row.teacher_name === 'Too few').ranked).toBe(false);
    });

    it('puts the best pass rate first', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Second', pass_rate: '71' }),
        teacherRow({ teacher_id: 2, teacher_name: 'First', pass_rate: '84' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher.map((row) => row.teacher_name)).toEqual(['First', 'Second']);
    });

    it('breaks a pass-rate tie on average score', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Lower average', pass_rate: '80', average_score: '70.0' }),
        teacherRow({ teacher_id: 2, teacher_name: 'Higher average', pass_rate: '80', average_score: '81.0' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher[0].teacher_name).toBe('Higher average');
    });

    it('keeps an unranked teacher below every ranked one, however high their score', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'One perfect test', graded_submissions: 1, pass_rate: '100', average_score: '100.0' }),
        teacherRow({ teacher_id: 2, teacher_name: 'Steady', graded_submissions: 40, pass_rate: '61' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher.map((row) => row.teacher_name)).toEqual(['Steady', 'One perfect test']);
    });

    it('orders unranked teachers alphabetically so the table does not reshuffle', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Zebra', graded_submissions: 0, pass_rate: null }),
        teacherRow({ teacher_id: 2, teacher_name: 'Alpha', graded_submissions: 0, pass_rate: null }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher.map((row) => row.teacher_name)).toEqual(['Alpha', 'Zebra']);
    });

    it('names the teacher by their id when the record has no name', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([teacherRow({ teacher_id: 9, teacher_name: '  ' })]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.by_teacher[0].teacher_name).toBe('Teacher 9');
    });

    it('publishes the ranking rule alongside the rows', async () => {
      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.ranking).toEqual({ metric: 'pass_rate', minimum_graded_submissions: 20 });
    });
  });

  describe('what each role sees', () => {
    it('shows a superuser every teacher', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Ada' }),
        teacherRow({ teacher_id: 2, teacher_name: 'Grace' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser', id: 99 });

      expect(result.by_teacher).toHaveLength(2);
      expect(result.scope).toBe('center');
    });

    it('shows a teacher only their own row', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, teacher_name: 'Ada' }),
        teacherRow({ teacher_id: 2, teacher_name: 'Grace' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'teacher', id: 2 });

      expect(result.by_teacher).toHaveLength(1);
      expect(result.by_teacher[0].teacher_name).toBe('Grace');
      expect(result.scope).toBe('self');
    });

    it('gives a teacher the centre median to compare against', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, pass_rate: '60', average_score: '60.0' }),
        teacherRow({ teacher_id: 2, pass_rate: '70', average_score: '70.0' }),
        teacherRow({ teacher_id: 3, pass_rate: '80', average_score: '80.0' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'teacher', id: 2 });

      expect(result.center_median).toEqual({ average_score: 70, pass_rate: 70, ranked_teachers: 3 });
    });

    it('averages the middle pair for an even number of ranked teachers', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([
        teacherRow({ teacher_id: 1, pass_rate: '60', average_score: '60.0' }),
        teacherRow({ teacher_id: 2, pass_rate: '70', average_score: '70.0' }),
      ]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.center_median.pass_rate).toBe(65);
    });

    it('reports no median when nobody is ranked yet', async () => {
      testRepository.statisticsByTeacher.mockResolvedValue([teacherRow({ graded_submissions: 2 })]);

      const result = await testService.getStatistics(3, { userType: 'superuser' });

      expect(result.center_median).toEqual({ average_score: null, pass_rate: null, ranked_teachers: 0 });
    });
  });
});

describe('what a student receives when they open a test', () => {
  beforeEach(() => {
    testRepository.findById = jest.fn();
    testRepository.findQuestionsByTest = jest.fn();
    testRepository.findPassagesByTest = jest.fn();
  });

  const scoredTest = { test_id: 7, center_id: 3, is_private: false, created_by: 4 };
  const question = {
    question_id: 1,
    question_text: 'Choose the best answer',
    options: ['A', 'B'],
    correct_answer: { index: 1 },
    explanation: 'B is correct',
    rubric: 'Full marks for B',
  };

  it('hides the marking scheme from the student sitting the paper', async () => {
    testRepository.findById.mockResolvedValue(scoredTest);
    testRepository.findQuestionsByTest.mockResolvedValue([question]);
    testRepository.findPassagesByTest.mockResolvedValue([]);

    const result = await testService.getTestById(7, 3, { userType: 'student', id: 9 });

    expect(result.questions[0]).not.toHaveProperty('correct_answer');
    expect(result.questions[0]).not.toHaveProperty('explanation');
    expect(result.questions[0]).not.toHaveProperty('rubric');
    expect(result.questions[0].options).toEqual(['A', 'B']);
  });

  it('still gives a teacher the marking scheme', async () => {
    testRepository.findById.mockResolvedValue(scoredTest);
    testRepository.findQuestionsByTest.mockResolvedValue([question]);
    testRepository.findPassagesByTest.mockResolvedValue([]);

    const result = await testService.getTestById(7, 3, { userType: 'teacher', id: 4 });

    expect(result.questions[0].correct_answer).toEqual({ index: 1 });
    expect(result.questions[0].explanation).toBe('B is correct');
  });

  it('still gives a superuser the marking scheme', async () => {
    testRepository.findById.mockResolvedValue(scoredTest);
    testRepository.findQuestionsByTest.mockResolvedValue([question]);
    testRepository.findPassagesByTest.mockResolvedValue([]);

    const result = await testService.getTestById(7, 3, { userType: 'superuser', id: 1 });

    expect(result.questions[0].correct_answer).toEqual({ index: 1 });
  });
});
