import { describe, expect, it } from 'vitest';
import { getAssignableClasses } from '../groupsTabModel';

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
