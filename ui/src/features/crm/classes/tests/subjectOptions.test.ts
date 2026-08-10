import { describe, expect, it } from 'vitest';
import { buildAssignableSubjectOptions, getClassSubjectLabel, hasPersistedClassSubject } from '../subjectOptions';

describe('buildAssignableSubjectOptions', () => {
  it('includes subjects even when they are already assigned to a group', () => {
    expect(buildAssignableSubjectOptions([
      { subject_id: 7, class_id: 12, subject_name: 'English', subject_code: 'ENG' },
    ])).toEqual([{ id: 7, value: 7, label: 'English (ENG)', subjectName: 'English' }]);
  });

  it('deduplicates equivalent subject choices', () => {
    expect(buildAssignableSubjectOptions([
      { subject_id: 7, class_id: 12, subject_name: 'English', subject_code: 'ENG' },
      { subject_id: 8, class_id: 13, subject_name: 'English', subject_code: 'ENG' },
    ])).toHaveLength(1);
  });
});

describe('hasPersistedClassSubject', () => {
  it('accepts the subject returned by a refreshed group', () => {
    expect(hasPersistedClassSubject({ subject_name: 'English' }, 'English')).toBe(true);
  });

  it('rejects a successful class response that did not save the subject', () => {
    expect(hasPersistedClassSubject({ subject_name: null }, 'English')).toBe(false);
  });
});

describe('getClassSubjectLabel', () => {
  it('shows the assigned subject from the group response', () => {
    expect(getClassSubjectLabel({ subject_name: 'English' })).toBe('English');
  });

  it('uses a clear fallback when no subject is assigned', () => {
    expect(getClassSubjectLabel({})).toBe('No subject assigned');
  });
});
