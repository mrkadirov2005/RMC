jest.mock('../../repositories/refund.repository', () => ({
  findAllFiltered: jest.fn(), findById: jest.fn(), insert: jest.fn(), update: jest.fn(),
  updatePaymentRefunded: jest.fn(), remove: jest.fn(),
}));
jest.mock('../../../payments/repositories/payment.repository', () => ({ findById: jest.fn() }));

const refunds = require('../../repositories/refund.repository');
const payments = require('../../../payments/repositories/payment.repository');
const service = require('../refund.service');

describe('refund service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hides refund details when its payment is outside the center', async () => {
    refunds.findById.mockResolvedValue({ refund_id: 1, payment_id: 8 });
    payments.findById.mockResolvedValue(null);
    await expect(service.getById(1, 2)).resolves.toBeNull();
  });

  test('rejects cross-center refund creation', async () => {
    payments.findById.mockResolvedValue(null);
    await expect(service.create({ payment_id: 8, amount: 100 }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(refunds.insert).not.toHaveBeenCalled();
  });

  test('creates a scoped refund and defaults an absent reason', async () => {
    payments.findById.mockResolvedValue({ payment_id: 8 });
    refunds.insert.mockResolvedValue({ refund_id: 1 });
    await expect(service.create({ payment_id: 8, amount: 100 }, 2)).resolves.toEqual({ row: { refund_id: 1 } });
    expect(refunds.insert).toHaveBeenCalledWith([8, 100, null]);
  });

  test('marks the payment refunded only after a processed update', async () => {
    refunds.findById.mockResolvedValue({ refund_id: 1, payment_id: 8 });
    payments.findById.mockResolvedValue({ payment_id: 8 });
    refunds.update.mockResolvedValue({ refund_id: 1, payment_id: 8 });
    await service.update(1, { status: 'Processed', refunded_at: '2026-08-08' }, 2);
    expect(refunds.updatePaymentRefunded).toHaveBeenCalledWith(8);
  });
});
