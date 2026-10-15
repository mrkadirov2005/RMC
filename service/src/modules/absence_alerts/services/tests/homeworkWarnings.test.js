jest.mock('../../repositories/homeworkWarnings.repository', () => ({ findMonthHomework: jest.fn() }));
jest.mock('../../../settings/services/settings.service', () => ({ getLessonScoring: jest.fn() }));

const repository = require('../../repositories/homeworkWarnings.repository');
const settingsService = require('../../../settings/services/settings.service');
const { findHomeworkWarnings, listHomeworkWarnings } = require('../homeworkWarnings.service');

const lesson = (studentId, date, homework, attendance = 40, extra = {}) => ({
  student_id: studentId, first_name: `S${studentId}`, last_name: 'Ali', class_id: 10, class_name: 'G10', center_id: 1,
  teacher_id: 5, teacher_name: 'Ustoz', session_date: date, attendance_score: attendance, homework_score: homework, ...extra,
});

const defaultScale = new Map([[1, { max: 20, labels: new Map([[20, 'Excellent'], [15, 'Good'], [10, 'Half'], [5, 'Weak'], [0, 'None']]) }]]);

describe('homework warnings', () => {
  it('warns about two or more lessons with homework not done or done partly, with each status', () => {
    const result = findHomeworkWarnings([
      lesson(1, '2026-10-09', 0), lesson(1, '2026-10-02', 10), lesson(1, '2026-10-05', 20),
      lesson(2, '2026-10-02', 10), lesson(2, '2026-10-05', 15),
    ], defaultScale);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ student_id: 1, student_name: 'Ali S1', class_id: 10, teacher_name: 'Ustoz' });
    expect(result[0].lessons).toEqual([
      { date: '2026-10-02', homework_score: 10, homework_label: 'Half' },
      { date: '2026-10-09', homework_score: 0, homework_label: 'None' },
    ]);
  });

  it('leaves out lessons the student missed, and counts each group on its own', () => {
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0, 0), lesson(1, '2026-10-05', 0)], defaultScale)).toEqual([]);
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0), lesson(1, '2026-10-05', 0, 40, { class_id: 11 })], defaultScale)).toEqual([]);
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0, null), lesson(1, '2026-10-05', 5)], defaultScale)).toHaveLength(1);
  });

  it("uses each center's own homework scale for the current Tashkent month", async () => {
    repository.findMonthHomework.mockResolvedValue([lesson(1, '2026-11-02', 30, 40, { center_id: 2 }), lesson(1, '2026-11-03', 25, 40, { center_id: 2 })]);
    settingsService.getLessonScoring.mockResolvedValue({ homework: [{ score: 50, label: 'Full' }, { score: 25, label: 'Partly' }] });
    const result = await listHomeworkWarnings({ centerId: 2, teacherId: 5 }, new Date('2026-10-31T20:00:00Z'));
    expect(repository.findMonthHomework).toHaveBeenCalledWith({ centerId: 2, teacherId: 5, monthStart: '2026-11-01', monthEnd: '2026-12-01' });
    expect(settingsService.getLessonScoring).toHaveBeenCalledWith(2);
    expect(result.month).toBe('2026-11');
    expect(result.students).toHaveLength(0);
  });
});
