jest.mock('../../services/center.service', () => ({
  listCenters: jest.fn(),
  getCenter: jest.fn(),
  getCenterSummaries: jest.fn(),
  createCenter: jest.fn(),
  updateCenter: jest.fn(),
  deleteCenter: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  isCenterAdmin: jest.fn(),
}));

const centerController = require('../center.controller');
const centerService = require('../../services/center.service');
const { isCenterAdmin } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('centers controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    isCenterAdmin.mockReturnValue(false);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getAllCenters', () => {
    it('lets the service narrow the list by the calling user', async () => {
      const res = createResponse();
      const user = { userType: 'superuser', id: 1 };
      centerService.listCenters.mockResolvedValue([{ center_id: 1 }]);

      await centerController.getAllCenters({ user }, res);

      expect(centerService.listCenters).toHaveBeenCalledWith(user);
      expect(res.json).toHaveBeenCalledWith([{ center_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.listCenters.mockRejectedValue(new Error('offline'));

      await centerController.getAllCenters({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch centers', details: 'offline' });
    });
  });

  describe('getCenterById', () => {
    it('stops a center admin reading a different center', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);

      await centerController.getCenterById({ params: { id: '9' }, user: { center_id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
      expect(centerService.getCenter).not.toHaveBeenCalled();
    });

    it('lets a center admin read their own center', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);
      centerService.getCenter.mockResolvedValue({ center_id: 3 });

      await centerController.getCenterById({ params: { id: '3' }, user: { center_id: '3' } }, res);

      expect(res.json).toHaveBeenCalledWith({ center_id: 3 });
    });

    it('returns 404 when the center does not exist', async () => {
      const res = createResponse();
      centerService.getCenter.mockResolvedValue(null);

      await centerController.getCenterById({ params: { id: '9' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.getCenter.mockRejectedValue(new Error('bad id'));

      await centerController.getCenterById({ params: { id: '9' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch center', details: 'bad id' });
    });
  });

  describe('getCenterSummaries', () => {
    it('lets the service narrow the summaries by the calling user', async () => {
      const res = createResponse();
      const user = { userType: 'superuser' };
      centerService.getCenterSummaries.mockResolvedValue([{ center_id: 1, students: 10 }]);

      await centerController.getCenterSummaries({ user }, res);

      expect(centerService.getCenterSummaries).toHaveBeenCalledWith(user);
      expect(res.json).toHaveBeenCalledWith([{ center_id: 1, students: 10 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.getCenterSummaries.mockRejectedValue(new Error('offline'));

      await centerController.getCenterSummaries({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch center summaries', details: 'offline' });
    });
  });

  describe('createCenter', () => {
    it('refuses a center admin outright', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);

      await centerController.createCenter({ body: {}, user: { center_id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin users cannot create centers.' });
      expect(centerService.createCenter).not.toHaveBeenCalled();
    });

    it('creates the center for a superuser', async () => {
      const res = createResponse();
      centerService.createCenter.mockResolvedValue({ center_id: 4 });

      await centerController.createCenter({ body: { center_name: 'North' }, user: { userType: 'superuser' } }, res);

      expect(centerService.createCenter).toHaveBeenCalledWith({ center_name: 'North' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ center_id: 4 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.createCenter.mockRejectedValue(new Error('duplicate'));

      await centerController.createCenter({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create center', details: 'duplicate' });
    });
  });

  describe('updateCenter', () => {
    it('stops a center admin editing a different center', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);
      centerService.getCenter.mockResolvedValue({ center_id: 9 });

      await centerController.updateCenter({ params: { id: '9' }, body: {}, user: { center_id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
      expect(centerService.updateCenter).not.toHaveBeenCalled();
    });

    it('returns 404 to a center admin when the center does not exist', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);
      centerService.getCenter.mockResolvedValue(null);

      await centerController.updateCenter({ params: { id: '9' }, body: {}, user: { center_id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center not found' });
    });

    it('lets a center admin edit their own center', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);
      centerService.getCenter.mockResolvedValue({ center_id: 3 });
      centerService.updateCenter.mockResolvedValue({ center_id: 3, center_name: 'South' });

      await centerController.updateCenter({ params: { id: '3' }, body: { center_name: 'South' }, user: { center_id: '3' } }, res);

      expect(res.json).toHaveBeenCalledWith({ center_id: 3, center_name: 'South' });
    });

    it('returns 404 when the update matched nothing', async () => {
      const res = createResponse();
      centerService.updateCenter.mockResolvedValue(null);

      await centerController.updateCenter({ params: { id: '9' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.updateCenter.mockRejectedValue(new Error('conflict'));

      await centerController.updateCenter({ params: { id: '9' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update center', details: 'conflict' });
    });
  });

  describe('deleteCenter', () => {
    it('refuses a center admin outright', async () => {
      const res = createResponse();
      isCenterAdmin.mockReturnValue(true);

      await centerController.deleteCenter({ params: { id: '3' }, user: { center_id: 3 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin users cannot delete centers.' });
      expect(centerService.deleteCenter).not.toHaveBeenCalled();
    });

    it('confirms the deletion for a superuser', async () => {
      const res = createResponse();
      const user = { userType: 'superuser' };
      centerService.deleteCenter.mockResolvedValue({ center_id: 3 });

      await centerController.deleteCenter({ params: { id: '3' }, user }, res);

      expect(centerService.deleteCenter).toHaveBeenCalledWith(3, user);
      expect(res.json).toHaveBeenCalledWith({ message: 'Center deleted successfully', center: { center_id: 3 } });
    });

    it('returns 404 when the center does not exist', async () => {
      const res = createResponse();
      centerService.deleteCenter.mockResolvedValue(null);

      await centerController.deleteCenter({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      centerService.deleteCenter.mockRejectedValue(new Error('locked'));

      await centerController.deleteCenter({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete center', details: 'locked' });
    });
  });
});
