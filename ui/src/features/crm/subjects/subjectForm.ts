export const buildSubjectSavePayload = <T extends Record<string, unknown>>(formData: T) => {
  const { class_id: _classId, teacher_id: _teacherId, subject_code: _subjectCode, ...subject } = formData;
  return subject;
};
