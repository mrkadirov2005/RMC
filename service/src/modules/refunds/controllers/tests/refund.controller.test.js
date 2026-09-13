jest.mock('../../services/refund.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../../../utils/audit', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const refundController = require('../refund.controller');
const refundService = require('../../services/refund.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('refunds controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 8, isGlobal: false });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllRefunds', { query: {} }],
      ['getRefundById', { params: { id: '1' } }],
      ['createRefund', { body: {} }],
      ['updateRefund', { params: { id: '1' }, body: {} }],
      ['deleteRefund', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await refundController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('createRefund alone makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await refundController.createRefund({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      expect(refundService.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllRefunds', () => {
    it('passes the query filters through', async () => {
      const res = createResponse();
      refundService.list.mockResolvedValue([{ refund_id: 1 }]);

      await refundController.getAllRefunds({ query: { status: 'Pending' }, user: {} }, res);

      expect(refundService.list).toHaveBeenCalledWith({ status: 'Pending' }, 8);
      expect(res.json).toHaveBeenCalledWith([{ refund_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      refundService.list.mockRejectedValue(new Error('offline'));

      await refundController.getAllRefunds({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch refunds', details: 'offline' });
    });
  });

  describe('getRefundById', () => {
    it('returns the refund', async () => {
      const res = createResponse();
      refundService.getById.mockResolvedValue({ refund_id: 3 });

      await refundController.getRefundById({ params: { id: '3' }, user: {} }, res);

      expect(refundService.getById).toHaveBeenCalledWith(3, 8);
      expect(res.json).toHaveBeenCalledWith({ refund_id: 3 });
    });

    it('returns 404 when the refund is out of scope', async () => {
      const res = createResponse();
      refundService.getById.mockResolvedValue(null);

      await refundController.getRefundById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Refund not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      refundService.getById.mockRejectedValue(new Error('bad id'));

      await refundController.getRefundById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch refund', details: 'bad id' });
    });
  });

  describe('createRefund', () => {
    it.each([
      ['invalid_center', 400, { error: 'Payment does not belong to this center.' }],
      ['payment_not_found', 404, { error: 'Payment not found' }],
      ['refund_exceeds_payment', 400, { error: 'Refund amount exceeds the original payment amount.' }],
    ])('maps the %s result to a %d and writes no audit entry', async (error, status, payload) => {
      const res = createResponse();
      refundService.create.mockResolvedValue({ error });

      await refundController.createRefund({ body: { payment_id: 1 }, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(payload);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('records an audit entry describing the requested refund', async () => {
      const res = createResponse();
      refundService.create.mockResolvedValue({ row: { refund_id: 4 } });

      await refundController.createRefund({
        body: { payment_id: 11, amount: 200000 },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.9',
      }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'CREATE',
        entity_type: 'refund',
        entity_id: 4,
        center_id: 8,
        details: { payment_id: 11, amount: 200000 },
        ip_address: '10.0.0.9',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Refund requested', refund: { refund_id: 4 } });
    });

    it('attributes an unauthenticated request to the system actor', async () => {
      const res = createResponse();
      refundService.create.mockResolvedValue({ row: { refund_id: 5 } });

      await refundController.createRefund({ body: { payment_id: 11, amount: 1 } }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ user_type: 'system', user_id: 0 }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      refundService.create.mockRejectedValue(new Error('insert failed'));

      await refundController.createRefund({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create refund', details: 'insert failed' });
    });
  });

  describe('updateRefund', () => {
    it('returns the updated refund', async () => {
      const res = createResponse();
      refundService.update.mockResolvedValue({ refund_id: 3 });

      await refundController.updateRefund({ params: { id: '3' }, body: { status: 'Approved' }, user: {} }, res);

      expect(refundService.update).toHaveBeenCalledWith(3, { status: 'Approved' }, 8);
      expect(res.json).toHaveBeenCalledWith({ message: 'Refund updated', refund: { refund_id: 3 } });
    });

    it('refuses an amount larger than the original payment', async () => {
      const res = createResponse();
      refundService.update.mockResolvedValue({ error: 'refund_exceeds_payment' });

      await refundController.updateRefund({ params: { id: '3' }, body: { amount: 999 }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Refund amount exceeds the original payment amount.' });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      refundService.update.mockResolvedValue(null);

      await refundController.updateRefund({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Refund not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      refundService.update.mockRejectedValue(new Error('conflict'));

      await refundController.updateRefund({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update refund', details: 'conflict' });
    });
  });

  describe('deleteRefund', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      refundService.remove.mockResolvedValue({ refund_id: 3 });

      await refundController.deleteRefund({ params: { id: '3' }, user: {} }, res);

      expect(refundService.remove).toHaveBeenCalledWith(3, 8);
      expect(res.json).toHaveBeenCalledWith({ message: 'Refund deleted', refund: { refund_id: 3 } });
    });

    it('returns 404 when the refund is out of scope', async () => {
      const res = createResponse();
      refundService.remove.mockResolvedValue(null);

      await refundController.deleteRefund({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      refundService.remove.mockRejectedValue(new Error('locked'));

      await refundController.deleteRefund({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete refund', details: 'locked' });
    });
  });
});
