jest.mock('../../services/debt.service', () => ({
  listDebts: jest.fn(),
  getDebt: jest.fn(),
  createDebt: jest.fn(),
  updateDebt: jest.fn(),
  listByStudent: jest.fn(),
  deleteDebt: jest.fn(),
  analyzeUnpaidMonths: jest.fn(),
  generateDebtsFromAnalysis: jest.fn(),
  getPaymentSummary: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentBelongsToTeacher: jest.fn(),
}));

const debtController = require('../debt.controller');
const debtService = require('../../services/debt.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('debts controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 3, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getAllDebts', { query: {} }],
      ['getDebtById', { params: { id: '1' } }],
      ['createDebt', { body: {} }],
      ['updateDebt', { params: { id: '1' }, body: {} }],
      ['getDebtsByStudent', { params: { studentId: '2' } }],
      ['deleteDebt', { params: { id: '1' } }],
      ['analyzeUnpaidMonths', { query: {} }],
      ['generateDebtsFromAnalysis', { body: {} }],
      ['getPaymentSummary', { params: { studentId: '2' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await debtController[handler]({ ...req, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each([
      ['createDebt', { body: {} }],
      ['generateDebtsFromAnalysis', { body: {} }],
    ])('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await debtController[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getAllDebts', () => {
    it('narrows the listing to the calling teacher', async () => {
      const res = createResponse();
      debtService.listDebts.mockResolvedValue([{ debt_id: 1 }]);

      await debtController.getAllDebts({ query: {}, user: { userType: 'teacher', id: 6 } }, res);

      expect(debtService.listDebts).toHaveBeenCalledWith(3, 6);
      expect(res.json).toHaveBeenCalledWith([{ debt_id: 1 }]);
    });

    it('leaves an admin listing unfiltered by teacher', async () => {
      const res = createResponse();
      debtService.listDebts.mockResolvedValue([]);

      await debtController.getAllDebts({ query: {}, user: { userType: 'admin', id: 1 } }, res);

      expect(debtService.listDebts).toHaveBeenCalledWith(3, undefined);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.listDebts.mockRejectedValue(new Error('offline'));

      await debtController.getAllDebts({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch debts', details: 'offline' });
    });
  });

  describe('getDebtById', () => {
    it('returns 404 when the debt is out of scope', async () => {
      const res = createResponse();
      debtService.getDebt.mockResolvedValue(null);

      await debtController.getDebtById({ params: { id: '4' }, user: {} }, res);

      expect(debtService.getDebt).toHaveBeenCalledWith(4, 3, undefined);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Debt not found' });
    });

    it('stops a student reading another student debt', async () => {
      const res = createResponse();
      debtService.getDebt.mockResolvedValue({ debt_id: 4, student_id: 2 });

      await debtController.getDebtById({ params: { id: '4' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
    });

    it('returns the student own debt', async () => {
      const res = createResponse();
      debtService.getDebt.mockResolvedValue({ debt_id: 4, student_id: 9 });

      await debtController.getDebtById({ params: { id: '4' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.json).toHaveBeenCalledWith({ debt_id: 4, student_id: 9 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.getDebt.mockRejectedValue(new Error('bad id'));

      await debtController.getDebtById({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch debt', details: 'bad id' });
    });
  });

  describe('createDebt', () => {
    it('stamps the scoped center onto the new debt', async () => {
      const res = createResponse();
      debtService.createDebt.mockResolvedValue({ debt_id: 7 });

      await debtController.createDebt({ body: { student_id: 2, amount: 500, center_id: 999 }, user: { userType: 'admin' } }, res);

      expect(debtService.createDebt).toHaveBeenCalledWith({ student_id: 2, amount: 500, center_id: 3 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ debt_id: 7 });
    });

    it('stops a teacher billing a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await debtController.createDebt({ body: { student_id: 2 }, user: { userType: 'teacher', id: 6 } }, res);

      expect(studentBelongsToTeacher).toHaveBeenCalledWith(2, 6);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
      expect(debtService.createDebt).not.toHaveBeenCalled();
    });

    it('lets a teacher bill their own student', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      debtService.createDebt.mockResolvedValue({ debt_id: 8 });

      await debtController.createDebt({ body: { student_id: 2 }, user: { userType: 'teacher', id: 6 } }, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.createDebt.mockRejectedValue(new Error('insert failed'));

      await debtController.createDebt({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create debt', details: 'insert failed' });
    });
  });

  describe('updateDebt', () => {
    it('passes the teacher scope through', async () => {
      const res = createResponse();
      debtService.updateDebt.mockResolvedValue({ debt_id: 4 });

      await debtController.updateDebt({ params: { id: '4' }, body: { amount: 100 }, user: { userType: 'teacher', id: 6 } }, res);

      expect(debtService.updateDebt).toHaveBeenCalledWith(4, { amount: 100 }, 3, 6);
      expect(res.json).toHaveBeenCalledWith({ debt_id: 4 });
    });

    it('returns 404 when nothing was updated', async () => {
      const res = createResponse();
      debtService.updateDebt.mockResolvedValue(null);

      await debtController.updateDebt({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Debt not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.updateDebt.mockRejectedValue(new Error('conflict'));

      await debtController.updateDebt({ params: { id: '4' }, body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update debt', details: 'conflict' });
    });
  });

  describe('getDebtsByStudent', () => {
    it('stops a student reading another student debts', async () => {
      const res = createResponse();

      await debtController.getDebtsByStudent({ params: { studentId: '2' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(debtService.listByStudent).not.toHaveBeenCalled();
    });

    it('stops a teacher reading a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await debtController.getDebtsByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 6 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
    });

    it('returns the debts for an allowed teacher', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      debtService.listByStudent.mockResolvedValue([{ debt_id: 1 }]);

      await debtController.getDebtsByStudent({ params: { studentId: '2' }, user: { userType: 'teacher', id: 6 } }, res);

      expect(debtService.listByStudent).toHaveBeenCalledWith(2, 3, 6);
      expect(res.json).toHaveBeenCalledWith([{ debt_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.listByStudent.mockRejectedValue(new Error('lookup failed'));

      await debtController.getDebtsByStudent({ params: { studentId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch debts', details: 'lookup failed' });
    });
  });

  describe('deleteDebt', () => {
    it('confirms the deletion and echoes the removed row', async () => {
      const res = createResponse();
      debtService.deleteDebt.mockResolvedValue({ debt_id: 4 });

      await debtController.deleteDebt({ params: { id: '4' }, user: {} }, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Debt deleted successfully', debt: { debt_id: 4 } });
    });

    it('returns 404 when the debt is out of scope', async () => {
      const res = createResponse();
      debtService.deleteDebt.mockResolvedValue(null);

      await debtController.deleteDebt({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.deleteDebt.mockRejectedValue(new Error('locked'));

      await debtController.deleteDebt({ params: { id: '4' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete debt', details: 'locked' });
    });
  });

  describe('analyzeUnpaidMonths', () => {
    it('passes the date window and center through as strings', async () => {
      const res = createResponse();
      debtService.analyzeUnpaidMonths.mockResolvedValue({ students: [] });

      await debtController.analyzeUnpaidMonths({
        query: { start_date: '2026-01-01', end_date: '2026-03-01' },
        user: { userType: 'teacher', id: 6 },
      }, res);

      expect(debtService.analyzeUnpaidMonths).toHaveBeenCalledWith('3', '2026-01-01', '2026-03-01', 6);
      expect(res.json).toHaveBeenCalledWith({ students: [] });
    });

    it('sends an empty center string when the caller is global', async () => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();
      debtService.analyzeUnpaidMonths.mockResolvedValue({ students: [] });

      await debtController.analyzeUnpaidMonths({ query: {}, user: { userType: 'superuser' } }, res);

      expect(debtService.analyzeUnpaidMonths).toHaveBeenCalledWith('', undefined, undefined, undefined);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.analyzeUnpaidMonths.mockRejectedValue(new Error('analysis failed'));

      await debtController.analyzeUnpaidMonths({ query: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to analyze unpaid months', details: 'analysis failed' });
    });
  });

  describe('generateDebtsFromAnalysis', () => {
    it('reports how many debt records were created', async () => {
      const res = createResponse();
      debtService.generateDebtsFromAnalysis.mockResolvedValue({ createdDebts: [{ debt_id: 1 }, { debt_id: 2 }] });

      await debtController.generateDebtsFromAnalysis({
        body: { student_ids: [1, 2], monthly_fee: 300000, remarks: 'Term 1' },
        user: { userType: 'teacher', id: 6 },
      }, res);

      expect(debtService.generateDebtsFromAnalysis).toHaveBeenCalledWith([1, 2], 300000, 3, 'Term 1', 6);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Created 2 debt records',
        debts: [{ debt_id: 1 }, { debt_id: 2 }],
      });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.generateDebtsFromAnalysis.mockRejectedValue(new Error('generation failed'));

      await debtController.generateDebtsFromAnalysis({ body: {}, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to generate debts', details: 'generation failed' });
    });
  });

  describe('getPaymentSummary', () => {
    it('stops a student reading another student summary', async () => {
      const res = createResponse();

      await debtController.getPaymentSummary({ params: { studentId: '2' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(debtService.getPaymentSummary).not.toHaveBeenCalled();
    });

    it('stops a teacher reading a student who is not theirs', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(false);

      await debtController.getPaymentSummary({ params: { studentId: '2' }, user: { userType: 'teacher', id: 6 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student does not belong to this teacher.' });
    });

    it('returns the summary for an allowed teacher', async () => {
      const res = createResponse();
      studentBelongsToTeacher.mockResolvedValue(true);
      debtService.getPaymentSummary.mockResolvedValue({ paid: 1, unpaid: 2 });

      await debtController.getPaymentSummary({ params: { studentId: '2' }, user: { userType: 'teacher', id: 6 } }, res);

      expect(debtService.getPaymentSummary).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith({ paid: 1, unpaid: 2 });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      debtService.getPaymentSummary.mockRejectedValue(new Error('summary failed'));

      await debtController.getPaymentSummary({ params: { studentId: '2' }, user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get payment summary', details: 'summary failed' });
    });
  });
});
