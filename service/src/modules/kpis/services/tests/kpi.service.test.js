jest.mock('../../repositories/kpi.repository', () => ({
  findRecord: jest.fn(),
  upsertRecord: jest.fn(),
  listTeachers: jest.fn(),
  listRecordsForTeacher: jest.fn(),
  monthlyStudentScore: jest.fn(),
  monthlyRetentionCounts: jest.fn(),
}));
jest.mock('../../../teachers/services/teacher.service', () => ({ getTeacher: jest.fn() }));
jest.mock('../../../owners/services/owner.service', () => ({ getOwner: jest.fn() }));
jest.mock('../../../superusers/services/superuser.service', () => ({ getSuperuser: jest.fn() }));

const repository = require('../../repositories/kpi.repository');
const teacherService = require('../../../teachers/services/teacher.service');
const ownerService = require('../../../owners/services/owner.service');
const service = require('../kpi.service');

describe('kpi service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('retention score is 100 when the teacher had no students at the start of the month', async () => {
    repository.monthlyStudentScore.mockResolvedValue(80);
    repository.monthlyRetentionCounts.mockResolvedValue({ startCount: 0, leftCount: 0 });
    ownerService.getOwner.mockResolvedValue({ first_name: 'Ada', last_name: 'Owner' });
    repository.upsertRecord.mockImplementation((data) => data);

    const record = await service.upsertKpi({
      teacherId: 1,
      centerId: 2,
      kpiYear: 2026,
      kpiMonth: 8,
      contributionScore: 90,
      teachingQualityScore: 85,
      actingUser: { id: 5, role: 'owner', userType: 'superuser' },
    });

    expect(record.retentionScore).toBe(100);
  });

  test('retention score reflects retained-over-start ratio', async () => {
    repository.monthlyStudentScore.mockResolvedValue(80);
    repository.monthlyRetentionCounts.mockResolvedValue({ startCount: 10, leftCount: 2 });
    ownerService.getOwner.mockResolvedValue({ first_name: 'Ada', last_name: 'Owner' });
    repository.upsertRecord.mockImplementation((data) => data);

    const record = await service.upsertKpi({
      teacherId: 1,
      centerId: 2,
      kpiYear: 2026,
      kpiMonth: 8,
      contributionScore: 90,
      teachingQualityScore: 85,
      actingUser: { id: 5, role: 'owner', userType: 'superuser' },
    });

    expect(record.retentionScore).toBe(80);
  });

  test('final score is the average of all four categories', async () => {
    repository.monthlyStudentScore.mockResolvedValue(60);
    repository.monthlyRetentionCounts.mockResolvedValue({ startCount: 5, leftCount: 0 });
    ownerService.getOwner.mockResolvedValue({ first_name: 'Ada', last_name: 'Owner' });
    repository.upsertRecord.mockImplementation((data) => data);

    const record = await service.upsertKpi({
      teacherId: 1,
      centerId: 2,
      kpiYear: 2026,
      kpiMonth: 8,
      contributionScore: 80,
      teachingQualityScore: 100,
      actingUser: { id: 5, role: 'owner', userType: 'superuser' },
    });

    // (60 student + 100 retention + 80 contribution + 100 teaching quality) / 4
    expect(record.studentScore).toBe(60);
    expect(record.retentionScore).toBe(100);
    expect(record.finalScore).toBe(85);
  });

  test('overview pairs each teacher with their existing record and a live auto-score preview', async () => {
    repository.listTeachers.mockResolvedValue([{ teacher_id: 1, first_name: 'Ada', last_name: 'Lovelace', center_id: 2 }]);
    repository.findRecord.mockResolvedValue(null);
    repository.monthlyStudentScore.mockResolvedValue(70);
    repository.monthlyRetentionCounts.mockResolvedValue({ startCount: 4, leftCount: 1 });

    const result = await service.getOverview({ centerId: 2, year: 2026, month: 8 });

    expect(result.teachers).toHaveLength(1);
    expect(result.teachers[0].kpi).toBeNull();
    expect(result.teachers[0].preview).toEqual({ student_score: 70, retention_score: 75 });
  });

  test('teacher detail lists only recorded months, no backfill', async () => {
    teacherService.getTeacher.mockResolvedValue({ teacher_id: 1, first_name: 'Ada', last_name: 'Lovelace' });
    repository.listRecordsForTeacher.mockResolvedValue([{ kpi_year: 2026, kpi_month: 7, final_score: 90 }]);
    repository.monthlyStudentScore.mockResolvedValue(50);
    repository.monthlyRetentionCounts.mockResolvedValue({ startCount: 0, leftCount: 0 });

    const detail = await service.getTeacherDetail({ teacherId: 1, centerId: 2 });

    expect(detail.history).toEqual([{ kpi_year: 2026, kpi_month: 7, final_score: 90 }]);
  });
});
