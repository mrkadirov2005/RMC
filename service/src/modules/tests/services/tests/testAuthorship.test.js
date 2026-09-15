jest.mock('../../repositories/test.repository', () => ({
  findById: jest.fn(),
  findQuestionTestId: jest.fn(),
  findPassageTestId: jest.fn(),
  updateQuestion: jest.fn(),
  updatePassage: jest.fn(),
}));

jest.mock('../../../../db/pool', () => ({ db: {}, query: jest.fn(), sql: require('drizzle-orm').sql }));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn(), classInCenter: jest.fn() }));
jest.mock('../../../students/services/student.service', () => ({ getStudent: jest.fn(), findByUsername: jest.fn() }));

const testService = require('../test.service');
const testRepository = require('../../repositories/test.repository');

const author = { userType: 'teacher', id: 4 };
const colleague = { userType: 'teacher', id: 9 };
const superuser = { userType: 'superuser', id: 1 };

const test = (overrides = {}) => ({ test_id: 7, center_id: 3, created_by: 4, created_by_type: 'teacher', ...overrides });

describe('who may change a test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canModifyTest', () => {
    it('lets the teacher who wrote it change it', () => {
      expect(testService.canModifyTest(test(), author)).toBe(true);
    });

    it('stops a colleague changing it', () => {
      expect(testService.canModifyTest(test(), colleague)).toBe(false);
    });

    it('lets a superuser change any test', () => {
      expect(testService.canModifyTest(test(), superuser)).toBe(true);
    });

    it('stops a teacher whose id matches a superuser-created test', () => {
      // created_by holds a superuser id here, which can collide with a teacher id.
      expect(testService.canModifyTest(test({ created_by: 4, created_by_type: 'superuser' }), author)).toBe(false);
    });

    it('stops a student', () => {
      expect(testService.canModifyTest(test(), { userType: 'student', id: 4 })).toBe(false);
    });

    it('refuses when there is no user', () => {
      expect(testService.canModifyTest(test(), null)).toBe(false);
    });
  });

  describe('checkTestWriteAccess', () => {
    it('allows the author to write to their test', async () => {
      testRepository.findById.mockResolvedValue(test());

      await expect(testService.checkTestWriteAccess({ testId: 7 }, 3, author)).resolves.toBe('ok');
    });

    it('forbids a colleague writing to it', async () => {
      testRepository.findById.mockResolvedValue(test());

      await expect(testService.checkTestWriteAccess({ testId: 7 }, 3, colleague)).resolves.toBe('forbidden');
    });

    it('reports a test outside the centre as not found', async () => {
      testRepository.findById.mockResolvedValue(null);

      await expect(testService.checkTestWriteAccess({ testId: 7 }, 3, author)).resolves.toBe('not_found');
    });

    it('resolves a question to its test before deciding', async () => {
      testRepository.findQuestionTestId.mockResolvedValue(7);
      testRepository.findById.mockResolvedValue(test());

      await expect(testService.checkTestWriteAccess({ questionId: 21 }, 3, colleague)).resolves.toBe('forbidden');
      expect(testRepository.findQuestionTestId).toHaveBeenCalledWith(21, 3);
    });

    it('resolves a passage to its test before deciding', async () => {
      testRepository.findPassageTestId.mockResolvedValue(7);
      testRepository.findById.mockResolvedValue(test());

      await expect(testService.checkTestWriteAccess({ passageId: 5 }, 3, author)).resolves.toBe('ok');
      expect(testRepository.findPassageTestId).toHaveBeenCalledWith(5, 3);
    });

    it('reports a question that does not exist as not found', async () => {
      testRepository.findQuestionTestId.mockResolvedValue(null);

      await expect(testService.checkTestWriteAccess({ questionId: 21 }, 3, author)).resolves.toBe('not_found');
      expect(testRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('moving a question or passage between tests', () => {
    it('ignores a test_id in a question update', async () => {
      testRepository.updateQuestion.mockResolvedValue({ question_id: 21 });

      await testService.updateQuestion(21, { test_id: 999, question_text: 'Edited' }, 3);

      expect(testRepository.updateQuestion.mock.calls[0][0][0]).toBeNull();
    });

    it('ignores a test_id in a passage update', async () => {
      testRepository.updatePassage.mockResolvedValue({ passage_id: 5 });

      await testService.updatePassage(5, { test_id: 999, title: 'Edited' }, 3);

      expect(testRepository.updatePassage.mock.calls[0][0][0]).toBeNull();
    });
  });
});
