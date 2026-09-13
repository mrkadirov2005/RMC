jest.mock('../../services/settings.service', () => ({
  getLessonScoring: jest.fn(),
  saveLessonScoring: jest.fn(),
  getOwnerPalette: jest.fn(),
  saveOwnerPalette: jest.fn(),
  getVisualOverrides: jest.fn(),
  saveVisualOverrides: jest.fn(),
  getSidebarOrder: jest.fn(),
  saveSidebarOrder: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const settingsController = require('../settings.controller');
const settingsService = require('../../services/settings.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('settings controller', () => {
  beforeEach(() => {
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
  });

  describe('center scoping', () => {
    const handlers = [
      ['getLessonScoring', {}],
      ['saveLessonScoring', { body: {} }],
      ['getOwnerPalette', {}],
      ['saveOwnerPalette', { body: {} }],
      ['getVisualOverrides', {}],
      ['saveVisualOverrides', { body: {} }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await settingsController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('saveLessonScoring makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await settingsController.saveLessonScoring({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for settings.' });
    });

    it.each([
      ['getOwnerPalette', {}],
      ['saveOwnerPalette', { body: {} }],
    ])('%s refuses a global caller with no concrete center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await settingsController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for palette settings.' });
    });

    it.each([
      ['getVisualOverrides', {}],
      ['saveVisualOverrides', { body: {} }],
    ])('%s refuses a global caller outright', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await settingsController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });
  });

  describe('lesson scoring', () => {
    it('reads the settings for the scoped center', async () => {
      const res = createResponse();
      settingsService.getLessonScoring.mockResolvedValue({ max_score: 10 });

      await settingsController.getLessonScoring({ user: {} }, res);

      expect(settingsService.getLessonScoring).toHaveBeenCalledWith(4);
      expect(res.json).toHaveBeenCalledWith({ max_score: 10 });
    });

    it('saves the settings against the scoped center', async () => {
      const res = createResponse();
      settingsService.saveLessonScoring.mockResolvedValue({ max_score: 20 });

      await settingsController.saveLessonScoring({ body: { max_score: 20 }, user: {} }, res);

      expect(settingsService.saveLessonScoring).toHaveBeenCalledWith({ max_score: 20 }, 4);
      expect(res.json).toHaveBeenCalledWith({ max_score: 20 });
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      settingsService.getLessonScoring.mockRejectedValue(new Error('offline'));

      await settingsController.getLessonScoring({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch lesson scoring settings', details: 'offline' });
    });

    it('reports a save failure as a 500', async () => {
      const res = createResponse();
      settingsService.saveLessonScoring.mockRejectedValue(new Error('write failed'));

      await settingsController.saveLessonScoring({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save lesson scoring settings', details: 'write failed' });
    });
  });

  describe('owner palette', () => {
    it('wraps the stored palette in a palette key', async () => {
      const res = createResponse();
      settingsService.getOwnerPalette.mockResolvedValue({ primary: '#123456' });

      await settingsController.getOwnerPalette({ user: {} }, res);

      expect(settingsService.getOwnerPalette).toHaveBeenCalledWith(4);
      expect(res.json).toHaveBeenCalledWith({ palette: { primary: '#123456' } });
    });

    it('saves only the palette field from the body', async () => {
      const res = createResponse();
      settingsService.saveOwnerPalette.mockResolvedValue({ primary: '#abcdef' });

      await settingsController.saveOwnerPalette({ body: { palette: { primary: '#abcdef' }, other: 1 }, user: {} }, res);

      expect(settingsService.saveOwnerPalette).toHaveBeenCalledWith({ primary: '#abcdef' }, 4);
      expect(res.json).toHaveBeenCalledWith({ palette: { primary: '#abcdef' } });
    });

    it('tolerates a request with no body', async () => {
      const res = createResponse();
      settingsService.saveOwnerPalette.mockResolvedValue(null);

      await settingsController.saveOwnerPalette({ user: {} }, res);

      expect(settingsService.saveOwnerPalette).toHaveBeenCalledWith(undefined, 4);
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      settingsService.getOwnerPalette.mockRejectedValue(new Error('offline'));

      await settingsController.getOwnerPalette({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch owner palette', details: 'offline' });
    });

    it('reports a save failure as a 500', async () => {
      const res = createResponse();
      settingsService.saveOwnerPalette.mockRejectedValue(new Error('write failed'));

      await settingsController.saveOwnerPalette({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save owner palette', details: 'write failed' });
    });
  });

  describe('visual overrides', () => {
    it('reads the overrides for the scoped center', async () => {
      const res = createResponse();
      settingsService.getVisualOverrides.mockResolvedValue({ dense: true });

      await settingsController.getVisualOverrides({ user: {} }, res);

      expect(settingsService.getVisualOverrides).toHaveBeenCalledWith(4);
      expect(res.json).toHaveBeenCalledWith({ dense: true });
    });

    it('saves only the overrides field from the body', async () => {
      const res = createResponse();
      settingsService.saveVisualOverrides.mockResolvedValue({ dense: false });

      await settingsController.saveVisualOverrides({ body: { overrides: { dense: false } }, user: {} }, res);

      expect(settingsService.saveVisualOverrides).toHaveBeenCalledWith({ dense: false }, 4);
      expect(res.json).toHaveBeenCalledWith({ dense: false });
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      settingsService.getVisualOverrides.mockRejectedValue(new Error('offline'));

      await settingsController.getVisualOverrides({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch visual overrides', details: 'offline' });
    });

    it('reports a save failure as a 500', async () => {
      const res = createResponse();
      settingsService.saveVisualOverrides.mockRejectedValue(new Error('write failed'));

      await settingsController.saveVisualOverrides({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save visual overrides', details: 'write failed' });
    });
  });

  describe('sidebar order', () => {
    it('reads the order for the signed-in user, not the center', async () => {
      const res = createResponse();
      settingsService.getSidebarOrder.mockResolvedValue(['students', 'classes']);

      await settingsController.getSidebarOrder({ user: { userType: 'teacher', id: '7' } }, res);

      expect(settingsService.getSidebarOrder).toHaveBeenCalledWith('teacher', 7);
      expect(res.json).toHaveBeenCalledWith(['students', 'classes']);
    });

    it('saves the order for the signed-in user', async () => {
      const res = createResponse();
      settingsService.saveSidebarOrder.mockResolvedValue(['classes']);

      await settingsController.saveSidebarOrder({ user: { userType: 'teacher', id: '7' }, body: { order: ['classes'] } }, res);

      expect(settingsService.saveSidebarOrder).toHaveBeenCalledWith('teacher', 7, ['classes']);
      expect(res.json).toHaveBeenCalledWith(['classes']);
    });

    it('reports a read failure as a 500', async () => {
      const res = createResponse();
      settingsService.getSidebarOrder.mockRejectedValue(new Error('offline'));

      await settingsController.getSidebarOrder({ user: { userType: 'teacher', id: 7 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch sidebar order', details: 'offline' });
    });

    it('reports a save failure as a 500', async () => {
      const res = createResponse();
      settingsService.saveSidebarOrder.mockRejectedValue(new Error('write failed'));

      await settingsController.saveSidebarOrder({ user: { userType: 'teacher', id: 7 }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save sidebar order', details: 'write failed' });
    });
  });
});
