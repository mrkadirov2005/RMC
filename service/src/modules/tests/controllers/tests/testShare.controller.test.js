jest.mock('../../services/test.service', () => ({
  getStatistics: jest.fn(),
  rotateShareToken: jest.fn(),
  revokeShareToken: jest.fn(),
  getSharedTestView: jest.fn(),
  startSharedTest: jest.fn(),
}));

jest.mock('../../../../utils/audit', () => ({ logAudit: jest.fn() }));
jest.mock('../testScope', () => ({ requireTestCenterScope: jest.fn() }));
jest.mock('../../../../shared/tenantDb', () => ({ studentBelongsToTeacher: jest.fn(), testInCenter: jest.fn() }));

const controller = require('../test.controller');
const testService = require('../../services/test.service');
const { logAudit } = require('../../../../utils/audit');
const { requireTestCenterScope } = require('../testScope');
const { studentBelongsToTeacher, testInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('tests controller statistics and share links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    requireTestCenterScope.mockReturnValue(3);
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getStatistics', () => {
    it('stops when the center scope guard has already answered', async () => {
      requireTestCenterScope.mockReturnValue(undefined);
      const res = createResponse();

      await controller.getStatistics({ user: {} }, res);

      expect(testService.getStatistics).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('passes the caller through so the service can narrow what they see', async () => {
      const res = createResponse();
      const user = { userType: 'teacher', id: 4 };
      testService.getStatistics.mockResolvedValue({ totals: {} });

      await controller.getStatistics({ user }, res);

      expect(testService.getStatistics).toHaveBeenCalledWith(3, user);
      expect(res.json).toHaveBeenCalledWith({ totals: {} });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      testService.getStatistics.mockRejectedValue(new Error('offline'));

      await controller.getStatistics({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch test statistics', details: 'offline' });
    });
  });

  describe('createShareLink', () => {
    it('returns 404 for a test outside the calling center', async () => {
      const res = createResponse();
      testService.rotateShareToken.mockResolvedValue(null);

      await controller.createShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('refuses a teacher who did not write the test', async () => {
      const res = createResponse();
      testService.rotateShareToken.mockResolvedValue({ error: 'forbidden' });

      await controller.createShareLink({ params: { id: '7' }, user: { userType: 'teacher', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Only the test author or a superuser can share this test.' });
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('returns the token and records who shared it', async () => {
      const res = createResponse();
      testService.rotateShareToken.mockResolvedValue({ share_token: 'fresh-token' });

      await controller.createShareLink({ params: { id: '7' }, user: { userType: 'teacher', id: 4 }, ip: '10.0.0.4' }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SHARE',
        entity_type: 'test',
        entity_id: 7,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Share link ready', share_token: 'fresh-token' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      testService.rotateShareToken.mockRejectedValue(new Error('write failed'));

      await controller.createShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create share link', details: 'write failed' });
    });
  });

  describe('revokeShareLink', () => {
    it('returns 404 for a test outside the calling center', async () => {
      const res = createResponse();
      testService.revokeShareToken.mockResolvedValue(null);

      await controller.revokeShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('refuses a caller who cannot manage the link', async () => {
      const res = createResponse();
      testService.revokeShareToken.mockResolvedValue({ error: 'forbidden' });

      await controller.revokeShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('confirms the link is dead', async () => {
      const res = createResponse();
      testService.revokeShareToken.mockResolvedValue({ revoked: true });

      await controller.revokeShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Share link revoked' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      testService.revokeShareToken.mockRejectedValue(new Error('write failed'));

      await controller.revokeShareLink({ params: { id: '7' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to revoke share link', details: 'write failed' });
    });
  });

  describe('getSharedTest', () => {
    it('says only that the link is dead, never why', async () => {
      const res = createResponse();
      testService.getSharedTestView.mockResolvedValue(null);

      await controller.getSharedTest({ params: { shareToken: 'nope' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'This link is no longer active.' });
    });

    it('returns the cover details', async () => {
      const res = createResponse();
      testService.getSharedTestView.mockResolvedValue({ test_name: 'Unit 4 Reading' });

      await controller.getSharedTest({ params: { shareToken: 'token-abc' } }, res);

      expect(res.json).toHaveBeenCalledWith({ test_name: 'Unit 4 Reading' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      testService.getSharedTestView.mockRejectedValue(new Error('offline'));

      await controller.getSharedTest({ params: { shareToken: 'token-abc' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('startSharedTest', () => {
    it('passes the caller address and the confirmation flag through', async () => {
      const res = createResponse();
      testService.startSharedTest.mockResolvedValue({ submission: { submission_id: 55 } });

      await controller.startSharedTest({
        params: { shareToken: 'token-abc' },
        body: { username: 'ada', confirm: true },
        ip: '10.0.0.4',
      }, res);

      expect(testService.startSharedTest).toHaveBeenCalledWith('token-abc', 'ada', {
        ipAddress: '10.0.0.4',
        confirm: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports a dead link as a 404', async () => {
      const res = createResponse();
      testService.startSharedTest.mockResolvedValue({ error: 'not_found' });

      await controller.startSharedTest({ params: { shareToken: 'nope' }, body: { username: 'ada' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('gives one message for an unknown username and an unassigned student', async () => {
      const res = createResponse();
      testService.startSharedTest.mockResolvedValue({ error: 'not_assigned' });

      await controller.startSharedTest({ params: { shareToken: 'token-abc' }, body: { username: 'ghost' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'This test has not been assigned to that username.' });
    });

    it('reports an exhausted attempt allowance as a conflict', async () => {
      const res = createResponse();
      testService.startSharedTest.mockResolvedValue({ error: 'already_submitted', attempts: 1 });

      await controller.startSharedTest({ params: { shareToken: 'token-abc' }, body: { username: 'ada' } }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'You have already completed this test.', attempts: 1 });
    });

    it('passes the repeat-attempt nudge back without creating anything', async () => {
      const res = createResponse();
      testService.startSharedTest.mockResolvedValue({ needs_confirmation: true, attempts: 1 });

      await controller.startSharedTest({ params: { shareToken: 'token-abc' }, body: { username: 'ada' } }, res);

      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ needs_confirmation: true, attempts: 1 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      testService.startSharedTest.mockRejectedValue(new Error('offline'));

      await controller.startSharedTest({ params: { shareToken: 'token-abc' }, body: { username: 'ada' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

describe('who the server records as the actor', () => {
  beforeEach(() => {
    testService.assignTest = jest.fn().mockResolvedValue([{ assignment_id: 1 }]);
    testService.gradeSubmission = jest.fn().mockResolvedValue({ submission_id: 55 });
    testService.getSubmissionDetails = jest.fn().mockResolvedValue({ student_id: 9 });
    testInCenter.mockResolvedValue(true);
    studentBelongsToTeacher.mockResolvedValue(true);
  });

  it('takes the assigning user from the session, never the request body', async () => {
    const res = createResponse();

    await controller.assignTest({
      params: { testId: '7' },
      body: { assignments: [{ assigned_to_type: 'class', assigned_to_id: 3 }], assigned_by: 999 },
      user: { userType: 'teacher', id: 4 },
    }, res);

    expect(testService.assignTest).toHaveBeenCalledWith(7, expect.anything(), { userId: 4 }, 3);
  });

  it('stamps the grader from the session, overriding anything the client sent', async () => {
    const res = createResponse();

    await controller.gradeSubmission({
      params: { submissionId: '55' },
      body: { answer_grades: [], graded_by: 999, graded_by_type: 'superuser' },
      user: { userType: 'teacher', id: 4 },
    }, res);

    const body = testService.gradeSubmission.mock.calls[0][1];
    expect(body.graded_by).toBe(4);
    expect(body.graded_by_type).toBe('teacher');
  });

  it('records no grader when the session carries none', async () => {
    const res = createResponse();

    await controller.gradeSubmission({
      params: { submissionId: '55' },
      body: { answer_grades: [] },
      user: {},
    }, res);

    const body = testService.gradeSubmission.mock.calls[0][1];
    expect(body.graded_by).toBeNull();
    expect(body.graded_by_type).toBeNull();
  });
});

describe('who is recorded as the author of a new test', () => {
  beforeEach(() => {
    testService.createTest = jest.fn().mockResolvedValue({ test: { test_id: 7, test_name: 'Unit 4', test_type: 'essay' } });
  });

  it('uses the signed-in user, ignoring any author the client sends', async () => {
    const res = createResponse();

    await controller.createTest({
      body: { test_name: 'Unit 4', created_by: 999, created_by_type: 'superuser' },
      user: { userType: 'teacher', id: 4 },
    }, res);

    const body = testService.createTest.mock.calls[0][0];
    expect(body.created_by).toBe(4);
    expect(body.created_by_type).toBe('teacher');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
