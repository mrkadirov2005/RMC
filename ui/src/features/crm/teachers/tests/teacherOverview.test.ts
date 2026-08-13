import { describe, expect, it } from 'vitest';
import { buildTeacherOverviewColumns, buildTeacherOverviewUpdate, createTeacherOverviewDraft, TEACHER_OVERVIEW_FIELDS } from '../teacherOverview';

describe('teacher overview editing', () => {
  it('prefills all editable teacher values and keeps system identifiers read-only', () => {
    const draft = createTeacherOverviewDraft({ first_name: 'Aziza', qualification: 'CELTA', salary_percentage: 45 });
    expect(draft).toMatchObject({ first_name: 'Aziza', qualification: 'CELTA', salary_percentage: '45' });
    expect(TEACHER_OVERVIEW_FIELDS['Employee ID']).toBeUndefined();
    expect(TEACHER_OVERVIEW_FIELDS['Center ID']).toBeUndefined();
  });

  it('builds two compact lists and a normalized update payload', () => {
    const columns = buildTeacherOverviewColumns({ first_name: 'Aziza', email: 'a@example.com' });
    expect(columns.main.some((row) => row.label === 'First name')).toBe(true);
    expect(columns.professional.some((row) => row.label === 'Email')).toBe(true);
    const draft = createTeacherOverviewDraft({ first_name: ' Aziza ', salary_percentage: 50 });
    expect(buildTeacherOverviewUpdate(draft)).toMatchObject({ first_name: 'Aziza', salary_percentage: 50 });
  });
});
