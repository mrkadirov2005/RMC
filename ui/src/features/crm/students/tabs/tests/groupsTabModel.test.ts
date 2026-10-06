import { describe, expect, it } from 'vitest';
import { getAssignableClasses, getAssignableTeachers, getTeacherClasses } from '../groupsTabModel';

describe('getAssignableClasses', () => {
  const classes = [
    { class_id: 3, class_name: 'Physics' },
    { class_id: 1, class_name: 'Math' },
    { class_id: 2, class_name: 'English' },
    { id: 4, class_name: 'Art' },
  ];

  it('leaves out the groups the child already attends and sorts by name', () => {
    const groups = [
      { student_id: 9, class_id: 1, status: 'Active' },
      { student_id: 10, class_id: 2, status: 'Active' },
    ];

    expect(getAssignableClasses(classes, groups).map((cls) => cls.class_name)).toEqual(['Art', 'Physics']);
  });

  it('offers a group again once the child was transferred out of it', () => {
    const groups = [{ student_id: 9, class_id: 3, status: 'Transferred' }];

    expect(getAssignableClasses(classes, groups).map((cls) => cls.class_name)).toContain('Physics');
  });
});

describe('choosing the teacher first', () => {
  const classes = [
    { class_id: 1, class_name: 'Math A', teacher_id: 7 },
    { class_id: 2, class_name: 'Math B', teacher_id: 7 },
    { class_id: 3, class_name: 'English', teacher_id: 8 },
    { class_id: 4, class_name: 'Art' },
  ];
  const teachers = [
    { teacher_id: 8, first_name: 'Zarina', last_name: 'K' },
    { teacher_id: 7, first_name: 'Ibrohim', last_name: 'M' },
    { teacher_id: 9, first_name: 'Nobody', last_name: 'Free' },
  ];

  it('lists only teachers with a group to join, by name, and groups with no teacher last', () => {
    expect(getAssignableTeachers(classes, teachers)).toEqual([
      { id: 7, name: 'Ibrohim M', groups: 2 },
      { id: 8, name: 'Zarina K', groups: 1 },
      { id: 0, name: '', groups: 1 },
    ]);
  });

  it("lists the chosen teacher's groups", () => {
    expect(getTeacherClasses(classes, 7).map((cls) => cls.class_name)).toEqual(['Math A', 'Math B']);
    expect(getTeacherClasses(classes, 0).map((cls) => cls.class_name)).toEqual(['Art']);
  });
});
