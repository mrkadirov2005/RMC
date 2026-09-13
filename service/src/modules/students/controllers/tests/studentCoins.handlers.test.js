jest.mock('../../services/student.service', () => ({
  getCoinSummary: jest.fn(),
  getStudent: jest.fn(),
  addCoins: jest.fn(),
  updateCoinTransaction: jest.fn(),
  deleteCoinTransaction: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../studentCoins.controller');
const studentService = require('../../services/student.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const admin = { userType: 'admin', id: 1 };

describe('student coins controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
    studentService.getStudent.mockResolvedValue({ student_id: 9 });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getStudentCoins', { params: { id: '9' } }],
      ['addStudentCoins', { params: { id: '9' }, body: {} }],
      ['updateStudentCoinTransaction', { params: { id: '9', transactionId: '3' }, body: {} }],
      ['deleteStudentCoinTransaction', { params: { id: '9', transactionId: '3' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'superuser', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getStudentCoins', () => {
    it('stops a student reading another student balance', async () => {
      const res = createResponse();

      await controller.getStudentCoins({ params: { id: '9' }, user: { userType: 'student', id: 4 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
      expect(studentService.getCoinSummary).not.toHaveBeenCalled();
    });

    it('lets a student read their own balance', async () => {
      const res = createResponse();
      studentService.getCoinSummary.mockResolvedValue({ balance: 40 });

      await controller.getStudentCoins({ params: { id: '9' }, user: { userType: 'student', id: 9 } }, res);

      expect(res.json).toHaveBeenCalledWith({ balance: 40 });
    });

    it('passes the teacher scope through', async () => {
      const res = createResponse();
      studentService.getCoinSummary.mockResolvedValue({ balance: 0 });

      await controller.getStudentCoins({ params: { id: '9' }, user: { userType: 'teacher', id: 7 } }, res);

      expect(studentService.getCoinSummary).toHaveBeenCalledWith(9, 2, 7);
    });

    it('returns 404 when the student is out of scope', async () => {
      const res = createResponse();
      studentService.getCoinSummary.mockResolvedValue(null);

      await controller.getStudentCoins({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.getCoinSummary.mockRejectedValue(new Error('offline'));

      await controller.getStudentCoins({ params: { id: '9' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch coins', details: 'offline' });
    });
  });

  describe('addStudentCoins', () => {
    it('keeps students out of the write path entirely', async () => {
      const res = createResponse();

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5 }, user: { userType: 'student', id: 9 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(studentService.addCoins).not.toHaveBeenCalled();
    });

    it('adds the amount as given', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ balance: 45 });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5, reason: 'Prize' }, user: admin }, res);

      expect(studentService.addCoins).toHaveBeenCalledWith(9, 5, 'Prize', 1, 'admin');
      expect(res.json).toHaveBeenCalledWith({ balance: 45 });
    });

    it('turns a subtract direction into a negative delta', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ balance: 35 });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5, direction: 'Subtract' }, user: admin }, res);

      expect(studentService.addCoins).toHaveBeenCalledWith(9, -5, null, 1, 'admin');
    });

    it('treats a negative amount with a subtract direction as a single subtraction', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ balance: 35 });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: -5, direction: 'subtract' }, user: admin }, res);

      expect(studentService.addCoins).toHaveBeenCalledWith(9, -5, null, 1, 'admin');
    });

    it('returns 404 before writing when the student is out of scope', async () => {
      const res = createResponse();
      studentService.getStudent.mockResolvedValue(null);

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5 }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(studentService.addCoins).not.toHaveBeenCalled();
    });

    it('refuses a subtraction that would overdraw the balance', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ error: 'insufficient' });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 500, direction: 'subtract' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient coins for this operation.' });
    });

    it('returns 404 when the service cannot find the student', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ error: 'not_found' });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5 }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('records a null actor when the session carries none', async () => {
      const res = createResponse();
      studentService.addCoins.mockResolvedValue({ balance: 5 });

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5 }, user: {} }, res);

      expect(studentService.addCoins).toHaveBeenCalledWith(9, 5, null, null, null);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.addCoins.mockRejectedValue(new Error('write failed'));

      await controller.addStudentCoins({ params: { id: '9' }, body: { amount: 5 }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update coins', details: 'write failed' });
    });
  });

  describe('updateStudentCoinTransaction', () => {
    it('keeps students out of the write path', async () => {
      const res = createResponse();

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: {},
        user: { userType: 'student', id: 9 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rewrites the transaction with the signed delta', async () => {
      const res = createResponse();
      studentService.updateCoinTransaction.mockResolvedValue({ balance: 30 });

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: { amount: 10, direction: 'subtract', reason: 'Correction' },
        user: admin,
      }, res);

      expect(studentService.updateCoinTransaction).toHaveBeenCalledWith(9, 3, -10, 'Correction');
      expect(res.json).toHaveBeenCalledWith({ balance: 30 });
    });

    it('returns 404 before writing when the student is out of scope', async () => {
      const res = createResponse();
      studentService.getStudent.mockResolvedValue(null);

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: {},
        user: admin,
      }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(studentService.updateCoinTransaction).not.toHaveBeenCalled();
    });

    it('refuses an edit that would overdraw the balance', async () => {
      const res = createResponse();
      studentService.updateCoinTransaction.mockResolvedValue({ error: 'insufficient' });

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: { amount: 999, direction: 'subtract' },
        user: admin,
      }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient coins for this operation.' });
    });

    it.each(['not_found', 'tx_not_found'])('maps the %s result to a 404', async (error) => {
      const res = createResponse();
      studentService.updateCoinTransaction.mockResolvedValue({ error });

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: {},
        user: admin,
      }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.updateCoinTransaction.mockRejectedValue(new Error('write failed'));

      await controller.updateStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        body: {},
        user: admin,
      }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update coins', details: 'write failed' });
    });
  });

  describe('deleteStudentCoinTransaction', () => {
    it('keeps students out of the write path', async () => {
      const res = createResponse();

      await controller.deleteStudentCoinTransaction({
        params: { id: '9', transactionId: '3' },
        user: { userType: 'student', id: 9 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('removes the transaction and returns the new balance', async () => {
      const res = createResponse();
      studentService.deleteCoinTransaction.mockResolvedValue({ balance: 20 });

      await controller.deleteStudentCoinTransaction({ params: { id: '9', transactionId: '3' }, user: admin }, res);

      expect(studentService.deleteCoinTransaction).toHaveBeenCalledWith(9, 3);
      expect(res.json).toHaveBeenCalledWith({ balance: 20 });
    });

    it('returns 404 before writing when the student is out of scope', async () => {
      const res = createResponse();
      studentService.getStudent.mockResolvedValue(null);

      await controller.deleteStudentCoinTransaction({ params: { id: '9', transactionId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(studentService.deleteCoinTransaction).not.toHaveBeenCalled();
    });

    it('refuses a removal that would overdraw the balance', async () => {
      const res = createResponse();
      studentService.deleteCoinTransaction.mockResolvedValue({ error: 'insufficient' });

      await controller.deleteStudentCoinTransaction({ params: { id: '9', transactionId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient coins for this operation.' });
    });

    it.each(['not_found', 'tx_not_found'])('maps the %s result to a 404', async (error) => {
      const res = createResponse();
      studentService.deleteCoinTransaction.mockResolvedValue({ error });

      await controller.deleteStudentCoinTransaction({ params: { id: '9', transactionId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      studentService.deleteCoinTransaction.mockRejectedValue(new Error('delete failed'));

      await controller.deleteStudentCoinTransaction({ params: { id: '9', transactionId: '3' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete coins', details: 'delete failed' });
    });
  });
});
