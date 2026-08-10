import { describe, expect, it } from 'vitest';
import { buildSubjectSavePayload } from '../subjectForm';

describe('buildSubjectSavePayload', () => {
  it('saves only subject-owned fields and omits code and assignments', () => {
    expect(buildSubjectSavePayload({
      subject_name: 'English',
      subject_code: 'ENG',
      teacher_id: 4,
      class_id: 12,
    })).toEqual({
      subject_name: 'English',
    });
  });
});
