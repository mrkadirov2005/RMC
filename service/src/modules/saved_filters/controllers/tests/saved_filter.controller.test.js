jest.mock('../../services/saved_filter.service', () => ({
  listMine: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const savedFilterController = require('../saved_filter.controller');
const savedFilterService = require('../../services/saved_filter.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const signedIn = { userType: 'admin', id: 3 };

describe('saved filters controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 1, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('guards shared by every handler', () => {
    const handlers = [
      ['getMyFilters', { query: {} }],
      ['createFilter', { body: {} }],
      ['updateFilter', { params: { id: '1' }, body: {} }],
      ['deleteFilter', { params: { id: '1' }, body: {} }],
    ];

    it.each(handlers)('%s refuses an unauthenticated caller', async (handler, req) => {
      const res = createResponse();

      await savedFilterController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' });
    });

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await savedFilterController[handler]({ ...req, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await savedFilterController[handler]({ ...req, user: { userType: 'superuser', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getMyFilters', () => {
    it('reads only the caller own filters and passes the entity filter through', async () => {
      const res = createResponse();
      savedFilterService.listMine.mockResolvedValue([{ filter_id: 1 }]);

      await savedFilterController.getMyFilters({ query: { entity: 'students' }, user: signedIn }, res);

      expect(savedFilterService.listMine).toHaveBeenCalledWith('admin', 3, 1, 'students');
      expect(res.json).toHaveBeenCalledWith([{ filter_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      savedFilterService.listMine.mockRejectedValue(new Error('offline'));

      await savedFilterController.getMyFilters({ query: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch saved filters', details: 'offline' });
    });
  });

  describe('createFilter', () => {
    it('saves the filter against the caller and the scoped center', async () => {
      const res = createResponse();
      savedFilterService.create.mockResolvedValue({ row: { filter_id: 4 } });

      await savedFilterController.createFilter({ body: { name: 'Unpaid' }, user: signedIn }, res);

      expect(savedFilterService.create).toHaveBeenCalledWith('admin', 3, 1, { name: 'Unpaid' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Filter saved', filter: { filter_id: 4 } });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      savedFilterService.create.mockRejectedValue(new Error('insert failed'));

      await savedFilterController.createFilter({ body: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to save filter', details: 'insert failed' });
    });
  });

  describe('updateFilter', () => {
    it('updates only a filter the caller owns', async () => {
      const res = createResponse();
      savedFilterService.update.mockResolvedValue({ filter_id: 4 });

      await savedFilterController.updateFilter({ params: { id: '4' }, body: { name: 'Paid' }, user: signedIn }, res);

      expect(savedFilterService.update).toHaveBeenCalledWith(4, 'admin', 3, 1, { name: 'Paid' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Filter updated', filter: { filter_id: 4 } });
    });

    it('returns 404 when the filter is not the caller own', async () => {
      const res = createResponse();
      savedFilterService.update.mockResolvedValue(null);

      await savedFilterController.updateFilter({ params: { id: '4' }, body: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Filter not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      savedFilterService.update.mockRejectedValue(new Error('conflict'));

      await savedFilterController.updateFilter({ params: { id: '4' }, body: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update filter', details: 'conflict' });
    });
  });

  describe('deleteFilter', () => {
    it('deletes only a filter the caller owns', async () => {
      const res = createResponse();
      savedFilterService.remove.mockResolvedValue({ filter_id: 4 });

      await savedFilterController.deleteFilter({ params: { id: '4' }, body: {}, user: signedIn }, res);

      expect(savedFilterService.remove).toHaveBeenCalledWith(4, 'admin', 3, 1);
      expect(res.json).toHaveBeenCalledWith({ message: 'Filter deleted', filter: { filter_id: 4 } });
    });

    it('returns 404 when the filter is not the caller own', async () => {
      const res = createResponse();
      savedFilterService.remove.mockResolvedValue(null);

      await savedFilterController.deleteFilter({ params: { id: '4' }, body: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      savedFilterService.remove.mockRejectedValue(new Error('locked'));

      await savedFilterController.deleteFilter({ params: { id: '4' }, body: {}, user: signedIn }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete filter', details: 'locked' });
    });
  });
});
