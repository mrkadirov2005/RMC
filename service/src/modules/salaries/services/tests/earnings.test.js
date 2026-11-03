const { buildTeacherEarnings, summarizeEarnings } = require('../earnings');

describe('buildTeacherEarnings', () => {
  const payments = [
    { payment_id: 1, student_id: 10, amount: '500000', for_month: '2026-11', late: false },
    { payment_id: 2, student_id: 10, amount: '100000', for_month: '2026-11', late: false },
    { payment_id: 3, student_id: 11, amount: '400000', for_month: '2026-10', late: true, first_name: 'Kamol', last_name: 'S', class_name: 'A1' },
  ];

  test('the rate of on-time and late money together is what the teacher is owed', () => {
    const earnings = buildTeacherEarnings({ salaryPercentage: '40', payments });
    expect(earnings).toMatchObject({ rate: 40, on_time_amount: 600000, late_amount: 400000, base_amount: 1000000, due: 400000, paying_students: 1 });
    expect(earnings.late_payments).toEqual([
      expect.objectContaining({ payment_id: 3, name: 'Kamol S', for_month: '2026-10', amount: 400000, teacher_share: 160000 }),
    ]);
  });

  test('no rate set means nothing is owed yet', () => {
    expect(buildTeacherEarnings({ salaryPercentage: null, payments }).due).toBe(0);
  });

  test('the overview keeps the totals and only counts the late payments', () => {
    const summary = summarizeEarnings(buildTeacherEarnings({ salaryPercentage: 50, payments }));
    expect(summary.late_count).toBe(1);
    expect(summary).not.toHaveProperty('late_payments');
  });
});
