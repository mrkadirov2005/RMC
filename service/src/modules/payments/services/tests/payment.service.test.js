jest.mock('../../repositories/payment.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  withTransaction: jest.fn(),
  update: jest.fn(),
  findByStudent: jest.fn(),
  remove: jest.fn(),
  purge: jest.fn(),
}));

jest.mock('../../../discounts/services/discount.service', () => ({
  calculateDiscount: jest.fn(),
  getActiveSerialByStudent: jest.fn(),
  getActiveByStudent: jest.fn(),
  update: jest.fn(),
}));

const paymentService = require('../payment.service');
const paymentRepository = require('../../repositories/payment.repository');
const discountService = require('../../../discounts/services/discount.service');

describe('payments service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paymentRepository.insert.mockResolvedValue({ payment_id: 1 });
    paymentRepository.withTransaction.mockImplementation(async (callback) => callback({ query: jest.fn() }));
    discountService.getActiveByStudent.mockResolvedValue(null);
    discountService.getActiveSerialByStudent.mockResolvedValue(null);
  });

  it('applies explicit monthly discount before inserting payment', async () => {
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 300000,
      discountAmount: 50000,
      finalAmount: 250000,
    });

    await paymentService.createPayment({
      student_id: 9,
      amount: 250000,
      original_amount: 300000,
      discount_kind: 'monthly_discount',
      discount_value_type: 'fixed',
      discount_value: 50000,
      payment_type: 'Tuition',
    }, 4);

    expect(discountService.getActiveSerialByStudent).not.toHaveBeenCalled();
    expect(paymentRepository.insert).toHaveBeenCalledWith(expect.arrayContaining([
      9,
      4,
      expect.any(String),
      250000,
      'UZS',
      'Cash',
    ]));
    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(payload.slice(11)).toEqual([
      null,
      'monthly_discount',
      'fixed',
      50000,
      300000,
      50000,
      250000,
      true,
    ]);
  });

  it('uses active serial discount when no monthly discount is supplied', async () => {
    discountService.getActiveSerialByStudent.mockResolvedValue({
      discount_id: 7,
      discount_type: 'percent',
      value: 10,
    });
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 100000,
      discountAmount: 10000,
      finalAmount: 90000,
    });

    await paymentService.createPayment({ student_id: 3, amount: 50000, original_amount: 100000 }, 2);

    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(discountService.getActiveSerialByStudent).toHaveBeenCalledWith(3, 2);
    expect(payload.slice(11)).toEqual([
      7,
      'serial_discount',
      'percent',
      10,
      100000,
      10000,
      90000,
      false,
    ]);
  });

  it('uses and deactivates an active monthly discount in one transaction', async () => {
    discountService.getActiveByStudent.mockResolvedValue({
      discount_id: 12,
      discount_type: 'fixed',
      value: 25000,
    });
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 100000,
      discountAmount: 25000,
      finalAmount: 75000,
    });

    await paymentService.createPayment({ student_id: 5, amount: 75000, original_amount: 100000 }, 8);

    expect(discountService.getActiveByStudent).toHaveBeenCalledWith(5, 8, 'monthly_discount');
    expect(discountService.getActiveSerialByStudent).not.toHaveBeenCalled();
    expect(paymentRepository.withTransaction).toHaveBeenCalledTimes(1);
    expect(discountService.update).toHaveBeenCalledWith(12, { active: false }, 8, expect.any(Object));
    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(payload.slice(11)).toEqual([
      12,
      'monthly_discount',
      'fixed',
      25000,
      100000,
      25000,
      75000,
      true,
    ]);
  });

  it('delegates list filters to repository', async () => {
    paymentRepository.findAll.mockResolvedValue([]);

    await paymentService.listPayments({ centerId: 1, teacherId: 2, limit: 25, offset: 50 });

    expect(paymentRepository.findAll).toHaveBeenCalledWith({ centerId: 1, teacherId: 2, limit: 25, offset: 50 });
  });
});
