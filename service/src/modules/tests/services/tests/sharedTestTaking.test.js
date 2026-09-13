jest.mock('../../repositories/test.repository', () => ({
  findByShareToken: jest.fn(),
  findSubmissionByAccessToken: jest.fn(),
  setSubmissionAccessToken: jest.fn(),
  findQuestionsByTest: jest.fn(),
  findPassagesByTest: jest.fn(),
  findById: jest.fn(),
  findSubmissionById: jest.fn(),
  updateSubmission: jest.fn(),
  deleteAnswersBySubmission: jest.fn(),
  insertAnswer: jest.fn(),
  findAnswersBySubmission: jest.fn(),
  updateAnswer: jest.fn(),
  findResultByStudent: jest.fn(),
  upsertResult: jest.fn(),
}));

jest.mock('../../../../db/pool', () => ({ db: {}, query: jest.fn(), sql: require('drizzle-orm').sql }));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn(), classInCenter: jest.fn() }));
jest.mock('../../../students/services/student.service', () => ({ getStudent: jest.fn(), findByUsername: jest.fn() }));

const testService = require('../test.service');
const testRepository = require('../../repositories/test.repository');

const test = (overrides = {}) => ({
  test_id: 7,
  center_id: 3,
  test_name: 'Unit 4 Reading',
  test_type: 'multiple_choice',
  description: 'Covers units 3 and 4',
  instructions: 'Answer every question',
  total_marks: 20,
  passing_marks: 12,
  duration_minutes: 30,
  is_timed: true,
  shuffle_questions: false,
  share_token: 'token-abc',
  ...overrides,
});

const submission = (overrides = {}) => ({
  submission_id: 55,
  test_id: 7,
  student_id: 9,
  center_id: 3,
  status: 'in_progress',
  ...overrides,
});

const question = (overrides = {}) => ({
  question_id: 1,
  test_id: 7,
  question_text: 'Choose the best answer',
  question_type: 'multiple_choice',
  marks: 4,
  options: ['A', 'B'],
  correct_answer: { index: 1 },
  explanation: 'B is correct because...',
  rubric: 'Award full marks for B',
  ...overrides,
});

describe('taking a test from a share link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testRepository.findQuestionsByTest.mockResolvedValue([question()]);
    testRepository.findPassagesByTest.mockResolvedValue([]);
    testRepository.setSubmissionAccessToken.mockResolvedValue(submission());
    testRepository.findById.mockResolvedValue(test());
    testRepository.findResultByStudent.mockResolvedValue(null);
    testRepository.upsertResult.mockResolvedValue({});
  });

  describe('reopening an attempt', () => {
    it('refuses a token that matches no live test', async () => {
      testRepository.findByShareToken.mockResolvedValue(null);

      await expect(testService.getSharedSubmission('nope', 55, 'secret')).resolves.toEqual({ error: 'not_found' });
    });

    it('refuses a submission whose secret does not match', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(null);

      await expect(testService.getSharedSubmission('token-abc', 55, 'wrong')).resolves.toEqual({ error: 'not_found' });
    });

    it('refuses a submission that belongs to a different test', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ test_id: 7 }));
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission({ test_id: 99 }));

      await expect(testService.getSharedSubmission('token-abc', 55, 'secret')).resolves.toEqual({ error: 'not_found' });
    });

    it('returns the paper with the marking scheme stripped out', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission());

      const result = await testService.getSharedSubmission('token-abc', 55, 'secret');

      expect(result.test.questions).toHaveLength(1);
      expect(result.test.questions[0]).not.toHaveProperty('correct_answer');
      expect(result.test.questions[0]).not.toHaveProperty('explanation');
      expect(result.test.questions[0]).not.toHaveProperty('rubric');
      expect(result.test.questions[0].question_text).toBe('Choose the best answer');
      expect(result.test.questions[0].options).toEqual(['A', 'B']);
    });

    it('carries the settings the take screen needs', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission());

      const result = await testService.getSharedSubmission('token-abc', 55, 'secret');

      expect(result.test).toMatchObject({
        test_id: 7,
        test_name: 'Unit 4 Reading',
        duration_minutes: 30,
        is_timed: true,
        shuffle_questions: false,
      });
      expect(result.submission).toEqual(submission());
    });

    it('never exposes the centre on the public payload', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission());

      const result = await testService.getSharedSubmission('token-abc', 55, 'secret');

      expect(result.test).not.toHaveProperty('center_id');
      expect(result.test).not.toHaveProperty('share_token');
    });
  });

  describe('handing in an attempt', () => {
    it('refuses a token that matches no live test', async () => {
      testRepository.findByShareToken.mockResolvedValue(null);

      await expect(testService.submitSharedTest('nope', 55, 'secret', {})).resolves.toEqual({ error: 'not_found' });
    });

    it('refuses a submission whose secret does not match', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(null);

      await expect(testService.submitSharedTest('token-abc', 55, 'wrong', {})).resolves.toEqual({ error: 'not_found' });
    });

    it('refuses an attempt that was already handed in', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission({ status: 'graded' }));

      await expect(testService.submitSharedTest('token-abc', 55, 'secret', {}))
        .resolves.toEqual({ error: 'already_submitted' });
      expect(testRepository.updateSubmission).not.toHaveBeenCalled();
    });

    it('retires the secret once the paper is in, so a forwarded link cannot reopen it', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission());
      testRepository.findSubmissionById.mockResolvedValue(submission());
      testRepository.updateSubmission.mockResolvedValue(submission({ status: 'submitted' }));
      testRepository.findAnswersBySubmission.mockResolvedValue([]);

      await testService.submitSharedTest('token-abc', 55, 'secret', { answers: [] });

      expect(testRepository.setSubmissionAccessToken).toHaveBeenCalledWith(55, null);
    });

    it('hands the answers to the same submit path an authenticated student uses', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      testRepository.findSubmissionByAccessToken.mockResolvedValue(submission());
      testRepository.findSubmissionById.mockResolvedValue(submission());
      testRepository.updateSubmission.mockResolvedValue(submission({ status: 'submitted' }));
      testRepository.findAnswersBySubmission.mockResolvedValue([]);

      await testService.submitSharedTest('token-abc', 55, 'secret', { answers: [], time_taken_seconds: 120 });

      expect(testRepository.updateSubmission).toHaveBeenCalled();
      expect(testRepository.updateSubmission.mock.calls[0][0][1]).toBe(120);
    });
  });
});
