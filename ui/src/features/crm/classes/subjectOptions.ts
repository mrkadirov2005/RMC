export const buildAssignableSubjectOptions = (subjects: any[]) => {
  const seen = new Set<string>();
  return subjects.flatMap((subject) => {
    const id = Number(subject?.subject_id || subject?.id || 0);
    const label = String(subject?.subject_name || '').trim();
    const code = String(subject?.subject_code || '').trim();
    const key = `${label.toLowerCase()}|${code.toLowerCase()}`;
    if (!id || !label || seen.has(key)) return [];
    seen.add(key);
    return [{ id, value: id, label: code ? `${label} (${code})` : label, subjectName: label }];
  });
};

export const getClassSubjectLabel = (group: any) =>
  String(group?.subject_name || '').trim() || 'No subject assigned';

export const hasPersistedClassSubject = (group: any, expectedSubjectName: string) =>
  String(group?.subject_name || '').trim().toLowerCase() === expectedSubjectName.trim().toLowerCase();

export const buildClassSubjectAssignment = (subject: any, group: any) => ({
  center_id: Number(group?.center_id || subject?.center_id),
  class_id: Number(group?.class_id || group?.id),
  subject_name: String(subject?.subject_name || '').trim(),
  subject_code: subject?.subject_code || undefined,
  teacher_id: group?.teacher_id || subject?.teacher_id || undefined,
  total_marks: Number(subject?.total_marks || 100),
  passing_marks: Number(subject?.passing_marks || 40),
});
