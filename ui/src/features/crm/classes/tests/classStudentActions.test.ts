import { describe, expect, it } from 'vitest';
import { getClassStudentId, removeClassStudentById } from '../classStudentActions';

describe('class student actions', () => {
  it('resolves either supported student identifier', () => {
    expect(getClassStudentId({ student_id: 12 })).toBe(12);
    expect(getClassStudentId({ id: 18 })).toBe(18);
    expect(getClassStudentId({})).toBe(0);
  });

  it('removes only the deleted student from the current class list', () => {
    const students = [
      { student_id: 12, status: 'Active' },
      { id: 18, status: 'Transferred' },
      { student_id: 24, status: 'Active' },
    ];

    expect(removeClassStudentById(students, 18)).toEqual([
      { student_id: 12, status: 'Active' },
      { student_id: 24, status: 'Active' },
    ]);
  });
});
