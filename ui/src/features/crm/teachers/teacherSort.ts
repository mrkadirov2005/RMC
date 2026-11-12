// Teacher sort options shared by every teacher list: the Teachers page sorts on the server with
// the same keys; lists that already hold every teacher (Students → Teachers) sort here.

export type TeacherSort = 'students' | 'groups' | 'subject' | 'salary' | 'name';

export const TEACHER_SORT_OPTIONS: { value: TeacherSort; label: string }[] = [
  { value: 'students', label: 'Most students' },
  { value: 'groups', label: 'Most groups' },
  { value: 'subject', label: 'Subject (A-Z)' },
  { value: 'salary', label: 'Salary share (highest)' },
  { value: 'name', label: 'Name (A-Z)' },
];

/** Only the owner sees teachers' salary share, so only the owner can sort by it. */
export const teacherSortOptionsFor = (canSeeSalary: boolean) =>
  TEACHER_SORT_OPTIONS.filter((option) => option.value !== 'salary' || canSeeSalary);

export type SortableTeacher = {
  name: string;
  studentCount?: number | null;
  classCount?: number | null;
  subject?: string | null;
  salary?: number | null;
};

const byNumberDesc = (a?: number | null, b?: number | null) => {
  const left = a == null || !Number.isFinite(Number(a)) ? null : Number(a);
  const right = b == null || !Number.isFinite(Number(b)) ? null : Number(b);
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
};

const byTextAsc = (a?: string | null, b?: string | null) => {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
};

/** Sorts a copy: numbers largest first, text A-Z, missing values last, ties by name. */
export const sortTeachers = <T extends SortableTeacher>(rows: T[], sort: TeacherSort): T[] =>
  [...rows].sort((a, b) => {
    const primary = sort === 'groups' ? byNumberDesc(a.classCount, b.classCount)
      : sort === 'subject' ? byTextAsc(a.subject, b.subject)
        : sort === 'salary' ? byNumberDesc(a.salary, b.salary)
          : sort === 'name' ? 0
            : byNumberDesc(a.studentCount, b.studentCount);
    return primary || a.name.localeCompare(b.name);
  });
