import { describe, expect, it } from 'vitest';
import { resolveClassSubjects } from '../classSubjects';

describe('resolveClassSubjects', () => {
  it('uses subjects returned by the group subjects endpoint', () => {
    const rows = [{ subject_id: 3, subject_name: 'English' }];
    expect(resolveClassSubjects({ subject_name: 'Fallback' }, { data: rows })).toEqual(rows);
  });

  it('falls back to the subject included in the group response', () => {
    expect(resolveClassSubjects(
      { class_id: 12, subject_id: 3, subject_name: 'English' },
      { data: [] },
    )).toEqual([{ class_id: 12, subject_id: 3, subject_name: 'English' }]);
  });
});
