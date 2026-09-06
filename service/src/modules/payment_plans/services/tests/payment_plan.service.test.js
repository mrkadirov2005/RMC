const mockClient = { __tag: 'tx-client' };

jest.mock('../../repositories/payment_plan.repository', () => ({
  findAllFiltered: jest.fn(), findPlanById: jest.fn(), findInstallments: jest.fn(), insertPlan: jest.fn(),
  insertInstallmentSimple: jest.fn(), updatePlan: jest.fn(), deleteInstallmentsByPlan: jest.fn(),
  insertInstallment: jest.fn(), deletePlan: jest.fn(), withTransaction: jest.fn(),
}));
jest.mock('../../../../shared/tenantDb', () => ({ studentInCenter: jest.fn() }));

const repository = require('../../repositories/payment_plan.repository');
const { studentInCenter } = require('../../../../shared/tenantDb');
const service = require('../payment_plan.service');

describe('payment plan service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.withTransaction.mockImplementation((callback) => callback(mockClient));
  });

  test('returns null for a missing plan and combines installments for an existing plan', async () => {
    repository.findPlanById.mockResolvedValueOnce(null);
    await expect(service.getWithInstallments(1, 2)).resolves.toBeNull();
    repository.findPlanById.mockResolvedValueOnce({ plan_id: 1 });
    repository.findInstallments.mockResolvedValue([{ amount: 500 }]);
    await expect(service.getWithInstallments(1, 2)).resolves.toEqual({ plan_id: 1, installments: [{ amount: 500 }] });
  });

  test('rejects a plan for a student outside the center', async () => {
    studentInCenter.mockResolvedValue(false);
    await expect(service.create({ student_id: 3 }, 2)).resolves.toEqual({ error: 'invalid_center' });
  });

  test('creates plan and installments with center and currency defaults', async () => {
    studentInCenter.mockResolvedValue(true);
    repository.insertPlan.mockResolvedValue({ plan_id: 7 });
    await service.create({
      student_id: 3, center_id: 99, name: 'Term', total_amount: 1000, start_date: '2026-08-01',
      installments: [{ due_date: '2026-08-15', amount: 500 }, { due_date: '2026-09-15', amount: 500 }],
    }, 2);
    expect(repository.insertPlan).toHaveBeenCalledWith([3, 2, 'Term', 1000, 'UZS', '2026-08-01', null], mockClient);
    expect(repository.insertInstallmentSimple).toHaveBeenCalledTimes(2);
  });

  test('replaces installments only after a successful scoped plan update', async () => {
    repository.findPlanById.mockResolvedValue({ plan_id: 7, total_amount: 500 });
    repository.updatePlan.mockResolvedValue({ plan_id: 7 });
    await service.update(7, { installments: [{ due_date: '2026-09-15', amount: 500, status: 'Pending' }] }, 2);
    expect(repository.deleteInstallmentsByPlan).toHaveBeenCalledWith(7, mockClient);
    expect(repository.insertInstallment).toHaveBeenCalledWith(7, '2026-09-15', 500, 'Pending', mockClient);
  });

  // RMC-068: total_amount must equal the sum of the submitted installment amounts.
  describe('installment sum invariant', () => {
    test('rejects create when total_amount does not equal the sum of installment amounts', async () => {
      studentInCenter.mockResolvedValue(true);

      const result = await service.create({
        student_id: 3, center_id: 99, name: 'Term', total_amount: 1000, start_date: '2026-08-01',
        installments: [{ due_date: '2026-08-15', amount: 500 }, { due_date: '2026-09-15', amount: 400 }],
      }, 2);

      expect(result).toEqual({ error: 'installment_sum_mismatch' });
      expect(repository.withTransaction).not.toHaveBeenCalled();
      expect(repository.insertPlan).not.toHaveBeenCalled();
    });

    test('accepts create when total_amount equals the sum of installment amounts within rounding tolerance', async () => {
      studentInCenter.mockResolvedValue(true);
      repository.insertPlan.mockResolvedValue({ plan_id: 8 });

      const result = await service.create({
        student_id: 3, center_id: 99, name: 'Term', total_amount: 900.005, start_date: '2026-08-01',
        installments: [{ due_date: '2026-08-15', amount: 450 }, { due_date: '2026-09-15', amount: 450 }],
      }, 2);

      expect(result).toEqual({ plan: { plan_id: 8 } });
      expect(repository.insertPlan).toHaveBeenCalled();
    });

    test('rejects update when a new installment array no longer sums to total_amount', async () => {
      repository.findPlanById.mockResolvedValue({ plan_id: 7, total_amount: 1000 });

      const result = await service.update(7, {
        installments: [{ due_date: '2026-09-15', amount: 500, status: 'Pending' }],
      }, 2);

      expect(result).toEqual({ error: 'installment_sum_mismatch' });
      expect(repository.withTransaction).not.toHaveBeenCalled();
      expect(repository.updatePlan).not.toHaveBeenCalled();
    });

    test('validates the sum against an explicitly-updated total_amount rather than the stale stored one', async () => {
      repository.findPlanById.mockResolvedValue({ plan_id: 7, total_amount: 1000 });
      repository.updatePlan.mockResolvedValue({ plan_id: 7 });

      const result = await service.update(7, {
        total_amount: 500,
        installments: [{ due_date: '2026-09-15', amount: 500, status: 'Pending' }],
      }, 2);

      expect(result).toEqual({ plan_id: 7 });
      expect(repository.updatePlan).toHaveBeenCalled();
    });
  });

  // RMC-068: create()'s plan insert + installment inserts run inside a single
  // withTransaction call, so a mid-loop failure aborts the whole batch rather
  // than leaving an orphan plan with only some installments written.
  test('a failure partway through installment writes aborts the transaction, leaving no orphan plan', async () => {
    studentInCenter.mockResolvedValue(true);
    repository.insertPlan.mockResolvedValue({ plan_id: 9 });
    repository.insertInstallmentSimple
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('installment write failed'));

    await expect(service.create({
      student_id: 3, center_id: 99, name: 'Term', total_amount: 1000, start_date: '2026-08-01',
      installments: [
        { due_date: '2026-08-15', amount: 500 },
        { due_date: '2026-09-15', amount: 500 },
        { due_date: '2026-10-15', amount: 0 },
      ],
    }, 2)).rejects.toThrow('installment write failed');

    // Only one withTransaction call wraps the plan insert and both installment
    // attempts; the third installment is never attempted once the second fails,
    // and the error propagates out of the transaction callback (real DB rollback).
    expect(repository.withTransaction).toHaveBeenCalledTimes(1);
    expect(repository.insertInstallmentSimple).toHaveBeenCalledTimes(2);
  });
});
