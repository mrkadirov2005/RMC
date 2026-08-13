import { describe, expect, it } from 'vitest';
import { getTeacherDisplayName } from '../utils/teacher';

describe('class teacher display name', () => {
  it('builds the teacher name returned by the teacher-id lookup', () => {
    expect(getTeacherDisplayName({ data: { first_name: 'Aziza', last_name: 'Karimova' } })).toBe('Aziza Karimova');
  });

  it('supports wrapped and already-combined teacher names', () => {
    expect(getTeacherDisplayName({ data: { teacher: { full_name: 'Jasur Aliyev' } } })).toBe('Jasur Aliyev');
  });

  it('returns an empty value for a missing teacher response', () => {
    expect(getTeacherDisplayName(null)).toBe('');
  });
});
