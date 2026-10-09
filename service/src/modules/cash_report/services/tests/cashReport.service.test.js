jest.mock('../../repositories/cashReport.repository', () => ({
  findPaymentsOn: jest.fn(),
  findExpenses: jest.fn(),
  insertExpense: jest.fn(async (row) => ({ expense_id: 1, ...row })),
  softDeleteExpense: jest.fn(),
}));

const repository = require('../../repositories/cashReport.repository');
const service = require('../cashReport.service');

describe('cash report service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('groups payment methods into cash, card, bank and other', () => {
    expect(['Cash', '', null, 'naqd'].map(service.methodGroup)).toEqual(['cash', 'cash', 'cash', 'cash']);
    expect(['Credit Card', 'Card', 'Digital Wallet'].map(service.methodGroup)).toEqual(['card', 'card', 'card']);
    expect(['Bank Transfer'].map(service.methodGroup)).toEqual(['bank']);
    expect(service.methodGroup('Check')).toBe('other');
  });

  it("totals the client's 9 October example: 4 mln in, 1 mln spent from cash, 3 mln left", async () => {
    repository.findPaymentsOn.mockResolvedValue([
      { payment_id: 3, amount: '500000', payment_method: 'Credit Card', last_name: 'Karimov', first_name: 'Ali', paid_at: '2026-10-09T05:00:00Z' },
      { payment_id: 1, amount: '2500000', payment_method: 'Cash', last_name: 'Axmadov', first_name: 'Alisher', received_by_name: 'Admin', paid_at: '2026-10-09T06:00:00Z' },
      { payment_id: 2, amount: '1000000', payment_method: 'Bank Transfer', last_name: 'Valiyev', first_name: 'Sardor', paid_at: '2026-10-09T04:00:00Z' },
    ]);
    repository.findExpenses.mockResolvedValue([{ expense_id: 9, amount: '1000000', payment_method: 'Cash', description: 'Farrosh uchun' }]);

    const report = await service.getDailyReport('2026-10-09', 4);

    expect(repository.findPaymentsOn).toHaveBeenCalledWith('2026-10-09', 4);
    expect(report.payments.map((row) => row.method_group)).toEqual(['cash', 'card', 'bank']);
    expect(report.payments[0]).toMatchObject({ student_name: 'Axmadov Alisher', amount: 2500000, received_by_name: 'Admin' });
    expect(report.income).toEqual({ cash: 2500000, card: 500000, bank: 1000000, other: 0, total: 4000000 });
    expect(report.expenses_total).toEqual({ cash: 1000000, card: 0, bank: 0, other: 0, total: 1000000 });
    expect(report.remaining).toEqual({ cash: 1500000, card: 500000, bank: 1000000, other: 0, total: 3000000 });
  });

  it('rejects a bad date without touching the database', async () => {
    expect(await service.getDailyReport('09.10.2026')).toEqual({ error: 'invalid_date' });
    expect(repository.findPaymentsOn).not.toHaveBeenCalled();
  });

  it('validates an expense and stores the method in the payments vocabulary', async () => {
    const base = { expense_date: '2026-10-09', amount: 1000000, description: 'Farrosh uchun', payment_method: 'Karta' };
    expect(await service.createExpense({ ...base, amount: 0 }, 4, 'Admin')).toEqual({ error: 'invalid_amount' });
    expect(await service.createExpense({ ...base, description: '  ' }, 4, 'Admin')).toEqual({ error: 'invalid_description' });
    expect(await service.createExpense({ ...base, payment_method: 'Check' }, 4, 'Admin')).toEqual({ error: 'invalid_method' });
    expect(await service.createExpense({ ...base, expense_date: 'bad' }, 4, 'Admin')).toEqual({ error: 'invalid_date' });

    await service.createExpense(base, 4, 'Admin');
    expect(repository.insertExpense).toHaveBeenCalledWith({
      centerId: 4, expenseDate: '2026-10-09', amount: 1000000, paymentMethod: 'Credit Card', description: 'Farrosh uchun', createdByName: 'Admin',
    });
  });

  it('rejects a reversed expense range', async () => {
    expect(await service.listExpenses({ from: '2026-10-10', to: '2026-10-01' }, 4)).toEqual({ error: 'invalid_range' });
  });
});
