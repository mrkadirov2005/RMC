import { describe, expect, it } from 'vitest';
import { getPaymentStudentGroupOptions } from '../paymentStudentGroups';
import type { Class, Student } from '../../types';

const student = (overrides: Partial<Student>): Student => ({
  student_id: 1,
  center_id: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  ...overrides,
});

const classes: Class[] = [
  { class_id: 10, class_name: 'Math', class_code: 'M', level: 1, payment_amount: 200 },
  { class_id: 20, class_name: 'English', class_code: 'E', level: 1, payment_amount: 300 },
];

describe('getPaymentStudentGroupOptions', () => {
  it('returns same-student records in different groups with each group fee', () => {
    const selected = student({ phone: '+998 90 123-45-67', class_id: 10 });
    const siblings = [
      selected,
      student({ student_id: 2, phone: '998901234567', class_id: 20 }),
      student({ student_id: 3, phone: '998901234568', class_id: 30 }),
    ];

    expect(getPaymentStudentGroupOptions(selected, siblings, classes)).toEqual([
      { studentId: 2, groupName: 'English', amount: 300 },
      { studentId: 1, groupName: 'Math', amount: 200 },
    ]);
  });

  it('does not treat unrelated students with the same name as group options', () => {
    const selected = student({ phone: '111', date_of_birth: '2000-01-01', class_id: 10 });
    const unrelated = student({ student_id: 2, phone: '222', date_of_birth: '2001-01-01', class_id: 20 });

    expect(getPaymentStudentGroupOptions(selected, [selected, unrelated], classes)).toHaveLength(1);
  });

  it('offers every linked group record of the child, whatever the name or phone', () => {
    const selected = student({ student_id: 1, phone: '901', class_id: 10 });
    const options = getPaymentStudentGroupOptions(selected, [
      selected,
      student({ student_id: 2, first_name: 'Adaa', phone: '', class_id: 20, main_student_id: 1 }),
    ], classes);

    expect(options.map((option) => [option.studentId, option.groupName])).toEqual([[2, 'English'], [1, 'Math']]);
  });

  it('starts from a linked record as well as from the main one', () => {
    const selected = student({ student_id: 2, class_id: 20, main_student_id: 1 });
    const options = getPaymentStudentGroupOptions(selected, [
      student({ student_id: 1, first_name: 'Other', class_id: 10 }),
      selected,
    ], classes);

    expect(options.map((option) => option.studentId)).toEqual([2, 1]);
  });
});
