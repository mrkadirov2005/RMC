import { describe, expect, it } from 'vitest';
import { sortTeachers, teacherSortOptionsFor } from '../teacherSort';

const rows = [
  { name: 'Bobur', studentCount: 30, classCount: 2, subject: 'Math', salary: 40 },
  { name: 'Aziz', studentCount: 45, classCount: 3, subject: 'English', salary: null },
  { name: 'Dilnoza', studentCount: 30, classCount: 4, subject: null, salary: 50 },
];
const names = (sort: Parameters<typeof sortTeachers>[1]) => sortTeachers(rows, sort).map((row) => row.name);

describe('teacher sorting', () => {
  it('sorts by students, groups, subject, salary or name; ties and missing values by name', () => {
    expect(names('students')).toEqual(['Aziz', 'Bobur', 'Dilnoza']);
    expect(names('groups')).toEqual(['Dilnoza', 'Aziz', 'Bobur']);
    expect(names('subject')).toEqual(['Aziz', 'Bobur', 'Dilnoza']);
    expect(names('salary')).toEqual(['Dilnoza', 'Bobur', 'Aziz']);
    expect(names('name')).toEqual(['Aziz', 'Bobur', 'Dilnoza']);
  });

  it('does not change the list it was given', () => {
    sortTeachers(rows, 'groups');
    expect(rows.map((row) => row.name)).toEqual(['Bobur', 'Aziz', 'Dilnoza']);
  });

  it('offers salary only to someone who can see salaries', () => {
    expect(teacherSortOptionsFor(false).map((option) => option.value)).not.toContain('salary');
    expect(teacherSortOptionsFor(true).map((option) => option.value)).toContain('salary');
  });
});
