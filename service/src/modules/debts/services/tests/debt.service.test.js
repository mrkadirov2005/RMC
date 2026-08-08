jest.mock('../../repositories/debt.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), insert: jest.fn(), findAmounts: jest.fn(), updatePaid: jest.fn(),
  findByStudent: jest.fn(), remove: jest.fn(), findActiveStudents: jest.fn(), findPaymentsForStudentInRange: jest.fn(),
  findOpenDebtsForStudent: jest.fn(), getStudentCenter: jest.fn(), paymentMonthlySummary: jest.fn(), debtAggregate: jest.fn(),
}));

const repository = require('../../repositories/debt.repository');
const service = require('../debt.service');

describe('debt service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calculates initial paid amount and balance', () => {
    service.createDebt({ student_id: 1, center_id: 2, debt_amount: '1000', debt_date: '2026-08-01', amount_paid: '250' });
    expect(repository.insert).toHaveBeenCalledWith([1, 2, '1000', '2026-08-01', undefined, '250', 750, undefined]);
  });

  test('returns null when updating a missing debt', async () => {
    repository.findAmounts.mockResolvedValue(null);
    await expect(service.updateDebt(1, { amount_paid: 20 }, 2, 3)).resolves.toBeNull();
  });

  test('preserves paid amount when omitted and recalculates balance', async () => {
    repository.findAmounts.mockResolvedValue({ debt_amount: '1000', amount_paid: '300' });
    await service.updateDebt(1, { remarks: 'Updated' }, 2, 3);
    expect(repository.updatePaid).toHaveBeenCalledWith(1, 300, 700, 'Updated', 2, 3);
  });

  test('analyzes paid and unpaid months with existing debt totals', async () => {
    repository.findActiveStudents.mockResolvedValue([{ student_id: 1, first_name: 'A', last_name: 'B', enrollment_number: 'E1', center_id: 2 }]);
    repository.findPaymentsForStudentInRange.mockResolvedValue([{ payment_date: '2026-01-10' }]);
    repository.findOpenDebtsForStudent.mockResolvedValue([{ balance: '125.50' }]);
    const result = await service.analyzeUnpaidMonths('2', '2026-01-01', '2026-03-31');
    expect(result.analysis_period.months_analyzed).toBe(3);
    expect(result.results[0]).toMatchObject({ unpaid_months_count: 2, total_payments: 1, total_debt_balance: 125.5 });
    expect(result.summary.total_unpaid_instances).toBe(2);
  });

  test('generates debt only for teacher-visible students and resolves their center', async () => {
    repository.getStudentCenter.mockResolvedValue(2);
    repository.findByStudent.mockResolvedValueOnce([]).mockResolvedValueOnce([{ student_id: 2 }]);
    repository.insert.mockResolvedValue({ debt_id: 9 });
    const result = await service.generateDebtsFromAnalysis([1, 2], 500, undefined, undefined, 4);
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert.mock.calls[0][0][0]).toBe(2);
    expect(result.createdDebts).toEqual([{ debt_id: 9 }]);
  });

  test('returns safe zero debt summary when aggregate is absent', async () => {
    repository.paymentMonthlySummary.mockResolvedValue([]);
    repository.debtAggregate.mockResolvedValue(null);
    await expect(service.getPaymentSummary(1)).resolves.toEqual({
      monthly_payments: [], debt_summary: { total_debt: 0, total_paid: 0, total_balance: 0 },
    });
  });
});
