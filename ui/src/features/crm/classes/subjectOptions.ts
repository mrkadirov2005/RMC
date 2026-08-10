export const buildAssignableSubjectOptions = (subjects: any[]) => {
  const seen = new Set<string>();
  return subjects.flatMap((subject) => {
    const id = Number(subject?.subject_id || subject?.id || 0);
    const label = String(subject?.subject_name || '').trim();
    const code = String(subject?.subject_code || '').trim();
    const key = `${label.toLowerCase()}|${code.toLowerCase()}`;
    if (!id || !label || seen.has(key)) return [];
    seen.add(key);
    return [{ id, value: id, label: code ? `${label} (${code})` : label }];
  });
};
