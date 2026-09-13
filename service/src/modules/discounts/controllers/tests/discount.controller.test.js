jest.mock('../../services/discount.service', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  getActiveSerialByStudent: jest.fn(),
  getActiveByStudent: jest.fn(),
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

const discountController = require('../discount.controller');
const discountService = require('../../services/discount.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('discounts controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 9, isGlobal: false });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllDiscounts', { query: {} }],
      ['getDiscountById', { params: { id: '1' } }],
      ['getActiveSerialDiscountByStudent', { params: { studentId: '2' } }],
      ['getActiveDiscountByStudent', { params: { studentId: '2' }, query: {} }],
      ['createDiscount', { body: {} }],
      ['updateDiscount', { params: { id: '1' }, body: {} }],
      ['deleteDiscount', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await discountController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it('createDiscount alone makes a superuser name a center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await discountController.createDiscount({ body: {}, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
      expect(discountService.create).not.toHaveBeenCalled();
    });

    it('getAllDiscounts still runs for a global caller with no concrete center', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();
      discountService.list.mockResolvedValue([]);

      await discountController.getAllDiscounts({ query: {}, user: { userType: 'superuser' } }, res);

      expect(discountService.list).toHaveBeenCalledWith({}, undefined);
    });
  });

  describe('getAllDiscounts', () => {
    it('passes the query filters through', async () => {
      const res = createResponse();
      discountService.list.mockResolvedValue([{ discount_id: 1 }]);

      await discountController.getAllDiscounts({ query: { student_id: '2' }, user: {} }, res);

      expect(discountService.list).toHaveBeenCalledWith({ student_id: '2' }, 9);
      expect(res.json).toHaveBeenCalledWith([{ discount_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.list.mockRejectedValue(new Error('offline'));

      await discountController.getAllDiscounts({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch discounts', details: 'offline' });
    });
  });

  describe('getDiscountById', () => {
    it('returns the discount', async () => {
      const res = createResponse();
      discountService.getById.mockResolvedValue({ discount_id: 3 });

      await discountController.getDiscountById({ params: { id: '3' }, user: {} }, res);

      expect(discountService.getById).toHaveBeenCalledWith(3, 9);
      expect(res.json).toHaveBeenCalledWith({ discount_id: 3 });
    });

    it('returns 404 when the discount is out of scope', async () => {
      const res = createResponse();
      discountService.getById.mockResolvedValue(null);

      await discountController.getDiscountById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Discount not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.getById.mockRejectedValue(new Error('bad id'));

      await discountController.getDiscountById({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch discount', details: 'bad id' });
    });
  });

  describe('getActiveSerialDiscountByStudent', () => {
    it('returns the active serial discount', async () => {
      const res = createResponse();
      discountService.getActiveSerialByStudent.mockResolvedValue({ discount_id: 4 });

      await discountController.getActiveSerialDiscountByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(discountService.getActiveSerialByStudent).toHaveBeenCalledWith(2, 9);
      expect(res.json).toHaveBeenCalledWith({ discount_id: 4 });
    });

    it('answers with null rather than 404 when the student has none', async () => {
      const res = createResponse();
      discountService.getActiveSerialByStudent.mockResolvedValue(undefined);

      await discountController.getActiveSerialDiscountByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith(null);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.getActiveSerialByStudent.mockRejectedValue(new Error('lookup failed'));

      await discountController.getActiveSerialDiscountByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch active discount', details: 'lookup failed' });
    });
  });

  describe('getActiveDiscountByStudent', () => {
    it('narrows the lookup by discount kind when one is given', async () => {
      const res = createResponse();
      discountService.getActiveByStudent.mockResolvedValue({ discount_id: 5 });

      await discountController.getActiveDiscountByStudent({ params: { studentId: '2' }, query: { discount_kind: 'sibling' }, user: {} }, res);

      expect(discountService.getActiveByStudent).toHaveBeenCalledWith(2, 9, 'sibling');
      expect(res.json).toHaveBeenCalledWith({ discount_id: 5 });
    });

    it('leaves the kind open when the query omits it', async () => {
      const res = createResponse();
      discountService.getActiveByStudent.mockResolvedValue(null);

      await discountController.getActiveDiscountByStudent({ params: { studentId: '2' }, query: {}, user: {} }, res);

      expect(discountService.getActiveByStudent).toHaveBeenCalledWith(2, 9, undefined);
      expect(res.json).toHaveBeenCalledWith(null);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.getActiveByStudent.mockRejectedValue(new Error('lookup failed'));

      await discountController.getActiveDiscountByStudent({ params: { studentId: '2' }, query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch active discount', details: 'lookup failed' });
    });
  });

  describe('createDiscount', () => {
    it('refuses a student from another center before writing an audit entry', async () => {
      const res = createResponse();
      discountService.create.mockResolvedValue({ error: 'invalid_center' });

      await discountController.createDiscount({ body: { student_id: 2 }, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this center.' });
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('records an audit entry describing the new discount', async () => {
      const res = createResponse();
      discountService.create.mockResolvedValue({ row: { discount_id: 7 } });

      await discountController.createDiscount({
        body: { student_id: 2, value: 15, discount_type: 'percent', discount_kind: 'sibling' },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.1',
      }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'CREATE',
        entity_type: 'discount',
        entity_id: 7,
        center_id: 9,
        details: { student_id: 2, value: 15, discount_type: 'percent', discount_kind: 'sibling' },
        ip_address: '10.0.0.1',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Discount created', discount: { discount_id: 7 } });
    });

    it('falls back to value_type and a system actor when the request is unauthenticated', async () => {
      const res = createResponse();
      discountService.create.mockResolvedValue({ row: { discount_id: 8 } });

      await discountController.createDiscount({ body: { student_id: 2, value: 15, value_type: 'fixed' } }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        user_type: 'system',
        user_id: 0,
        details: expect.objectContaining({ discount_type: 'fixed' }),
      }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.create.mockRejectedValue(new Error('insert failed'));

      await discountController.createDiscount({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create discount', details: 'insert failed' });
    });
  });

  describe('updateDiscount', () => {
    it('returns the updated discount', async () => {
      const res = createResponse();
      discountService.update.mockResolvedValue({ discount_id: 3 });

      await discountController.updateDiscount({ params: { id: '3' }, body: { value: 20 }, user: {} }, res);

      expect(discountService.update).toHaveBeenCalledWith(3, { value: 20 }, 9);
      expect(res.json).toHaveBeenCalledWith({ message: 'Discount updated', discount: { discount_id: 3 } });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      discountService.update.mockResolvedValue(null);

      await discountController.updateDiscount({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Discount not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.update.mockRejectedValue(new Error('conflict'));

      await discountController.updateDiscount({ params: { id: '3' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update discount', details: 'conflict' });
    });
  });

  describe('deleteDiscount', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      discountService.remove.mockResolvedValue({ discount_id: 3 });

      await discountController.deleteDiscount({ params: { id: '3' }, user: {} }, res);

      expect(discountService.remove).toHaveBeenCalledWith(3, 9);
      expect(res.json).toHaveBeenCalledWith({ message: 'Discount deleted', discount: { discount_id: 3 } });
    });

    it('returns 404 when the discount is out of scope', async () => {
      const res = createResponse();
      discountService.remove.mockResolvedValue(null);

      await discountController.deleteDiscount({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      discountService.remove.mockRejectedValue(new Error('locked'));

      await discountController.deleteDiscount({ params: { id: '3' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete discount', details: 'locked' });
    });
  });
});
