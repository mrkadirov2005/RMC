// Rules behind the teacher's Tests tab, kept free of React so they can be tested
// directly. The server enforces the same authorship rule; this copy only decides
// which buttons to show.

export interface TeacherTestRow {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string | null;
  subject_name?: string | null;
  total_marks?: number | null;
  passing_marks?: number | null;
  duration_minutes?: number | null;
  is_active?: boolean | null;
  is_private?: boolean | null;
  created_by?: number | null;
  created_by_type?: string | null;
  question_count?: number | null;
  submission_count?: number | null;
  awaiting_grading_count?: number | null;
  created_at?: string | null;
}

export type OwnerFilter = 'mine' | 'all';
export type StatusFilter = 'all' | 'active' | 'inactive' | 'to_grade';

export interface TeacherTestFilters {
  search: string;
  owner: OwnerFilter;
  status: StatusFilter;
  testType: string;
}

export const DEFAULT_FILTERS: TeacherTestFilters = {
  search: '',
  owner: 'mine',
  status: 'all',
  testType: 'all',
};

// A teacher wrote a test when their id is recorded as its teacher author. A
// superuser-authored test can carry the same number, so the type has to match too.
export const isAuthor = (test: TeacherTestRow, teacherId: number | null | undefined) =>
  teacherId != null
  && String(test.created_by_type || 'teacher') === 'teacher'
  && Number(test.created_by) === Number(teacherId);

export const filterTeacherTests = (
  tests: TeacherTestRow[],
  filters: TeacherTestFilters,
  teacherId: number | null | undefined
) => {
  const search = filters.search.trim().toLowerCase();

  return tests.filter((test) => {
    if (filters.owner === 'mine' && !isAuthor(test, teacherId)) return false;
    if (filters.testType !== 'all' && test.test_type !== filters.testType) return false;
    if (filters.status === 'active' && !test.is_active) return false;
    if (filters.status === 'inactive' && test.is_active) return false;
    if (filters.status === 'to_grade' && Number(test.awaiting_grading_count || 0) === 0) return false;
    if (!search) return true;
    return [test.test_name, test.subject_name, test.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
};

export interface TeacherTestSummary {
  mine: number;
  active: number;
  submissions: number;
  toGrade: number;
}

// Counts for the strip above the list, always over the teacher's own tests so the
// numbers do not jump when they switch the list to everyone's tests.
export const summarizeTeacherTests = (
  tests: TeacherTestRow[],
  teacherId: number | null | undefined
): TeacherTestSummary => {
  const mine = tests.filter((test) => isAuthor(test, teacherId));
  return {
    mine: mine.length,
    active: mine.filter((test) => test.is_active).length,
    submissions: mine.reduce((sum, test) => sum + Number(test.submission_count || 0), 0),
    toGrade: mine.reduce((sum, test) => sum + Number(test.awaiting_grading_count || 0), 0),
  };
};
