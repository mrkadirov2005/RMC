const mockClient = { __tag: 'tx-client' };

jest.mock('../../repositories/refund.repository', () => ({
  findAllFiltered: jest.fn(), findById: jest.fn(), insert: jest.fn(), update: jest.fn(),
  updatePaymentRefunded: jest.fn(), remove: jest.fn(), withTransaction: jest.fn(),
}));
jest.mock('../../../payments/repositories/payment.repository', () => ({ findById: jest.fn() }));

const refunds = require('../../repositories/refund.repository');
const payments = require('../../../payments/repositories/payment.repository');
const service = require('../refund.service');

describe('refund service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refunds.findAllFiltered.mockResolvedValue([]);
    refunds.withTransaction.mockImplementation((callback) => callback(mockClient));
  });

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
    payments.findById.mockResolvedValue({ payment_id: 8, final_amount: 100 });
    refunds.insert.mockResolvedValue({ refund_id: 1 });
    await expect(service.create({ payment_id: 8, amount: 100 }, 2)).resolves.toEqual({ row: { refund_id: 1 } });
    expect(refunds.insert).toHaveBeenCalledWith([8, 100, null]);
  });

  test('rejects a refund that would exceed the original payment amount', async () => {
    payments.findById.mockResolvedValue({ payment_id: 8, final_amount: 100 });
    refunds.findAllFiltered.mockResolvedValue([{ refund_id: 2, amount: 60, status: 'Approved' }]);
    await expect(service.create({ payment_id: 8, amount: 50 }, 2)).resolves.toEqual({ error: 'refund_exceeds_payment' });
    expect(refunds.insert).not.toHaveBeenCalled();
  });

  test('marks the payment refunded only after a processed update', async () => {
    refunds.findById.mockResolvedValue({ refund_id: 1, payment_id: 8, amount: 100 });
    payments.findById.mockResolvedValue({ payment_id: 8, final_amount: 100 });
    refunds.update.mockResolvedValue({ refund_id: 1, payment_id: 8 });
    await service.update(1, { status: 'Processed', refunded_at: '2026-08-08' }, 2);
    expect(refunds.update).toHaveBeenCalledWith(1, 'Processed', '2026-08-08', mockClient);
    expect(refunds.updatePaymentRefunded).toHaveBeenCalledWith(8, mockClient);
  });
});
