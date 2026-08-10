const subjectKey = (subject: any) => String(subject?.subject_name || '').trim().toLowerCase();

export const buildSubjectCatalog = (subjects: any[]) => {
  const catalog = new Map<string, any>();

  for (const subject of subjects) {
    const key = subjectKey(subject);
    if (!key) continue;
    const current = catalog.get(key);
    if (!current) {
      catalog.set(key, {
        ...subject,
        catalogSubject: subject,
        assignments: subject.class_id ? [subject] : [],
      });
      continue;
    }
    if (!subject.class_id) current.catalogSubject = subject;
    if (subject.class_id && !current.assignments.some((item: any) => Number(item.class_id) === Number(subject.class_id))) {
      current.assignments.push(subject);
    }
  }

  return Array.from(catalog.values()).map((entry) => ({
    ...entry,
    ...(entry.catalogSubject || entry),
    assignments: entry.assignments,
  }));
};

export const getSubjectTeacherCount = (subject: any) =>
  new Set(subject.assignments.map((assignment: any) => Number(assignment.teacher_id || 0)).filter(Boolean)).size;
