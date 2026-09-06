// RMC-065: the exam engine's retake-limit and word-limit checks are two of
// the highest-consequence untested pieces of business logic in this module —
// getting either boundary wrong silently changes what students are allowed
// to submit and how many attempts they get.
jest.mock('../../repositories/test.repository', () => ({
  findById: jest.fn(),
  countSubmissionsByStudent: jest.fn(),
  insertSubmission: jest.fn(),
  findSubmissionById: jest.fn(),
  findQuestionsByTest: jest.fn(),
  updateSubmission: jest.fn(),
  deleteAnswersBySubmission: jest.fn(),
  insertAnswer: jest.fn(),
  findAnswersBySubmission: jest.fn(),
  updateAnswer: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({
  studentInCenter: jest.fn(),
  classInCenter: jest.fn(),
}));
jest.mock('../../../students/services/student.service', () => ({
  getStudent: jest.fn(),
}));

const testRepository = require('../../repositories/test.repository');
const { studentInCenter } = require('../../../../shared/tenantDb');
const service = require('../test.service');

describe('test service — retake limit and word limit boundaries (RMC-065)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    studentInCenter.mockResolvedValue(true);
  });

  describe('startTest retake-limit boundary', () => {
    const test = { test_id: 1, center_id: 2, is_private: false, max_retakes: 3, allow_retake: true };

    it('allows starting a new attempt exactly at the retake limit (attempts one below max_retakes)', async () => {
      testRepository.findById.mockResolvedValue(test);
      testRepository.countSubmissionsByStudent.mockResolvedValue(2); // about to become the 3rd attempt
      testRepository.insertSubmission.mockResolvedValue({ submission_id: 99 });

      const result = await service.startTest(1, {}, { studentId: 5 }, 2, undefined);

      expect(result).toEqual({ submission_id: 99 });
      expect(testRepository.insertSubmission).toHaveBeenCalled();
    });

    it('rejects starting one attempt beyond the retake limit', async () => {
      testRepository.findById.mockResolvedValue(test);
      testRepository.countSubmissionsByStudent.mockResolvedValue(3); // already used all 3 allowed attempts

      const result = await service.startTest(1, {}, { studentId: 5 }, 2, undefined);

      expect(result).toEqual({ error: 'max_retakes' });
      expect(testRepository.insertSubmission).not.toHaveBeenCalled();
    });

    it('rejects any second attempt when allow_retake is false', async () => {
      testRepository.findById.mockResolvedValue({ ...test, allow_retake: false, max_retakes: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(1);

      const result = await service.startTest(1, {}, { studentId: 5 }, 2, undefined);

      expect(result).toEqual({ error: 'max_retakes' });
    });

    it('always allows the first attempt regardless of allow_retake', async () => {
      testRepository.findById.mockResolvedValue({ ...test, allow_retake: false, max_retakes: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(0);
      testRepository.insertSubmission.mockResolvedValue({ submission_id: 1 });

      const result = await service.startTest(1, {}, { studentId: 5 }, 2, undefined);

      expect(result).toEqual({ submission_id: 1 });
    });
  });

  describe('submitTest word-limit boundary', () => {
    const existingSubmission = {
      submission_id: 1,
      test_id: 1,
      center_id: 2,
      submission_data: {},
      attempt_number: 1,
      ip_address: null,
    };
    const essayQuestion = { question_id: 1, word_limit: 5, is_required: false, question_type: 'essay', marks: 10 };

    it('rejects an answer one word over the limit, without persisting anything', async () => {
      testRepository.findSubmissionById.mockResolvedValue(existingSubmission);
      testRepository.findQuestionsByTest.mockResolvedValue([essayQuestion]);

      const result = await service.submitTest(1, {
        answers: { 1: { text: 'one two three four five six' } }, // 6 words > limit of 5
      }, 2);

      expect(result).toEqual({ error: 'word_limit', question_id: 1 });
      expect(testRepository.updateSubmission).not.toHaveBeenCalled();
      expect(testRepository.insertAnswer).not.toHaveBeenCalled();
    });

    it('accepts an answer exactly at the word limit', async () => {
      testRepository.findSubmissionById.mockResolvedValue(existingSubmission);
      testRepository.findQuestionsByTest.mockResolvedValue([essayQuestion]);
      testRepository.updateSubmission.mockResolvedValue({ submission_id: 1 });
      testRepository.deleteAnswersBySubmission.mockResolvedValue(undefined);
      testRepository.insertAnswer.mockResolvedValue({});
      testRepository.findAnswersBySubmission.mockResolvedValue([]);
      testRepository.findById.mockResolvedValue({ test_id: 1, passing_marks: 0 });

      const result = await service.submitTest(1, {
        answers: { 1: { text: 'one two three four five' } }, // exactly 5 words
      }, 2);

      expect(result).not.toHaveProperty('error');
      expect(testRepository.updateSubmission).toHaveBeenCalled();
      expect(testRepository.insertAnswer).toHaveBeenCalled();
    });
  });
});
