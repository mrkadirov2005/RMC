import { describe, expect, it } from 'vitest';
import { countDuplicateClassSubjectAssignments } from '../subjectAssignments';

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
