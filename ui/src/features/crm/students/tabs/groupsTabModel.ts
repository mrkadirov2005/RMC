// Helpers for the student groups tab.

export interface StudentGroupRecord {
  student_id: number;
  class_id?: number | null;
  class_name?: string | null;
  status?: string | null;
  coins?: number | null;
  is_main?: boolean;
  teacher_first_name?: string | null;
  teacher_last_name?: string | null;
}

export interface ClassOption {
  class_id?: number;
  id?: number;
  class_name?: string;
}

export const getClassId = (cls: ClassOption) => Number(cls.class_id || cls.id || 0);

/** Classes the child can still be added to: not one of their active groups. */
export const getAssignableClasses = (classes: ClassOption[], groups: StudentGroupRecord[]) => {
  const taken = new Set(
    groups.filter((group) => group.status !== 'Transferred').map((group) => Number(group.class_id || 0))
  );
  return classes
    .filter((cls) => getClassId(cls) > 0 && !taken.has(getClassId(cls)))
    .sort((a, b) => String(a.class_name || '').localeCompare(String(b.class_name || '')));
};
