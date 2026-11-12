jest.mock('../../repositories/retentionBreakdown.repository', () => ({
  findLeavers: jest.fn(),
  studentsPerTeacher: jest.fn(),
  findNewStudents: jest.fn(),
}));

const repository = require('../../repositories/retentionBreakdown.repository');
const { breakdown, categoryOf, rankTeachersByLoss, CATEGORY_ORDER } = require('../retentionBreakdown.service');

describe('retention by the five leaving groups', () => {
  test('sorts each student who left into one group', () => {
    expect(categoryOf({ status: 'Transferred', lessons_attended: 1 })).toBe('transfer');
    expect(categoryOf({ status: 'Inactive', reason_code: 'finished_successfully', lessons_attended: 40 })).toBe('graduated');
    expect(categoryOf({ status: 'Inactive', lessons_attended: 2, group_started_on: '2025-01-01', left_on: '2026-10-10' })).toBe('trial');
    expect(categoryOf({ status: 'Inactive', lessons_attended: 6, group_started_on: '2026-10-01', left_on: '2026-10-20' })).toBe('new_group');
    expect(categoryOf({ status: 'Inactive', lessons_attended: 30, group_started_on: '2026-03-01', left_on: '2026-10-20' })).toBe('long_term');
    expect(CATEGORY_ORDER).toEqual(['trial', 'new_group', 'long_term', 'graduated', 'transfer']);
  });

  test('ranks teachers by the share lost; graduates and transfers never count against them', () => {
    const ranking = rankTeachersByLoss([
      { teacher_id: 1, teacher_name: 'A', category: 'trial' },
      { teacher_id: 1, teacher_name: 'A', category: 'graduated' },
      { teacher_id: 1, teacher_name: 'A', category: 'transfer' },
      { teacher_id: 2, teacher_name: 'B', category: 'long_term' },
      { teacher_id: 2, teacher_name: 'B', category: 'new_group' },
    ], [{ teacher_id: 1, teacher_name: 'A', students: 10 }, { teacher_id: 2, teacher_name: 'B', students: 40 }, { teacher_id: 3, teacher_name: 'C', students: 5 }]);
    expect(ranking.map((row) => [row.teacher_name, row.lost, row.lost_percent, row.place])).toEqual([
      ['A', 1, 10, 1],
      ['B', 2, 5, 2],
      ['C', 0, 0, 3],
    ]);
  });

  test('admissions balance: new students against those who left the center, transfers on neither side', async () => {
    repository.findLeavers.mockResolvedValue([
      { status: 'Inactive', lessons_attended: 1, teacher_id: 1, teacher_name: 'A', left_on: '2026-10-05' },
      { status: 'Inactive', reason_code: 'graduated', lessons_attended: 50, teacher_id: 1, teacher_name: 'A', left_on: '2026-10-06' },
      { status: 'Transferred', lessons_attended: 9, teacher_id: 1, teacher_name: 'A', left_on: '2026-10-07' },
    ]);
    repository.studentsPerTeacher.mockResolvedValue([{ teacher_id: 1, teacher_name: 'A', students: 20 }]);
    repository.findNewStudents.mockResolvedValue([
      { student_id: 1, teacher_id: 1, teacher_name: 'A', referred_by_teacher_id: 1 },
      { student_id: 2, teacher_id: 1, teacher_name: 'A', referred_by_teacher_id: null },
      { student_id: 3, teacher_id: 1, teacher_name: 'A', referred_by_teacher_id: null },
      { student_id: 4, teacher_id: 2, teacher_name: 'B', referred_by_teacher_id: 2 },
    ]);
    const result = await breakdown({ month: '2026-10', teacher_id: '1', subject: ' English ', level_id: '7' }, 3);
    expect(repository.findLeavers).toHaveBeenCalledWith({ centerId: 3, start: '2026-10-01', end: '2026-10-31', teacherId: 1, subject: 'English', levelId: 7 });
    expect(result.categories.map((c) => [c.key, c.count])).toEqual([['trial', 1], ['new_group', 0], ['long_term', 0], ['graduated', 1], ['transfer', 1]]);
    expect(result.summary).toEqual({ lost: 1, graduated: 1, transfers: 1, left: 3 });
    expect(result.admissions).toMatchObject({ new_students: 4, left_center: 2, balance: 2, came_for_teacher: 2, came_for_center: 2 });
    expect(result.admissions.by_teacher.map((t) => [t.teacher_name, t.admitted, t.came_for_teacher])).toEqual([['A', 3, 1], ['B', 1, 1]]);
  });
});
