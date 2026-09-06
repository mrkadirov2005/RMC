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
});
