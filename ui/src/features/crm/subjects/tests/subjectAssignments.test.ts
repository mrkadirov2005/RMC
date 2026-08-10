import { describe, expect, it } from 'vitest';
import { countDuplicateClassSubjectAssignments } from '../subjectAssignments';
import { buildSubjectCatalog, getSubjectTeacherCount } from '../subjectCatalog';

describe('countDuplicateClassSubjectAssignments', () => {
  it('allows the same reusable subject to be assigned across multiple classes', () => {
    expect(countDuplicateClassSubjectAssignments([
      { subject_name: 'English', class_id: 10 },
      { subject_name: 'English', class_id: 11 },
      { subject_name: 'English', class_id: 12 },
    ])).toBe(0);
  });

  it('ignores unassigned catalog subjects', () => {
    expect(countDuplicateClassSubjectAssignments([
      { subject_name: 'English', class_id: null },
      { subject_name: 'Math' },
    ])).toBe(0);
  });

  it('counts only extra assignments belonging to the same class', () => {
    expect(countDuplicateClassSubjectAssignments([
      { subject_name: 'English', class_id: 10 },
      { subject_name: 'Math', class_id: 10 },
      { subject_name: 'English', class_id: 11 },
    ])).toBe(1);
  });
});

describe('buildSubjectCatalog', () => {
  it('shows one subject with every assigned group', () => {
    const catalog = buildSubjectCatalog([
      { subject_id: 1, subject_name: 'English', class_id: null },
      { subject_id: 2, subject_name: 'English', class_id: 10, teacher_id: 4 },
      { subject_id: 3, subject_name: 'english', class_id: 11, teacher_id: 5 },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].subject_id).toBe(1);
    expect(catalog[0].assignments.map((item: any) => item.class_id)).toEqual([10, 11]);
    expect(getSubjectTeacherCount(catalog[0])).toBe(2);
  });
});
