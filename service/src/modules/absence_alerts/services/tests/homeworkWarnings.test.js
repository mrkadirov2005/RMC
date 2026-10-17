jest.mock('../../repositories/homeworkWarnings.repository', () => ({ findMonthHomework: jest.fn() }));
jest.mock('../../../settings/services/settings.service', () => ({ getLessonScoring: jest.fn() }));

const repository = require('../../repositories/homeworkWarnings.repository');
const settingsService = require('../../../settings/services/settings.service');
const { findHomeworkWarnings, listHomeworkWarnings } = require('../homeworkWarnings.service');

const lesson = (studentId, date, homework, attendance = 40, extra = {}) => ({
  student_id: studentId, first_name: `S${studentId}`, last_name: 'Ali', class_id: 10, class_name: 'G10', center_id: 1,
  teacher_id: 5, teacher_name: 'Ustoz', session_date: date, attendance_score: attendance, homework_score: homework, ...good, ...extra,
});

const settings = {
  attendance: [{ score: 40 }, { score: 30 }, { score: 0 }],
  homework: [{ score: 20, label: 'Excellent' }, { score: 15, label: 'Good' }, { score: 10, label: 'Half' }, { score: 5, label: 'Weak' }, { score: 0, label: 'None' }],
  activity: [{ score: 40 }, { score: 20 }, { score: 0 }],
};
const defaultScale = new Map([[1, { homework: { max: 20, labels: new Map(settings.homework.map((o) => [o.score, o.label])) }, settings }]]);
const good = { activity_score: 40 };

describe('homework warnings', () => {
  it('warns about two or more lessons with homework not done or done partly, with each status', () => {
    const result = findHomeworkWarnings([
      lesson(1, '2026-10-09', 0), lesson(1, '2026-10-02', 10), lesson(1, '2026-10-05', 20),
      lesson(2, '2026-10-02', 10), lesson(2, '2026-10-05', 15),
    ], defaultScale);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ student_id: 1, student_name: 'Ali S1', class_id: 10, teacher_name: 'Ustoz' });
    expect(result[0].lessons).toEqual([
      { date: '2026-10-02', homework_score: 10, homework_label: 'Half', score_percent: 90, reasons: ['homework'] },
      { date: '2026-10-09', homework_score: 0, homework_label: 'None', score_percent: 80, reasons: ['homework'] },
    ]);
  });

  it('leaves out lessons the student missed, and counts each group on its own', () => {
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0, 0), lesson(1, '2026-10-05', 0)], defaultScale)).toEqual([]);
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0), lesson(1, '2026-10-05', 0, 40, { class_id: 11 })], defaultScale)).toEqual([]);
    expect(findHomeworkWarnings([lesson(1, '2026-10-02', 0, null), lesson(1, '2026-10-05', 5)], defaultScale)).toHaveLength(1);
  });

  it('flags lessons scored under 70%, counting a lesson with both problems once', () => {
    const result = findHomeworkWarnings([
      lesson(1, '2026-10-02', 15, 40, { activity_score: 0 }),
      lesson(1, '2026-10-05', 5, 30, { activity_score: 0 }),
      lesson(1, '2026-10-07', null, 40, { activity_score: null, points_score: 40 }),
      lesson(1, '2026-10-08', null, 40, { activity_score: null }),
      lesson(1, '2026-10-09', null, null, { activity_score: null }),
    ], defaultScale);
    expect(result[0].lessons).toEqual([
      { date: '2026-10-02', homework_score: 15, homework_label: 'Good', score_percent: 55, reasons: ['low_score'] },
      { date: '2026-10-05', homework_score: 5, homework_label: 'Weak', score_percent: 35, reasons: ['homework', 'low_score'] },
      { date: '2026-10-07', homework_score: null, homework_label: null, score_percent: 64, reasons: ['low_score'] },
    ]);
  });

  it("uses each center's own homework scale for the current Tashkent month", async () => {
    repository.findMonthHomework.mockResolvedValue([lesson(1, '2026-11-02', 30, 40, { center_id: 2 }), lesson(1, '2026-11-03', 26, 40, { center_id: 2 })]);
    settingsService.getLessonScoring.mockResolvedValue({ ...settings, homework: [{ score: 50, label: 'Full' }, { score: 25, label: 'Partly' }] });
    const result = await listHomeworkWarnings({ centerId: 2, teacherId: 5 }, new Date('2026-10-31T20:00:00Z'));
    expect(repository.findMonthHomework).toHaveBeenCalledWith({ centerId: 2, teacherId: 5, monthStart: '2026-11-01', monthEnd: '2026-12-01' });
    expect(settingsService.getLessonScoring).toHaveBeenCalledWith(2);
    expect(result.month).toBe('2026-11');
    expect(result.students).toHaveLength(0);
  });
});
