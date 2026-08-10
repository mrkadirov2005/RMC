import { describe, expect, it } from 'vitest';
import { buildAssignableSubjectOptions } from '../subjectOptions';

describe('buildAssignableSubjectOptions', () => {
  it('includes subjects even when they are already assigned to a group', () => {
    expect(buildAssignableSubjectOptions([
      { subject_id: 7, class_id: 12, subject_name: 'English', subject_code: 'ENG' },
    ])).toEqual([{ id: 7, value: 7, label: 'English (ENG)' }]);
  });

  it('deduplicates equivalent subject choices', () => {
    expect(buildAssignableSubjectOptions([
      { subject_id: 7, class_id: 12, subject_name: 'English', subject_code: 'ENG' },
      { subject_id: 8, class_id: 13, subject_name: 'English', subject_code: 'ENG' },
    ])).toHaveLength(1);
  });
});
