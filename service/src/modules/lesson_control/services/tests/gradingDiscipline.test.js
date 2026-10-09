const { expectedLessons, evaluate, deadlineOf } = require('../gradingDiscipline');

const a2 = { class_id: 1, class_name: 'A2 plus', teacher_id: 7, section: JSON.stringify({ days: ['Monday', 'Wednesday', 'Friday'], time: '10:00', endTime: '11:30' }) };

describe('scoring discipline', () => {
  it('expects lessons on the schedule days, minus days off, with approved moves', () => {
    const lessons = expectedLessons([a2], '2026-10-05', '2026-10-11',
      [{ off_date: '2026-10-09', class_id: null }],
      [{ class_id: 1, original_date: '2026-10-07', new_date: '2026-10-11', new_time: '15:00' }]);
    expect(lessons.map((lesson) => `${lesson.date} ${lesson.start}`)).toEqual(['2026-10-05 10:00', '2026-10-11 15:00']);
  });

  it('ignores groups without a schedule, and a day off for another group', () => {
    expect(expectedLessons([{ ...a2, section: null }], '2026-10-05', '2026-10-11', [], [])).toEqual([]);
    expect(expectedLessons([a2], '2026-10-05', '2026-10-05', [{ off_date: '2026-10-05', class_id: 2 }], [])).toHaveLength(1);
  });

  it('gives two hours from the start of the lesson, within the day', () => {
    expect(deadlineOf({ date: '2026-10-05', start: '10:00' })).toBe('2026-10-05 12:00');
    expect(deadlineOf({ date: '2026-10-05', start: '22:30' })).toBe('2026-10-05 23:59');
  });

  it('marks on time, late, missing and pending, and scores -5 each', () => {
    const lessons = expectedLessons([a2], '2026-10-05', '2026-10-09', [], []);
    const result = evaluate(lessons, [
      { class_id: 1, session_date: '2026-10-05', first_graded: '2026-10-05 11:40' },
      { class_id: 1, session_date: '2026-10-07', first_graded: '2026-10-07 18:00' },
    ], '2026-10-09 11:00', false);
    expect(result.lessons.map((lesson) => lesson.status)).toEqual(['on_time', 'late', 'pending']);
    expect(result.summary).toEqual({ due: 2, on_time: 1, late: 1, missing: 0, pending: 1, points: -5, bonus: 0 });
    expect(evaluate(lessons, [], '2026-10-09 13:00', false).summary).toMatchObject({ missing: 3, points: -15 });
  });

  it('awards 10 only for a finished month with every lesson on time', () => {
    const lessons = expectedLessons([a2], '2026-10-05', '2026-10-05', [], []);
    const onTime = [{ class_id: 1, session_date: '2026-10-05', first_graded: '2026-10-05 10:30' }];
    expect(evaluate(lessons, onTime, '2026-11-01 09:00', true).summary).toMatchObject({ points: 10, bonus: 10 });
    expect(evaluate(lessons, onTime, '2026-10-06 09:00', false).summary).toMatchObject({ points: 0, bonus: 0 });
  });
});

describe('fair start', () => {
  it('does not expect lessons before the group started', () => {
    const lessons = expectedLessons([{ ...a2, starts_on: '2026-10-07' }], '2026-10-05', '2026-10-09', [], []);
    expect(lessons.map((lesson) => lesson.date)).toEqual(['2026-10-07', '2026-10-09']);
  });
});
