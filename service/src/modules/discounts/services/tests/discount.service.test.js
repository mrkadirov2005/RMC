jest.mock('../../repositories/discount.repository', () => ({
  findAllFiltered: jest.fn(), findById: jest.fn(), findActiveSerialByStudent: jest.fn(),
  findActiveByStudent: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn() }));

const repository = require('../../repositories/discount.repository');
const { studentInCenter } = require('../../../../shared/tenantDb');
const service = require('../discount.service');

describe('discount service', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    [1000, 'percent', 25, { originalAmount: 1000, discountAmount: 250, finalAmount: 750 }],
    [1000, 'percent', 150, { originalAmount: 1000, discountAmount: 1000, finalAmount: 0 }],
    [1000, 'fixed', 1200, { originalAmount: 1000, discountAmount: 1000, finalAmount: 0 }],
    [1000, 'fixed', -20, { originalAmount: 1000, discountAmount: 0, finalAmount: 1000 }],
    [0, 'percent', 50, { originalAmount: 0, discountAmount: 0, finalAmount: 0 }],
  ])('calculates clamped discounts %#', (amount, type, value, expected) => {
    expect(service.calculateDiscount(amount, type, value)).toEqual(expected);
  });

  test('normalizes list filters and forces authenticated center', () => {
    service.list({ student_id: '7', center_id: '99', active: 'false', discount_kind: 'monthly_discount' }, 2);
    expect(repository.findAllFiltered).toHaveBeenCalledWith({
      studentId: 7, centerId: 2, active: false, discountKind: 'monthly_discount',
    });
  });

  test('rejects creating a discount for a student outside the center', async () => {
    studentInCenter.mockResolvedValue(false);
    await expect(service.create({ student_id: 7, center_id: 99 }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('creates calculated serial fixed discount with safe defaults', async () => {
    studentInCenter.mockResolvedValue(true);
    repository.insert.mockResolvedValue({ discount_id: 1 });
    await expect(service.create({ student_id: 7, original_price: 1000, value: 200 }, 2))
      .resolves.toEqual({ row: { discount_id: 1 } });
    expect(repository.insert).toHaveBeenCalledWith([
      7, 2, 'fixed', 'serial_discount', 200, 1000, 800, null, null, null, null, true,
    ]);
  });

  test('forwards update and delete with center scope', () => {
    service.update(1, { value_type: 'percent', discount_kind: 'monthly_discount', value: 10 }, 2, 'tx');
    service.remove(1, 2);
    expect(repository.update).toHaveBeenCalledWith(1, ['percent', 'monthly_discount', 10, undefined, undefined, undefined, undefined, undefined, undefined, undefined], 2, 'tx');
    expect(repository.remove).toHaveBeenCalledWith(1, 2);
  });
});
