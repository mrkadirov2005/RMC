import { describe, expect, it } from 'vitest';
import { getMultiGroupStudents } from '../multiGroupStudentsModel';
import type { Student } from '../types';

const student = (overrides: Partial<Student>): Student => ({
  center_id: 1,
  enrollment_number: '',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: '',
  phone: '',
  date_of_birth: '',
  parent_name: '',
  parent_phone: '',
  gender: '',
  status: 'Active',
  ...overrides,
});

describe('getMultiGroupStudents', () => {
  it('finds one person enrolled in different groups by matching name and phone', () => {
    const results = getMultiGroupStudents([
      student({ student_id: 1, phone: '+998 90 123-45-67', class_id: 10, class_name: 'Math' }),
      student({ student_id: 2, phone: '998901234567', class_id: 20, class_name: 'English' }),
    ]);

    expect(results).toMatchObject([
      { name: 'Ada Lovelace', groups: [{ name: 'English' }, { name: 'Math' }] },
    ]);
  });

  it('matches normalized names and birth dates when phone numbers differ', () => {
    const results = getMultiGroupStudents([
      student({ first_name: 'Áda', last_name: 'Lovelace', date_of_birth: '2000-01-02', phone: '111', class_id: 10 }),
      student({ first_name: 'Ada', last_name: 'Lovelace', date_of_birth: '2000-01-02T00:00:00.000Z', phone: '222', class_id: 20 }),
    ]);

    expect(results).toHaveLength(1);
  });

  it('does not combine same-name students when their identifiers conflict', () => {
    const results = getMultiGroupStudents([
      student({ student_id: 1, phone: '111', date_of_birth: '2000-01-02', class_id: 10 }),
      student({ student_id: 2, phone: '222', date_of_birth: '2001-01-02', class_id: 20 }),
    ]);

    expect(results).toEqual([]);
  });

  it('counts distinct groups rather than duplicate records in one group', () => {
    const results = getMultiGroupStudents([
      student({ student_id: 1, phone: '111', class_id: 10, class_name: 'Math' }),
      student({ student_id: 2, phone: '111', class_id: 10, class_name: 'Math' }),
    ]);

    expect(results).toEqual([]);
  });
});
