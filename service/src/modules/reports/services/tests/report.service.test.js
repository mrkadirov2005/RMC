jest.mock('../../repositories/report.repository', () => ({
  countStudents: jest.fn(), countTeachers: jest.fn(), countClasses: jest.fn(), sumPayments: jest.fn(), sumDebts: jest.fn(),
  paymentsByMonth: jest.fn(), paymentsAggregate: jest.fn(), attendanceByStatus: jest.fn(),
  countDeletedStudents: jest.fn(), deletedStudentsByMonth: jest.fn(), deletedStudentsByTeacherWithStudents: jest.fn(),
  deletedStudentsByClass: jest.fn(), recentDeletedStudents: jest.fn(), countIntakeStudents: jest.fn(),
  intakeStudentsByMonth: jest.fn(), intakeStudentsByTeacherWithStudents: jest.fn(), intakeStudentsByClass: jest.fn(), recentIntakeStudents: jest.fn(),
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
    repository.deletedStudentsByTeacherWithStudents.mockResolvedValue([]); repository.deletedStudentsByClass.mockResolvedValue([]); repository.recentDeletedStudents.mockResolvedValue([]);
    const result = await service.retentionReport({ month: '2026-08', months: '6' }, 2);
    expect(result.period.selected_month).toBe('2026-08'); expect(result.monthly).toHaveLength(6);
    expect(result.summary).toMatchObject({ current_month_left: 4, previous_month_left: 2, delta: 2, delta_percent: 100, trend: 'up' });
  });

  // RMC-088: fixture-based aggregate correctness -- assert the *actual computed numbers* for a
  // fixed, hand-checked fixture, not just "resolves to something".
  describe('fixture-based aggregate correctness', () => {
    test('overview combines all five metrics and the requested date period exactly, with no cross-contamination between fields', async () => {
      repository.countStudents.mockResolvedValue({ total: 120, active: 100 });
      repository.countTeachers.mockResolvedValue({ total: 15 });
      repository.countClasses.mockResolvedValue({ total: 20 });
      repository.sumPayments.mockResolvedValue({ total_revenue: '4500000', payments_count: 30 });
      repository.sumDebts.mockResolvedValue({ total_outstanding: '250000' });

      const result = await service.overview({ start_date: '2026-01-01', end_date: '2026-01-31' }, 3);

      expect(result).toEqual({
        students: { total: 120, active: 100 },
        teachers: { total: 15 },
        classes: { total: 20 },
        payments: { total_revenue: '4500000', payments_count: 30 },
        debts: { total_outstanding: '250000' },
        period: { start_date: '2026-01-01', end_date: '2026-01-31' },
      });
      // debts is a point-in-time balance, not a period sum -- it must not receive the date filter
      expect(repository.sumDebts).toHaveBeenCalledWith({ centerId: 3 });
      expect(repository.sumPayments).toHaveBeenCalledWith({ centerId: 3, start: '2026-01-01', end: '2026-01-31' });
    });

    test('payments report aggregate mode returns the exact fixture numbers', async () => {
      repository.paymentsAggregate.mockResolvedValue({ payments_count: 12, total_amount: '735000.50' });

      await expect(service.paymentsReport({}, 4)).resolves.toEqual({
        mode: 'single',
        row: { payments_count: 12, total_amount: '735000.50' },
      });
    });

    test('payments report monthly mode returns each month row unmodified and in the order the repository returns them', async () => {
      const rows = [
        { year: 2026, month: 1, payments_count: 5, total_amount: '100000' },
        { year: 2025, month: 12, payments_count: 7, total_amount: '150000' },
      ];
      repository.paymentsByMonth.mockResolvedValue(rows);

      await expect(service.paymentsReport({ group_by: 'month' }, 4)).resolves.toEqual({ mode: 'rows', rows });
    });

    test('attendance report passes through the exact per-status counts for the requested class/date scope', async () => {
      const fixture = [
        { status: 'Present', count: 42 },
        { status: 'Absent', count: 5 },
        { status: 'Late', count: 3 },
      ];
      repository.attendanceByStatus.mockResolvedValue(fixture);

      const result = await service.attendanceReport({ class_id: '7', start_date: '2026-01-01', end_date: '2026-01-31' }, 4);

      expect(repository.attendanceByStatus).toHaveBeenCalledWith({ centerId: 4, classId: 7, start: '2026-01-01', end: '2026-01-31' });
      expect(result).toEqual(fixture);
    });
  });

  // RMC-050/RMC-088: the per-teacher retention aggregation (left_count, class_count, and the
  // json_agg'd student list) now happens in SQL inside deletedStudentsByTeacherWithStudents /
  // intakeStudentsByTeacherWithStudents. This pins the service's consumption of that aggregate
  // shape against a fixed, hand-computed fixture -- including the teacher-with-no-assigned-class
  // ("No teacher") fallback and a teacher who genuinely has students attached.
  describe('retention report by-teacher aggregation (RMC-050)', () => {
    test('deleted-students view: maps each SQL-aggregated teacher row to the exact expected shape', async () => {
      repository.countDeletedStudents.mockResolvedValueOnce({ total: 3 }).mockResolvedValueOnce({ total: 1 });
      repository.deletedStudentsByMonth.mockResolvedValue([
        { month_start: '2026-03-01', left_count: 1 },
        { month_start: '2026-08-01', left_count: 3 },
      ]);
      repository.deletedStudentsByTeacherWithStudents.mockResolvedValue([
        {
          teacher_id: 5,
          teacher_first_name: 'Ada',
          teacher_last_name: 'Lovelace',
          employee_id: 'T-5',
          left_count: 2,
          latest_deleted_at: '2026-08-15T00:00:00.000Z',
          class_count: 1,
          students: [
            { student_id: 11, first_name: 'Sam', last_name: 'Doe', deleted_at: '2026-08-15T00:00:00.000Z' },
            { student_id: 12, first_name: 'Alex', last_name: 'Roe', deleted_at: '2026-08-10T00:00:00.000Z' },
          ],
        },
        {
          teacher_id: null,
          teacher_first_name: null,
          teacher_last_name: null,
          employee_id: null,
          left_count: 1,
          latest_deleted_at: '2026-08-05T00:00:00.000Z',
          class_count: 1,
          students: [{ student_id: 13, first_name: 'Ray', last_name: 'Kim', deleted_at: '2026-08-05T00:00:00.000Z' }],
        },
      ]);
      repository.deletedStudentsByClass.mockResolvedValue([]);
      repository.recentDeletedStudents.mockResolvedValue([]);

      const result = await service.retentionReport({ month: '2026-08', months: '6' }, 2);

      expect(result.view).toBe('retention');
      expect(result.by_teacher).toEqual([
        {
          teacher_id: 5,
          teacher_first_name: 'Ada',
          teacher_last_name: 'Lovelace',
          employee_id: 'T-5',
          latest_deleted_at: '2026-08-15T00:00:00.000Z',
          teacher_name: 'Ada Lovelace',
          left_count: 2,
          class_count: 1,
          students: [
            { student_id: 11, first_name: 'Sam', last_name: 'Doe', deleted_at: '2026-08-15T00:00:00.000Z' },
            { student_id: 12, first_name: 'Alex', last_name: 'Roe', deleted_at: '2026-08-10T00:00:00.000Z' },
          ],
        },
        {
          teacher_id: null,
          teacher_first_name: null,
          teacher_last_name: null,
          employee_id: null,
          latest_deleted_at: '2026-08-05T00:00:00.000Z',
          teacher_name: 'No teacher',
          left_count: 1,
          class_count: 1,
          students: [{ student_id: 13, first_name: 'Ray', last_name: 'Kim', deleted_at: '2026-08-05T00:00:00.000Z' }],
        },
      ]);

      // 6-month series (Mar..Aug 2026) correctly buckets the two non-zero months and zero-fills the rest
      expect(result.monthly.map(({ month, left_count }) => ({ month, left_count }))).toEqual([
        { month: '2026-03', left_count: 1 },
        { month: '2026-04', left_count: 0 },
        { month: '2026-05', left_count: 0 },
        { month: '2026-06', left_count: 0 },
        { month: '2026-07', left_count: 0 },
        { month: '2026-08', left_count: 3 },
      ]);
      // current=3, previous=1 -> delta=2, delta_percent=round(2/1*1000)/10=200, trend up
      expect(result.summary).toEqual({ current_month_left: 3, previous_month_left: 1, delta: 2, delta_percent: 200, trend: 'up' });
    });

    test('intake view: routes to the intake-specific repository functions and applies the same teacher mapping', async () => {
      repository.countIntakeStudents.mockResolvedValueOnce({ total: 6 }).mockResolvedValueOnce({ total: 6 });
      repository.intakeStudentsByMonth.mockResolvedValue([]);
      repository.intakeStudentsByTeacherWithStudents.mockResolvedValue([
        {
          teacher_id: 9,
          teacher_first_name: 'Grace',
          teacher_last_name: 'Hopper',
          employee_id: 'T-9',
          left_count: 6,
          latest_deleted_at: '2026-08-20T00:00:00.000Z',
          class_count: 2,
          students: [{ student_id: 21, first_name: 'New', last_name: 'Kid', created_at: '2026-08-20T00:00:00.000Z' }],
        },
      ]);
      repository.intakeStudentsByClass.mockResolvedValue([]);
      repository.recentIntakeStudents.mockResolvedValue([]);

      const result = await service.retentionReport({ month: '2026-08', months: '6', view: 'intake' }, 2);

      expect(result.view).toBe('intake');
      expect(result.by_teacher).toEqual([
        {
          teacher_id: 9,
          teacher_first_name: 'Grace',
          teacher_last_name: 'Hopper',
          employee_id: 'T-9',
          latest_deleted_at: '2026-08-20T00:00:00.000Z',
          teacher_name: 'Grace Hopper',
          left_count: 6,
          class_count: 2,
          students: [{ student_id: 21, first_name: 'New', last_name: 'Kid', created_at: '2026-08-20T00:00:00.000Z' }],
        },
      ]);
      // no delta between current/previous (6 vs 6) -> flat trend, 0 delta_percent
      expect(result.summary).toMatchObject({ current_month_left: 6, previous_month_left: 6, delta: 0, delta_percent: 0, trend: 'flat' });
      // proves the intake-specific repository functions were used, not the deleted-student ones
      expect(repository.deletedStudentsByTeacherWithStudents).not.toHaveBeenCalled();
      expect(repository.countDeletedStudents).not.toHaveBeenCalled();
    });
  });
});
