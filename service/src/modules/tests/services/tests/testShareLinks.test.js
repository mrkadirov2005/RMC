jest.mock('../../repositories/test.repository', () => ({
  findById: jest.fn(),
  setShareToken: jest.fn(),
  findByShareToken: jest.fn(),
  findAssignmentForStudent: jest.fn(),
  countSubmissionsByStudent: jest.fn(),
  insertSubmission: jest.fn(),
  setSubmissionAccessToken: jest.fn(),
  findSubmissionByAccessToken: jest.fn(),
  findQuestionsByTest: jest.fn(),
  findPassagesByTest: jest.fn(),
  updateSubmission: jest.fn(),
  deleteAnswersBySubmission: jest.fn(),
  insertAnswer: jest.fn(),
  findAnswersBySubmission: jest.fn(),
  updateAnswer: jest.fn(),
  findResultByStudent: jest.fn(),
  upsertResult: jest.fn(),
  findSubmissionById: jest.fn(),
}));

jest.mock('../../../../db/pool', () => ({ db: {}, query: jest.fn(), sql: require('drizzle-orm').sql }));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn(), classInCenter: jest.fn() }));
jest.mock('../../../students/services/student.service', () => ({ getStudent: jest.fn(), findByUsername: jest.fn() }));

const testService = require('../test.service');
const testRepository = require('../../repositories/test.repository');
const studentService = require('../../../students/services/student.service');

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
  allow_retake: false,
  max_retakes: 1,
  created_by: 4,
  created_by_type: 'teacher',
  share_token: 'token-abc',
  ...overrides,
});

const student = (overrides = {}) => ({
  student_id: 9,
  center_id: 3,
  class_id: 12,
  first_name: 'Ada',
  last_name: 'Lovelace',
  ...overrides,
});

describe('test share links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testRepository.countSubmissionsByStudent.mockResolvedValue(0);
    testRepository.insertSubmission.mockResolvedValue({ submission_id: 55 });
    testRepository.setSubmissionAccessToken.mockResolvedValue({ submission_id: 55 });
  });

  describe('minting and rotating', () => {
    it('returns nothing for a test outside the calling center', async () => {
      testRepository.findById.mockResolvedValue(null);

      await expect(testService.rotateShareToken(7, 3, { userType: 'superuser' })).resolves.toBeNull();
      expect(testRepository.setShareToken).not.toHaveBeenCalled();
    });

    it('refuses a teacher who did not write the test', async () => {
      testRepository.findById.mockResolvedValue(test({ created_by: 4 }));

      await expect(testService.rotateShareToken(7, 3, { userType: 'teacher', id: 99 }))
        .resolves.toEqual({ error: 'forbidden' });
      expect(testRepository.setShareToken).not.toHaveBeenCalled();
    });

    it('lets the author mint a link', async () => {
      testRepository.findById.mockResolvedValue(test());
      testRepository.setShareToken.mockResolvedValue(test({ share_token: 'fresh-token' }));

      const result = await testService.rotateShareToken(7, 3, { userType: 'teacher', id: 4 });

      expect(result.share_token).toBe('fresh-token');
    });

    it('lets a superuser mint a link for somebody else test', async () => {
      testRepository.findById.mockResolvedValue(test({ created_by: 4 }));
      testRepository.setShareToken.mockResolvedValue(test({ share_token: 'fresh-token' }));

      const result = await testService.rotateShareToken(7, 3, { userType: 'superuser', id: 1 });

      expect(result.share_token).toBe('fresh-token');
    });

    it('writes a new token every time, so the previous link stops working', async () => {
      testRepository.findById.mockResolvedValue(test());
      testRepository.setShareToken.mockImplementation((_id, token) => Promise.resolve(test({ share_token: token })));

      const first = await testService.rotateShareToken(7, 3, { userType: 'superuser' });
      const second = await testService.rotateShareToken(7, 3, { userType: 'superuser' });

      expect(first.share_token).not.toBe(second.share_token);
      expect(String(first.share_token).length).toBeGreaterThan(20);
    });

    it('clears the token on revoke', async () => {
      testRepository.findById.mockResolvedValue(test());
      testRepository.setShareToken.mockResolvedValue(test({ share_token: null }));

      await expect(testService.revokeShareToken(7, 3, { userType: 'superuser' })).resolves.toEqual({ revoked: true });
      expect(testRepository.setShareToken).toHaveBeenCalledWith(7, null, 3);
    });

    it('refuses a revoke from somebody who cannot manage the link', async () => {
      testRepository.findById.mockResolvedValue(test({ created_by: 4 }));

      await expect(testService.revokeShareToken(7, 3, { userType: 'teacher', id: 99 }))
        .resolves.toEqual({ error: 'forbidden' });
    });
  });

  describe('the public view', () => {
    it('returns nothing for a token that matches no live test', async () => {
      testRepository.findByShareToken.mockResolvedValue(null);

      await expect(testService.getSharedTestView('nope')).resolves.toBeNull();
    });

    it('carries the cover details a student needs', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());

      await expect(testService.getSharedTestView('token-abc')).resolves.toEqual({
        test_name: 'Unit 4 Reading',
        test_type: 'multiple_choice',
        description: 'Covers units 3 and 4',
        instructions: 'Answer every question',
        total_marks: 20,
        passing_marks: 12,
        duration_minutes: 30,
        is_timed: true,
      });
    });

    it('never exposes the test id, the centre or the roster', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());

      const view = await testService.getSharedTestView('token-abc');

      expect(view).not.toHaveProperty('test_id');
      expect(view).not.toHaveProperty('center_id');
      expect(view).not.toHaveProperty('created_by');
    });

    it('trims the token before looking it up', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());

      await testService.getSharedTestView('  token-abc  ');

      expect(testRepository.findByShareToken).toHaveBeenCalledWith('token-abc');
    });
  });

  describe('starting from a link', () => {
    it('refuses a token that matches no live test', async () => {
      testRepository.findByShareToken.mockResolvedValue(null);

      await expect(testService.startSharedTest('nope', 'ada')).resolves.toEqual({ error: 'not_found' });
    });

    it('gives the same answer for an unknown username as for an unassigned student', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      studentService.findByUsername.mockResolvedValue(null);

      await expect(testService.startSharedTest('token-abc', 'ghost')).resolves.toEqual({ error: 'not_assigned' });

      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue(null);

      await expect(testService.startSharedTest('token-abc', 'ada')).resolves.toEqual({ error: 'not_assigned' });
    });

    it('refuses a student from another center', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ center_id: 3 }));
      studentService.findByUsername.mockResolvedValue(student({ center_id: 8 }));

      await expect(testService.startSharedTest('token-abc', 'ada')).resolves.toEqual({ error: 'not_assigned' });
      expect(testRepository.findAssignmentForStudent).not.toHaveBeenCalled();
    });

    it('accepts an assignment made to the student class', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      studentService.findByUsername.mockResolvedValue(student({ class_id: 12 }));
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });

      await testService.startSharedTest('token-abc', 'ada');

      expect(testRepository.findAssignmentForStudent).toHaveBeenCalledWith(7, 9, 12);
    });

    it('tolerates a student who is not in any class', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      studentService.findByUsername.mockResolvedValue(student({ class_id: null }));
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });

      await testService.startSharedTest('token-abc', 'ada');

      expect(testRepository.findAssignmentForStudent).toHaveBeenCalledWith(7, 9, null);
    });

    it('creates an in-progress submission and records the caller address', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });

      const result = await testService.startSharedTest('token-abc', 'ada', { ipAddress: '10.0.0.4' });

      const params = testRepository.insertSubmission.mock.calls[0][0];
      expect(params[10]).toBe('in_progress');
      expect(params[16]).toBe(1);
      expect(params[17]).toBe('10.0.0.4');
      expect(result.submission).toEqual({ submission_id: 55 });
      expect(result.student).toEqual({ student_id: 9, first_name: 'Ada', last_name: 'Lovelace' });
    });

    it('refuses a second attempt when the test does not allow retakes', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ allow_retake: false }));
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(1);

      await expect(testService.startSharedTest('token-abc', 'ada'))
        .resolves.toEqual({ error: 'already_submitted', attempts: 1 });
      expect(testRepository.insertSubmission).not.toHaveBeenCalled();
    });

    it('refuses an attempt past the retake limit', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ allow_retake: true, max_retakes: 2 }));
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(2);

      await expect(testService.startSharedTest('token-abc', 'ada'))
        .resolves.toEqual({ error: 'already_submitted', attempts: 2 });
    });

    it('asks before creating a repeat attempt, so backing out leaves nothing behind', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ allow_retake: true, max_retakes: 3 }));
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(1);

      await expect(testService.startSharedTest('token-abc', 'ada'))
        .resolves.toEqual({ needs_confirmation: true, attempts: 1 });
      expect(testRepository.insertSubmission).not.toHaveBeenCalled();
    });

    it('creates the repeat attempt once the student confirms', async () => {
      testRepository.findByShareToken.mockResolvedValue(test({ allow_retake: true, max_retakes: 3 }));
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });
      testRepository.countSubmissionsByStudent.mockResolvedValue(1);

      await testService.startSharedTest('token-abc', 'ada', { confirm: true });

      expect(testRepository.insertSubmission.mock.calls[0][0][16]).toBe(2);
    });

    it('trims the username before looking it up', async () => {
      testRepository.findByShareToken.mockResolvedValue(test());
      studentService.findByUsername.mockResolvedValue(student());
      testRepository.findAssignmentForStudent.mockResolvedValue({ assignment_id: 1 });

      await testService.startSharedTest('token-abc', '  ada  ');

      expect(studentService.findByUsername).toHaveBeenCalledWith('ada');
    });
  });
});
