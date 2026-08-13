import { describe, expect, it } from 'vitest';
import { buildStudentOverviewRows, buildStudentOverviewUpdate, createStudentOverviewDraft, splitStudentOverviewRows, STUDENT_OVERVIEW_EDIT_FIELDS } from '../studentOverview';

describe('student overview rows', () => {
  it('lists all available profile, enrollment, family, school, and account data', () => {
    const rows = buildStudentOverviewRows({
      student: {
        student_id: 12, first_name: 'Ali', last_name: 'Valiyev', status: 'Active', username: 'ali12',
        enrollment_number: 'ST-12', email: 'ali@example.com', phone: '555', date_of_birth: '2010-01-02',
        gender: 'Male', parent_name: 'Vali', parent_phone: '777', school_name: 'School 4', school_class: '8-A', center_id: 3,
      },
      groupName: 'B1 Intro', teacherName: 'Aziza Karimova', coinBalance: 25,
    });

    expect(Object.fromEntries(rows.map((row) => [row.label, row.value]))).toMatchObject({
      'First name': 'Ali', 'Last name': 'Valiyev', Status: 'Active', Group: 'B1 Intro',
      Teacher: 'Aziza Karimova', School: 'School 4', 'School class': '8-A', Coins: '25', 'Student ID': '12',
    });
  });

  it('uses readable placeholders for missing values', () => {
    const rows = buildStudentOverviewRows({ student: {}, coinBalance: 0 });
    expect(rows.find((row) => row.label === 'Teacher')?.value).toBe('-');
    expect(rows.find((row) => row.label === 'Coins')?.value).toBe('0');
  });

  it('splits the long overview into main and additional lists without losing fields', () => {
    const rows = buildStudentOverviewRows({ student: {}, coinBalance: 0 });
    const columns = splitStudentOverviewRows(rows);

    expect(columns.main.map((row) => row.label)).toContain('Teacher');
    expect(columns.additional.map((row) => row.label)).toContain('Parent phone');
    expect([...columns.main, ...columns.additional]).toHaveLength(rows.length);
  });

  it('prefills editable fields and trims them for the student update request', () => {
    const draft = createStudentOverviewDraft({ first_name: 'Ali', last_name: 'Valiyev', phone: '555' });
    expect(draft).toMatchObject({ first_name: 'Ali', last_name: 'Valiyev', phone: '555' });
    expect(buildStudentOverviewUpdate({ ...draft, first_name: ' Ali ' })).toMatchObject({ first_name: 'Ali' });
    expect(STUDENT_OVERVIEW_EDIT_FIELDS.Group).toBeUndefined();
    expect(STUDENT_OVERVIEW_EDIT_FIELDS.Teacher).toBeUndefined();
  });
});
