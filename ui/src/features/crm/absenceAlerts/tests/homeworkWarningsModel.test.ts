import { describe, expect, it } from 'vitest';
import { filterHomeworkWarnings, homeworkStatusLabel, homeworkWarningOptions, type HomeworkWarning } from '../homeworkWarningsModel';

const warning = (id: number, name: string, classId: number, labels: string[]): HomeworkWarning => ({
  student_id: id, student_name: name, phone: null, parent_name: null, parent_phone: null,
  class_id: classId, class_name: `G${classId}`, teacher_name: null,
  lessons: labels.map((label, index) => ({ date: `2026-10-0${index + 1}`, homework_score: 0, homework_label: label })),
});

const warnings = [warning(1, 'Valiyev Ali', 10, ['None', 'Half']), warning(2, 'Isomova Ziyoda', 20, ['Weak', 'Weak'])];
const none = { search: '', classId: null, status: '' };

describe('homework warnings', () => {
  it('filters by student name, group and homework status', () => {
    expect(filterHomeworkWarnings(warnings, none)).toHaveLength(2);
    expect(filterHomeworkWarnings(warnings, { ...none, search: 'ziyo' }).map((item) => item.student_id)).toEqual([2]);
    expect(filterHomeworkWarnings(warnings, { ...none, classId: 10 }).map((item) => item.student_id)).toEqual([1]);
    expect(filterHomeworkWarnings(warnings, { ...none, status: 'None' }).map((item) => item.student_id)).toEqual([1]);
    expect(filterHomeworkWarnings(warnings, { ...none, classId: 20, status: 'None' })).toEqual([]);
  });

  it('lists the groups and statuses to filter by, in Uzbek', () => {
    expect(homeworkWarningOptions(warnings)).toEqual({ groups: [{ id: 10, name: 'G10' }, { id: 20, name: 'G20' }], statuses: ['None', 'Half', 'Weak'] });
    expect(['None', 'Half', 'Weak', 'Chala', null].map(homeworkStatusLabel)).toEqual(['Bajarilmagan', 'Yarmi bajarilgan', 'Sust', 'Chala', '—']);
  });
});
