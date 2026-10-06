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
  teacher_id?: number | null;
}

export interface TeacherOption {
  teacher_id?: number;
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
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

/**
 * The teachers to pick from first, like the transfer dialog: only teachers with a group the child
 * can still join, sorted by name. Groups without a teacher are offered under id 0.
 */
export const getAssignableTeachers = (assignableClasses: ClassOption[], teachers: TeacherOption[]) => {
  const groupCounts = new Map<number, number>();
  assignableClasses.forEach((cls) => {
    const teacherId = Number(cls.teacher_id || 0);
    groupCounts.set(teacherId, (groupCounts.get(teacherId) || 0) + 1);
  });
  const named = teachers
    .map((teacher) => {
      const id = Number(teacher.teacher_id || teacher.id || 0);
      return { id, name: [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim() || `#${id}`, groups: groupCounts.get(id) || 0 };
    })
    .filter((teacher) => teacher.id > 0 && teacher.groups > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const unassigned = groupCounts.get(0) || 0;
  return unassigned > 0 ? [...named, { id: 0, name: '', groups: unassigned }] : named;
};

/** The assignable groups of one teacher (0 = groups with no teacher). */
export const getTeacherClasses = (assignableClasses: ClassOption[], teacherId: number) =>
  assignableClasses.filter((cls) => Number(cls.teacher_id || 0) === teacherId);
