jest.mock('../../services/payment_plan.service', () => ({
  list: jest.fn(),
  getWithInstallments: jest.fn(),
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

const planController = require('../payment_plan.controller');
const planService = require('../../services/payment_plan.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('payment plans controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 5, isGlobal: false });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllPlans', { query: {} }],
      ['getPlanById', { params: { id: '1' } }],
      ['createPlan', { body: {} }],
      ['updatePlan', { params: { id: '1' }, body: {} }],
      ['deletePlan', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await planController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('createPlan alone makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await planController.createPlan({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      expect(planService.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllPlans', () => {
    it('passes the query filters through', async () => {
      const res = createResponse();
      planService.list.mockResolvedValue([{ plan_id: 1 }]);

      await planController.getAllPlans({ query: { student_id: '2' }, user: {} }, res);

      expect(planService.list).toHaveBeenCalledWith({ student_id: '2' }, 5);
      expect(res.json).toHaveBeenCalledWith([{ plan_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      planService.list.mockRejectedValue(new Error('offline'));

      await planController.getAllPlans({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch payment plans', details: 'offline' });
    });
  });

  describe('getPlanById', () => {
    it('returns the plan together with its installments', async () => {
      const res = createResponse();
      planService.getWithInstallments.mockResolvedValue({ plan: { plan_id: 3 }, installments: [] });

      await planController.getPlanById({ params: { id: '3' }, user: {} }, res);

      expect(planService.getWithInstallments).toHaveBeenCalledWith(3, 5);
      expect(res.json).toHaveBeenCalledWith({ plan: { plan_id: 3 }, installments: [] });
    });

    it('returns 404 when the plan is out of scope', async () => {
      const res = createResponse();
      planService.getWithInstallments.mockResolvedValue(null);

      await planController.getPlanById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payment plan not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      planService.getWithInstallments.mockRejectedValue(new Error('bad id'));

      await planController.getPlanById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch payment plan', details: 'bad id' });
    });
  });

  describe('createPlan', () => {
    it.each([
      ['invalid_center', { error: 'Student does not belong to this center.' }],
      ['installment_sum_mismatch', { error: 'Installment amounts must sum to total_amount.' }],
    ])('maps the %s result to a 400 and writes no audit entry', async (error, payload) => {
      const res = createResponse();
      planService.create.mockResolvedValue({ error });

      await planController.createPlan({ body: {}, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(payload);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('records an audit entry counting the installments', async () => {
      const res = createResponse();
      planService.create.mockResolvedValue({ plan: { plan_id: 7, total_amount: 900000 } });

      await planController.createPlan({
        body: { student_id: 2, installments: [{ amount: 300000 }, { amount: 600000 }] },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.2',
      }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'CREATE',
        entity_type: 'payment_plan',
        entity_id: 7,
        center_id: 5,
        details: { total_amount: 900000, installments_count: 2 },
        ip_address: '10.0.0.2',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Payment plan created', plan: { plan_id: 7, total_amount: 900000 } });
    });

    it('counts zero installments when the body omits them', async () => {
      const res = createResponse();
      planService.create.mockResolvedValue({ plan: { plan_id: 8, total_amount: 100 } });

      await planController.createPlan({ body: { student_id: 2 }, user: { userType: 'admin', id: 1 } }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        details: { total_amount: 100, installments_count: 0 },
      }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      planService.create.mockRejectedValue(new Error('insert failed'));

      await planController.createPlan({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create payment plan', details: 'insert failed' });
    });
  });

  describe('updatePlan', () => {
    it('returns the updated plan', async () => {
      const res = createResponse();
      planService.update.mockResolvedValue({ plan_id: 3 });

      await planController.updatePlan({ params: { id: '3' }, body: { total_amount: 500 }, user: {} }, res);

      expect(planService.update).toHaveBeenCalledWith(3, { total_amount: 500 }, 5);
      expect(res.json).toHaveBeenCalledWith({ message: 'Payment plan updated', plan: { plan_id: 3 } });
    });

    it('refuses installments that do not sum to the total', async () => {
      const res = createResponse();
      planService.update.mockResolvedValue({ error: 'installment_sum_mismatch' });

      await planController.updatePlan({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Installment amounts must sum to total_amount.' });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      planService.update.mockResolvedValue(null);

      await planController.updatePlan({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Payment plan not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      planService.update.mockRejectedValue(new Error('conflict'));

      await planController.updatePlan({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update payment plan', details: 'conflict' });
    });
  });

  describe('deletePlan', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      planService.remove.mockResolvedValue({ plan_id: 3 });

      await planController.deletePlan({ params: { id: '3' }, user: {} }, res);

      expect(planService.remove).toHaveBeenCalledWith(3, 5);
      expect(res.json).toHaveBeenCalledWith({ message: 'Payment plan deleted', plan: { plan_id: 3 } });
    });

    it('returns 404 when the plan is out of scope', async () => {
      const res = createResponse();
      planService.remove.mockResolvedValue(null);

      await planController.deletePlan({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      planService.remove.mockRejectedValue(new Error('locked'));

      await planController.deletePlan({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete payment plan', details: 'locked' });
    });
  });
});
