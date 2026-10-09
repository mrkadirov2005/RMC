import { describe, expect, it } from 'vitest';
import { normalizePassport } from '../utils/studentFormOptions';
import { buildStudentOverviewRows } from '../studentOverview';

describe('student profile fields', () => {
  it('normalises a typed passport number to the server format', () => {
    expect(normalizePassport('aa 123 45 67')).toBe('AA1234567');
    expect(normalizePassport('AD-1234567-99')).toBe('AD1234567');
  });

  it('shows the passport row only when the server sent one (admins and the owner)', () => {
    const labels = (passport_number?: string) =>
      buildStudentOverviewRows({ student: { first_name: 'Ali', father_name: 'Vali', study_place_type: 'college', passport_number }, coinBalance: 0 }).map((row) => row.label);
    expect(labels('AA1234567')).toContain('Passport');
    expect(labels(undefined)).not.toContain('Passport');
    const rows = buildStudentOverviewRows({ student: { father_name: 'Vali', study_place_type: 'college' }, coinBalance: 0 });
    expect(rows.find((row) => row.label === "Father's name")?.value).toBe('Vali');
    expect(rows.find((row) => row.label === 'Place of study')?.value).toBe('College');
  });
});
