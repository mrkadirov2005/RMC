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

  // RMC-038/RMC-071: a percent-type discount is now clamped to [0, 100] at store
  // time (create/update), via the same clampPercentValue helper calculateDiscount
  // uses on read, instead of only being clamped when later read/applied.
  describe('percent value clamped at store time (RMC-038)', () => {
    test('clamps an out-of-range percent value on create before it is stored', async () => {
      studentInCenter.mockResolvedValue(true);
      repository.insert.mockResolvedValue({ discount_id: 2 });

      await service.create({ student_id: 7, value_type: 'percent', value: 500, original_price: 1000 }, 2);

      const insertArgs = repository.insert.mock.calls[0][0];
      expect(insertArgs[4]).toBe(100); // stored value, clamped from 500 to 100
      expect(insertArgs[6]).toBe(0); // final_price derived from the clamped (100%) discount
    });

    test('clamps an out-of-range percent value on update before it is stored', async () => {
      await service.update(1, { value_type: 'percent', value: 500 }, 2);

      expect(repository.update).toHaveBeenCalledWith(
        1,
        ['percent', undefined, 100, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
        2,
        undefined
      );
    });

    test('leaves a fixed-type discount value untouched on create (clamp only applies to percent)', async () => {
      studentInCenter.mockResolvedValue(true);
      repository.insert.mockResolvedValue({ discount_id: 4 });

      await service.create({ student_id: 7, value_type: 'fixed', value: 500, original_price: 1000 }, 2);

      expect(repository.insert.mock.calls[0][0][4]).toBe(500);
    });

    test('the store path (create) and the read path (calculateDiscount) apply the identical clamp for the same raw value', async () => {
      // Read path: calculateDiscount clamps the raw value internally.
      const readResult = service.calculateDiscount(1000, 'percent', 500);
      expect(readResult.discountAmount).toBe(1000); // 500% clamped to 100%

      // Store path: create() clamps before persisting, storing 100 rather than 500.
      studentInCenter.mockResolvedValue(true);
      repository.insert.mockResolvedValue({ discount_id: 3 });
      await service.create({ student_id: 7, value_type: 'percent', value: 500, original_price: 1000 }, 2);
      const storedValue = repository.insert.mock.calls[0][0][4];
      expect(storedValue).toBe(100);

      // Re-running the read path on the now-clamped stored value reproduces the
      // exact same result as the original direct read-path call.
      expect(service.calculateDiscount(1000, 'percent', storedValue)).toEqual(readResult);
    });
  });
});
