jest.mock('../../repositories/salary.repository', () => ({
  insertAdvance: jest.fn(),
  deleteAdvance: jest.fn(),
  findRecord: jest.fn(),
  upsertRecord: jest.fn(),
  updateRecord: jest.fn(),
  listAdvances: jest.fn(),
  sumAdvances: jest.fn((rows) => rows.reduce((total, row) => total + Number(row.amount), 0)),
  syncSalaryExpense: jest.fn(),
  findTeacherRate: jest.fn(),
  findEarningPayments: jest.fn(),
}));
jest.mock('../../../teachers/services/teacher.service', () => ({ getTeacher: jest.fn() }));
jest.mock('../../../owners/services/owner.service', () => ({ getOwner: jest.fn() }));
jest.mock('../../../superusers/services/superuser.service', () => ({ getSuperuser: jest.fn() }));

const salaryRepository = require('../../repositories/salary.repository');
const teacherService = require('../../../teachers/services/teacher.service');
const superuserService = require('../../../superusers/services/superuser.service');
const salaryService = require('../salary.service');

describe('salary advances and the kassa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    teacherService.getTeacher.mockResolvedValue({ first_name: 'Ali', last_name: 'Valiyev' });
    superuserService.getSuperuser.mockResolvedValue({ first_name: 'Jane', last_name: 'Doe' });
    salaryRepository.insertAdvance.mockResolvedValue({ advance_id: 1 });
    salaryRepository.findRecord.mockResolvedValue(null);
    salaryRepository.listAdvances.mockResolvedValue([]);
    salaryRepository.findTeacherRate.mockResolvedValue('50');
    // 2 000 000 came in: the salary by rate is 1 000 000.
    salaryRepository.findEarningPayments.mockResolvedValue([{ payment_id: 1, student_id: 1, amount: '2000000', late: false }]);
  });

  const advance = (overrides = {}) => salaryService.addAdvance({
    teacherId: 7, salaryYear: 2026, salaryMonth: 10, amount: 300000, centerId: 2, actingUser: { id: 1, role: 'admin' }, ...overrides,
  });

  it('records the advance with a kassa expense from the till it was paid out of', async () => {
    await advance({ paymentMethod: 'Card', notes: 'rent' });

    const call = salaryRepository.insertAdvance.mock.calls[0][0];
    expect(call).toMatchObject({ teacherId: 7, amount: 300000, paymentMethod: 'Credit Card', givenByName: 'Jane Doe' });
    expect(call.expense).toMatchObject({ paymentMethod: 'Credit Card', description: 'Avans: Ali Valiyev — October 2026 (rent)' });
    expect(call.expense.expenseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('defaults to cash', async () => {
    await advance();
    expect(salaryRepository.insertAdvance.mock.calls[0][0].expense.paymentMethod).toBe('Cash');
  });

  it('refuses a method the kassa has no till for', async () => {
    expect(await advance({ paymentMethod: 'Other' })).toEqual({ error: 'invalid_method' });
    expect(salaryRepository.insertAdvance).not.toHaveBeenCalled();
  });

  describe('paying the salary', () => {
    const paid = (overrides = {}) => ({
      salary_id: 3, teacher_id: 7, center_id: 2, salary_year: 2026, salary_month: 9, amount: '1000000', is_paid: true, payment_method: 'Cash', expense_id: null, ...overrides,
    });
    const pay = (overrides = {}) => salaryService.markPaid({
      teacherId: 7, salaryYear: 2026, salaryMonth: 9, amount: 1000000, centerId: 2, paymentMethod: 'Cash', actingUser: { id: 1, role: 'admin' }, ...overrides,
    });

    it('counts the payout as a kassa expense named after the teacher and the month', async () => {
      salaryRepository.upsertRecord.mockResolvedValue(paid());

      await pay();

      expect(salaryRepository.syncSalaryExpense).toHaveBeenCalledWith(expect.objectContaining({
        salaryId: 3, amount: 1000000, paymentMethod: 'Cash', description: 'Maosh: Ali Valiyev — September 2026', createdByName: 'Jane Doe',
      }));
    });

    it('only counts what is left after the advances, which already left the kassa', async () => {
      salaryRepository.upsertRecord.mockResolvedValue(paid());
      salaryRepository.listAdvances.mockResolvedValue([{ amount: '300000' }, { amount: '200000' }]);

      await pay();

      expect(salaryRepository.syncSalaryExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 500000 }));
    });

    it('keeps the same expense when a paid salary is marked again', async () => {
      salaryRepository.upsertRecord.mockResolvedValue(paid({ expense_id: 55, amount: '1200000' }));

      await pay({ amount: 1200000 });

      expect(salaryRepository.syncSalaryExpense).toHaveBeenCalledWith(expect.objectContaining({ expenseId: 55, amount: 1200000 }));
    });

    it('takes the expense back out when the salary is un-marked', async () => {
      salaryRepository.updateRecord.mockResolvedValue(paid({ is_paid: false, expense_id: 55 }));

      await salaryService.updateSalaryRecord({ id: 3, patch: { is_paid: false }, centerId: 2, actingUser: { id: 1, role: 'admin' } });

      expect(salaryRepository.syncSalaryExpense).toHaveBeenCalledWith(expect.objectContaining({ expenseId: 55, amount: 0 }));
    });

    it('refuses a method the kassa has no till for', async () => {
      expect(await pay({ paymentMethod: 'Other' })).toEqual({ error: 'invalid_method' });
      expect(salaryRepository.upsertRecord).not.toHaveBeenCalled();
    });
  });
});
