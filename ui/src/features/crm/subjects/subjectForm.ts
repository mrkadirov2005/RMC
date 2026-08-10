export const buildSubjectSavePayload = <T extends Record<string, unknown>>(formData: T) => {
  const { class_id: _classId, ...subject } = formData;
  return subject;
};
