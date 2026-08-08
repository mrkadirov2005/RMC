jest.mock('../../repositories/report.repository', () => ({
  countStudents: jest.fn(), countTeachers: jest.fn(), countClasses: jest.fn(), sumPayments: jest.fn(), sumDebts: jest.fn(),
  paymentsByMonth: jest.fn(), paymentsAggregate: jest.fn(), attendanceByStatus: jest.fn(),
  countDeletedStudents: jest.fn(), deletedStudentsByMonth: jest.fn(), deletedStudentsByTeacher: jest.fn(),
  deletedStudentsByClass: jest.fn(), recentDeletedStudents: jest.fn(), countIntakeStudents: jest.fn(),
  intakeStudentsByMonth: jest.fn(), intakeStudentsByTeacher: jest.fn(), intakeStudentsByClass: jest.fn(), recentIntakeStudents: jest.fn(),
}));
const repository = require('../../repositories/report.repository');
const service = require('../report.service');

describe('report service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('builds center-forced overview with inclusive date filters', async () => {
    repository.countStudents.mockResolvedValue(5); repository.countTeachers.mockResolvedValue(2); repository.countClasses.mockResolvedValue(3);
    repository.sumPayments.mockResolvedValue(100); repository.sumDebts.mockResolvedValue(20);
    await expect(service.overview({ center_id: '99', start_date: '2026-01-01', end_date: '2026-01-31' }, 2)).resolves.toEqual({
      students: 5, teachers: 2, classes: 3, payments: 100, debts: 20,
      period: { start_date: '2026-01-01', end_date: '2026-01-31' },
    });
    expect(repository.sumPayments).toHaveBeenCalledWith({ centerId: 2, start: '2026-01-01', end: '2026-01-31' });
  });
  test('switches payment report between aggregate and monthly rows', async () => {
    repository.paymentsAggregate.mockResolvedValue({ total: 10 }); repository.paymentsByMonth.mockResolvedValue([{ month: '2026-01' }]);
    await expect(service.paymentsReport({}, 2)).resolves.toEqual({ mode: 'single', row: { total: 10 } });
    await expect(service.paymentsReport({ group_by: 'month' }, 2)).resolves.toEqual({ mode: 'rows', rows: [{ month: '2026-01' }] });
  });
  test('normalizes a six-month retention series and trend', async () => {
    repository.countDeletedStudents.mockResolvedValueOnce({ total: 4 }).mockResolvedValueOnce({ total: 2 });
    repository.deletedStudentsByMonth.mockResolvedValue([{ month_start: '2026-08-01', left_count: 4 }]);
    repository.deletedStudentsByTeacher.mockResolvedValue([]); repository.deletedStudentsByClass.mockResolvedValue([]); repository.recentDeletedStudents.mockResolvedValue([]);
    const result = await service.retentionReport({ month: '2026-08', months: '6' }, 2);
    expect(result.period.selected_month).toBe('2026-08'); expect(result.monthly).toHaveLength(6);
    expect(result.summary).toMatchObject({ current_month_left: 4, previous_month_left: 2, delta: 2, delta_percent: 100, trend: 'up' });
  });
});
