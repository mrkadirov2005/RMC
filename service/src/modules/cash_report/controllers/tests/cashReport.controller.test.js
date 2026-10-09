jest.mock('../../services/cashReport.service', () => ({
  getDailyReport: jest.fn(),
  listExpenses: jest.fn(),
  createExpense: jest.fn(),
  deleteExpense: jest.fn(),
}));
jest.mock('../../../payments/services/payment.service', () => ({ resolveCashierName: jest.fn(async () => 'Admin Aliyev') }));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn() }));

const controller = require('../cashReport.controller');
const service = require('../../services/cashReport.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('cash report controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
  });

  it("reports the admin's own branch for the asked date", async () => {
    const res = createResponse();
    service.getDailyReport.mockResolvedValue({ date: '2026-10-09' });
    await controller.getDailyReport({ query: { date: '2026-10-09' }, user: {} }, res);
    expect(service.getDailyReport).toHaveBeenCalledWith('2026-10-09', 4);
    expect(res.json).toHaveBeenCalledWith({ date: '2026-10-09' });
  });

  it('turns validation errors into a 400 with an Uzbek message', async () => {
    const res = createResponse();
    service.getDailyReport.mockResolvedValue({ error: 'invalid_date' });
    await controller.getDailyReport({ query: { date: 'x' }, user: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Sana noto'g'ri." });
  });

  it('needs a concrete branch to record an expense, and records who entered it', async () => {
    const res = createResponse();
    getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
    await controller.createExpense({ body: {}, user: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.createExpense).not.toHaveBeenCalled();

    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
    service.createExpense.mockResolvedValue({ expense_id: 1 });
    const created = createResponse();
    await controller.createExpense({ body: { amount: 5 }, user: {} }, created);
    expect(service.createExpense).toHaveBeenCalledWith({ amount: 5 }, 4, 'Admin Aliyev');
    expect(created.status).toHaveBeenCalledWith(201);
  });

  it('answers 404 when the expense is not in the branch', async () => {
    const res = createResponse();
    service.deleteExpense.mockResolvedValue(false);
    await controller.deleteExpense({ params: { id: '7' }, user: {} }, res);
    expect(service.deleteExpense).toHaveBeenCalledWith(7, 4);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
