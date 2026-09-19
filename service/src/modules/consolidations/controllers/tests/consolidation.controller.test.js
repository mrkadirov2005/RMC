jest.mock('../../services/consolidation.service', () => ({
  createSet: jest.fn(),
  getSetForTeacher: jest.fn(),
  getSetForStudentView: jest.fn(),
  getResultsDashboard: jest.fn(),
  getConsolidationsOverview: jest.fn(),
  getTrial: jest.fn(),
  getTrialDetail: jest.fn(),
  deleteSet: jest.fn(),
  regenerateLink: jest.fn(),
  startTrial: jest.fn(),
  saveAnswer: jest.fn(),
  submitTrial: jest.fn(),
  logViolation: jest.fn(),
  getPublicSetView: jest.fn(),
  startPublicTrial: jest.fn(),
  resolveTrialForToken: jest.fn(),
}));
jest.mock('../../../../shared/controller', () => ({
  getCenterScope: jest.fn(),
  sendScopeError: jest.fn(),
}));
jest.mock('../../../../utils/audit', () => ({ logAudit: jest.fn() }));

const consolidationService = require('../../services/consolidation.service');
const { getCenterScope, sendScopeError } = require('../../../../shared/controller');
const controller = require('../consolidation.controller');

const response = () => {
  const res = { json: jest.fn(), end: jest.fn() };
  res.status = jest.fn(() => res);
  return res;
};

describe('consolidation controller — access-control boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Default: a concrete, resolved center scope for a teacher caller — individual
    // tests override centerId/isGlobal/teacherId as needed.
    getCenterScope.mockReturnValue({ ok: true, centerId: 2, isGlobal: false, teacherId: 7 });
    sendScopeError.mockReturnValue(false);
  });

  describe('createSet — teacher cannot create a set for a session/class they do not teach', () => {
    it('translates a service-level forbidden into a 403', async () => {
      consolidationService.createSet.mockResolvedValue({ error: 'forbidden' });
      const req = { user: { userType: 'teacher', id: 7 }, body: { session_id: 10, words: [] } };
      const res = response();

      await controller.createSet(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('do not teach') }));
    });

    it('403s before ever calling the service when center scope cannot be resolved', async () => {
      getCenterScope.mockReturnValue({ ok: false, status: 403, body: { error: 'Center scope required.' } });
      sendScopeError.mockImplementation((res, scope) => {
        res.status(scope.status).json(scope.body);
        return true;
      });
      const res = response();

      await controller.createSet({ user: { userType: 'teacher', id: 7 }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(consolidationService.createSet).not.toHaveBeenCalled();
    });
  });

  describe('getTrialDetail — a student cannot fetch another student\'s trial', () => {
    it('returns 403 when the service reports the requester does not own the trial', async () => {
      consolidationService.getTrialDetail.mockResolvedValue({ error: 'forbidden' });
      const req = { user: { userType: 'student', id: 999 }, params: { trialId: '5' } };
      const res = response();

      await controller.getTrialDetail(req, res);

      expect(consolidationService.getTrialDetail).toHaveBeenCalledWith(5, expect.objectContaining({ userType: 'student', id: 999 }));
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 404 when the trial does not exist', async () => {
      consolidationService.getTrialDetail.mockResolvedValue(null);
      const res = response();

      await controller.getTrialDetail({ user: { userType: 'student', id: 1 }, params: { trialId: '999' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns the trial detail on success', async () => {
      const detail = { trial: { trial_id: 5 }, words: [] };
      consolidationService.getTrialDetail.mockResolvedValue(detail);
      const res = response();

      await controller.getTrialDetail({ user: { userType: 'student', id: 1 }, params: { trialId: '5' } }, res);

      expect(res.json).toHaveBeenCalledWith(detail);
    });
  });

  describe('getSetForStudentView — a student cannot reach the teacher-view endpoint', () => {
    it('the student-view route is a distinct handler that never returns translations even on the happy path', async () => {
      const withoutTranslations = { consolidation_set_id: 1, title: 't', violation_limit: 3, words: [{ consolidation_word_id: 1, main_word: 'salom' }] };
      consolidationService.getSetForStudentView.mockResolvedValue(withoutTranslations);
      const res = response();

      await controller.getSetForStudentView({ user: { userType: 'student', id: 1 }, params: { sessionId: '10' } }, res);

      expect(res.json).toHaveBeenCalledWith(withoutTranslations);
      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('translations');
    });

    it('returns 403 when the student is not enrolled in the class', async () => {
      consolidationService.getSetForStudentView.mockResolvedValue({ error: 'forbidden' });
      const res = response();

      await controller.getSetForStudentView({ user: { userType: 'student', id: 1 }, params: { sessionId: '10' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteSet / regenerateLink — a second teacher in the same center cannot manage a set they do not own', () => {
    it('deleteSet: 403s on a forbidden result instead of proceeding to delete', async () => {
      consolidationService.deleteSet.mockResolvedValue({ error: 'forbidden' });
      const res = response();

      await controller.deleteSet({ user: { userType: 'teacher', id: 999 }, params: { setId: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('regenerateLink: 403s on a forbidden result', async () => {
      consolidationService.regenerateLink.mockResolvedValue({ error: 'forbidden' });
      const res = response();

      await controller.regenerateLink({ user: { userType: 'teacher', id: 999 }, params: { setId: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getOverview — center-scoped superuser dashboard', () => {
    it('403s before calling the service when center scope cannot be resolved (e.g. an owner with no center_id)', async () => {
      getCenterScope.mockReturnValue({ ok: false, status: 400, body: { error: 'center_id is required for superuser actions.' } });
      sendScopeError.mockImplementation((res, scope) => {
        res.status(scope.status).json(scope.body);
        return true;
      });
      const res = response();

      await controller.getOverview({ user: { userType: 'superuser' }, query: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(consolidationService.getConsolidationsOverview).not.toHaveBeenCalled();
    });

    it('forwards the resolved centerId to the service and returns its result', async () => {
      const overview = { totals: { total_sets: 0 }, by_teacher: [], sets: [] };
      consolidationService.getConsolidationsOverview.mockResolvedValue(overview);
      const res = response();

      await controller.getOverview({ user: { userType: 'superuser' }, query: {} }, res);

      expect(consolidationService.getConsolidationsOverview).toHaveBeenCalledWith(2, {
        userType: 'superuser',
        teacherId: undefined,
        centerId: 2,
      });
      expect(res.json).toHaveBeenCalledWith(overview);
    });

    it('passes the authenticated teacher identity so the service can scope the overview', async () => {
      const overview = { totals: { total_sets: 1 }, by_teacher: [], sets: [] };
      consolidationService.getConsolidationsOverview.mockResolvedValue(overview);
      const res = response();

      await controller.getOverview({ user: { userType: 'teacher', id: 7 }, query: {} }, res);

      expect(consolidationService.getConsolidationsOverview).toHaveBeenCalledWith(2, {
        userType: 'teacher',
        teacherId: 7,
        centerId: 2,
      });
      expect(res.json).toHaveBeenCalledWith(overview);
    });
  });

  describe('public share-link handlers — generic 404s, never a distinguishable reason', () => {
    it('getPublicSetView 404s the same way for a bad token as any other failure', async () => {
      consolidationService.getPublicSetView.mockResolvedValue(null);
      const res = response();

      await controller.getPublicSetView({ params: { shareToken: 'nonexistent' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('startPublicTrial rejects an unknown/mismatched username with 400, not a stack trace', async () => {
      consolidationService.startPublicTrial.mockResolvedValue({ error: 'invalid_student' });
      const res = response();

      await controller.startPublicTrial({ params: { shareToken: 'tok' }, body: { username: 'nobody' }, get: () => null }, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('savePublicAnswer 404s when the trial does not resolve for this token (wrong token, wrong trial, or bad trial_token)', async () => {
      consolidationService.resolveTrialForToken.mockResolvedValue(null);
      const res = response();

      await controller.savePublicAnswer({ params: { shareToken: 'tok', trialId: '9' }, body: { consolidation_word_id: 1, answer: 'x' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(consolidationService.saveAnswer).not.toHaveBeenCalled();
    });
  });
});
