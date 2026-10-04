jest.mock('../../services/payment.service', () => ({
  listPayments: jest.fn(),
  getPayment: jest.fn(),
  createPayment: jest.fn(),
  updatePayment: jest.fn(),
  listByStudent: jest.fn(),
  deletePayment: jest.fn(),
  purgePayment: jest.fn(),
  resolveCashierName: jest.fn(),
  getReceipt: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentBelongsToTeacher: jest.fn(),
}));

const paymentController = require('../payment.controller');
const paymentService = require('../../services/payment.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('payments controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 11, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('limits payment listing and maps teacher payment view', async () => {
    const req = { query: { limit: '999', page: '2' }, user: { userType: 'teacher', id: 4 } };
    const res = createResponse();
    paymentService.listPayments.mockResolvedValue([{ payment_id: 1, student_id: 2, amount: 100, payment_status: 'Completed' }]);

    await paymentController.getAllPayments(req, res);

    expect(paymentService.listPayments).toHaveBeenCalledWith({
      centerId: 11,
      teacherId: 4,
      studentId: undefined,
      limit: 200,
      offset: 200,
    });
    expect(res.json).toHaveBeenCalledWith([{ payment_id: 1, student_id: 2, payment_date: undefined, payment_status: 'Completed' }]);
  });

  it('blocks teachers from creating payments', async () => {
    const req = { body: {}, user: { userType: 'teacher', id: 4 } };
    const res = createResponse();

    await paymentController.createPayment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "O'qituvchilar to'lov yarata olmaydi." });
  });

  it('records the signed-in owner or admin as the cashier', async () => {
    const user = { userType: 'superuser', role: 'admin', id: 7, center_id: 11 };
    const req = { body: { student_id: 2, amount: 340000 }, user };
    const res = createResponse();
    paymentService.resolveCashierName.mockResolvedValue('Jalolov Anvar');
    paymentService.createPayment.mockResolvedValue({ payment_id: 5 });

    await paymentController.createPayment(req, res);

    expect(paymentService.resolveCashierName).toHaveBeenCalledWith(user);
    expect(paymentService.createPayment).toHaveBeenCalledWith(req.body, 11, 'Jalolov Anvar');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns receipt data for staff, and refuses teachers and students', async () => {
    const res = createResponse();
    paymentService.getReceipt.mockResolvedValue({ payment_id: 5, payer_name: 'Karimov Hojiakbar' });

    await paymentController.getPaymentReceipt({ params: { id: '5' }, user: { userType: 'superuser', role: 'admin', id: 7, center_id: 11 } }, res);
    expect(paymentService.getReceipt).toHaveBeenCalledWith(5, 11);
    expect(res.json).toHaveBeenCalledWith({ payment_id: 5, payer_name: 'Karimov Hojiakbar' });

    for (const userType of ['teacher', 'student']) {
      const denied = createResponse();
      await paymentController.getPaymentReceipt({ params: { id: '5' }, user: { userType, id: 4 } }, denied);
      expect(denied.status).toHaveBeenCalledWith(403);
    }

    const missing = createResponse();
    paymentService.getReceipt.mockResolvedValue(null);
    await paymentController.getPaymentReceipt({ params: { id: '6' }, user: { userType: 'superuser', role: 'admin', id: 7, center_id: 11 } }, missing);
    expect(missing.status).toHaveBeenCalledWith(404);
  });

  it('checks teacher ownership when fetching student payments', async () => {
    const req = { params: { studentId: '8' }, user: { userType: 'teacher', id: 4 } };
    const res = createResponse();
    studentBelongsToTeacher.mockResolvedValue(false);

    await paymentController.getPaymentsByStudent(req, res);

    expect(studentBelongsToTeacher).toHaveBeenCalledWith(8, 4);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
