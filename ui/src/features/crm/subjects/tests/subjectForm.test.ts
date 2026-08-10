import { describe, expect, it } from 'vitest';
import { buildSubjectSavePayload } from '../subjectForm';

describe('buildSubjectSavePayload', () => {
  it('never assigns a class while saving a subject', () => {
    expect(buildSubjectSavePayload({
      subject_name: 'English',
      subject_code: 'ENG',
      teacher_id: 4,
      class_id: 12,
    })).toEqual({
      subject_name: 'English',
      subject_code: 'ENG',
      teacher_id: 4,
    });
  });
});
