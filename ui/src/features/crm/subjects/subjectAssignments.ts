export const countDuplicateClassSubjectAssignments = (subjects: any[]) => {
  const assignmentsPerClass = new Map<number, number>();
  for (const subject of subjects) {
    const classId = Number(subject?.class_id || 0);
    if (!classId) continue;
    assignmentsPerClass.set(classId, (assignmentsPerClass.get(classId) || 0) + 1);
  }
  return Array.from(assignmentsPerClass.values()).reduce(
    (duplicates, count) => duplicates + Math.max(count - 1, 0),
    0,
  );
};
