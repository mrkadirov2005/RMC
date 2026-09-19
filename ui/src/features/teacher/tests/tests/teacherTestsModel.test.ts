import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  filterTeacherTests,
  isAuthor,
  summarizeTeacherTests,
  type TeacherTestRow,
} from '../teacherTestsModel';

const row = (overrides: Partial<TeacherTestRow> = {}): TeacherTestRow => ({
  test_id: 1,
  test_name: 'Unit 4 Reading',
  test_type: 'multiple_choice',
  is_active: true,
  created_by: 4,
  created_by_type: 'teacher',
  question_count: 10,
  submission_count: 5,
  awaiting_grading_count: 0,
  ...overrides,
});

describe('isAuthor', () => {
  it('recognises the teacher who wrote the test', () => {
    expect(isAuthor(row(), 4)).toBe(true);
  });

  it('does not treat a colleague as the author', () => {
    expect(isAuthor(row(), 9)).toBe(false);
  });

  it('does not match a superuser-written test that shares the id', () => {
    expect(isAuthor(row({ created_by_type: 'superuser' }), 4)).toBe(false);
  });

  it('refuses when no teacher is signed in', () => {
    expect(isAuthor(row(), null)).toBe(false);
  });
});

describe('filterTeacherTests', () => {
  const tests = [
    row({ test_id: 1, test_name: 'Mine active', created_by: 4, is_active: true }),
    row({ test_id: 2, test_name: 'Mine inactive', created_by: 4, is_active: false }),
    row({ test_id: 3, test_name: 'Colleague shared', created_by: 9 }),
    row({ test_id: 4, test_name: 'Mine essay', created_by: 4, test_type: 'essay', awaiting_grading_count: 3 }),
  ];

  it('shows only the teacher own tests by default', () => {
    const result = filterTeacherTests(tests, DEFAULT_FILTERS, 4);

    expect(result.map((test) => test.test_id)).toEqual([1, 2, 4]);
  });

  it('includes shared tests when asked for everything', () => {
    const result = filterTeacherTests(tests, { ...DEFAULT_FILTERS, owner: 'all' }, 4);

    expect(result).toHaveLength(4);
  });

  it.each([
    ['active', [1, 4]],
    ['inactive', [2]],
    ['to_grade', [4]],
  ] as const)('narrows to %s tests', (status, ids) => {
    const result = filterTeacherTests(tests, { ...DEFAULT_FILTERS, status }, 4);

    expect(result.map((test) => test.test_id)).toEqual(ids);
  });

  it('narrows by question type', () => {
    const result = filterTeacherTests(tests, { ...DEFAULT_FILTERS, testType: 'essay' }, 4);

    expect(result.map((test) => test.test_id)).toEqual([4]);
  });

  it('searches the name case-insensitively and ignores surrounding space', () => {
    const result = filterTeacherTests(tests, { ...DEFAULT_FILTERS, search: '  INACTIVE ' }, 4);

    expect(result.map((test) => test.test_id)).toEqual([2]);
  });

  it('searches the subject and description too', () => {
    const withSubject = [row({ test_id: 7, test_name: 'Quiz', subject_name: 'Algebra', created_by: 4 })];

    expect(filterTeacherTests(withSubject, { ...DEFAULT_FILTERS, search: 'algebra' }, 4)).toHaveLength(1);
  });
});

describe('summarizeTeacherTests', () => {
  it('counts only the teacher own tests, so numbers hold when the list switches to everyone', () => {
    const summary = summarizeTeacherTests(
      [
        row({ created_by: 4, is_active: true, submission_count: 5, awaiting_grading_count: 2 }),
        row({ created_by: 4, is_active: false, submission_count: 3, awaiting_grading_count: 1 }),
        row({ created_by: 9, is_active: true, submission_count: 40, awaiting_grading_count: 10 }),
      ],
      4
    );

    expect(summary).toEqual({ mine: 2, active: 1, submissions: 8, toGrade: 3 });
  });

  it('treats missing counts as zero', () => {
    const summary = summarizeTeacherTests([row({ submission_count: null, awaiting_grading_count: undefined })], 4);

    expect(summary.submissions).toBe(0);
    expect(summary.toGrade).toBe(0);
  });
});
