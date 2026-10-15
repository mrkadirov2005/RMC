// Homework warnings (Ogohlantirishlar -> Uy vazifasi): students with homework not done or done
// partly in two or more lessons this month, and the teacher's filters over them.

export interface HomeworkWarning {
  student_id: number;
  student_name: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  class_id: number;
  class_name: string | null;
  teacher_name: string | null;
  lessons: Array<{ date: string; homework_score: number; homework_label: string | null }>;
}

export interface HomeworkWarningFilters {
  search: string;
  classId: number | null;
  status: string;
}

// The default homework levels in Uzbek; a level a center renamed is shown as they wrote it.
const STATUS_LABELS: Record<string, string> = {
  none: 'Bajarilmagan',
  half: 'Yarmi bajarilgan',
  weak: 'Sust',
};

export const homeworkStatusLabel = (label: string | null) =>
  (label && STATUS_LABELS[label.trim().toLowerCase()]) || label || '—';

/** The groups and homework statuses present, for the filter lists. */
export const homeworkWarningOptions = (warnings: HomeworkWarning[]) => {
  const groups = new Map<number, string>();
  const statuses = new Set<string>();
  warnings.forEach((warning) => {
    groups.set(warning.class_id, warning.class_name || `#${warning.class_id}`);
    warning.lessons.forEach((lesson) => { if (lesson.homework_label) statuses.add(lesson.homework_label); });
  });
  return {
    groups: Array.from(groups, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    statuses: Array.from(statuses),
  };
};

/** By student name, group, and a homework status the student had in at least one lesson. */
export const filterHomeworkWarnings = (warnings: HomeworkWarning[], { search, classId, status }: HomeworkWarningFilters) => {
  const query = search.trim().toLowerCase();
  return warnings.filter((warning) =>
    (!query || warning.student_name.toLowerCase().includes(query)) &&
    (classId === null || warning.class_id === classId) &&
    (!status || warning.lessons.some((lesson) => lesson.homework_label === status))
  );
};
