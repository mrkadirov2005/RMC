const { buildTeacherGroupPayments } = require('../groupPayments');

const classes = [
  { class_id: 1, class_name: 'Math A', payment_amount: '400000' },
  { class_id: 2, class_name: 'English B', payment_amount: '300000' },
];

describe('teacher group payments', () => {
  it('splits each group into collected and remaining money and the teacher share', () => {
    const result = buildTeacherGroupPayments({
      monthKey: '2026-10',
      salaryPercentage: '40',
      classes,
      students: [
        { student_id: 10, class_id: 1, first_name: 'Ali', last_name: 'V' },
        { student_id: 11, class_id: 1, first_name: 'Bek', last_name: 'K' },
        { student_id: 12, class_id: 1, first_name: 'Dilnoza', last_name: 'R' },
        { student_id: 20, class_id: 2, first_name: 'Elyor', last_name: 'S' },
      ],
      payments: [
        { student_id: 10, amount: '400000' },
        { student_id: 11, amount: '150000' },
        { student_id: 20, amount: '300000' },
      ],
    });

    const math = result.groups.find((group) => group.class_id === 1);
    expect(math).toMatchObject({
      total_students: 3,
      paid_students: 1,
      partial_students: 1,
      unpaid_students: 1,
      expected: 1200000,
      collected: 550000,
      remaining: 650000,
      collected_percent: 45.8,
      teacher_share: 220000,
    });
    expect(math.students.map((student) => [student.name, student.state, student.remaining])).toEqual([
      ['Ali V', 'paid', 0],
      ['Bek K', 'partial', 250000],
      ['Dilnoza R', 'unpaid', 400000],
    ]);

    expect(result.totals).toMatchObject({
      expected: 1500000,
      collected: 850000,
      remaining: 650000,
      collected_percent: 56.7,
      current_salary: 340000,
      potential_salary: 600000,
    });
  });

  it('takes the payment discount off what is owed', () => {
    const result = buildTeacherGroupPayments({
      monthKey: '2026-10',
      salaryPercentage: 50,
      classes: [classes[0]],
      students: [{ student_id: 10, class_id: 1, first_name: 'Ali' }],
      payments: [{ student_id: 10, amount: '300000', discount_amount: '100000' }],
    });

    expect(result.groups[0].students[0]).toMatchObject({ state: 'paid', expected: 300000, remaining: 0 });
    expect(result.totals.remaining).toBe(0);
  });

  it('prorates the fee for a student who joined mid-month and skips one who was not in the group', () => {
    const result = buildTeacherGroupPayments({
      monthKey: '2026-09',
      salaryPercentage: 50,
      classes: [{ class_id: 1, class_name: 'Math A', payment_amount: 300000 }],
      students: [
        { student_id: 10, class_id: 1, first_name: 'New', start_date: '2026-09-16' },
        { student_id: 11, class_id: 1, first_name: 'Gone', end_date: '2026-08-20' },
      ],
      payments: [],
    });

    expect(result.groups[0].students).toEqual([
      expect.objectContaining({ name: 'New', expected: 150000, remaining: 150000, state: 'unpaid' }),
    ]);
  });

  it('reports no salary share when the teacher has no percentage set', () => {
    const result = buildTeacherGroupPayments({
      monthKey: '2026-10',
      salaryPercentage: null,
      classes: [classes[0]],
      students: [{ student_id: 10, class_id: 1 }],
      payments: [{ student_id: 10, amount: 400000 }],
    });

    expect(result.salary_percentage).toBe(0);
    expect(result.totals.current_salary).toBe(0);
    expect(result.totals.collected_percent).toBe(100);
  });

  it('keeps a student transferred out this month in the old teacher salary, flagged', () => {
    const result = buildTeacherGroupPayments({
      monthKey: '2026-10',
      salaryPercentage: 40,
      classes: [{ class_id: 1, class_name: 'Math A', payment_amount: 310000 }],
      students: [
        { student_id: 10, class_id: 1, first_name: 'Alisher', status: 'Transferred', end_date: '2026-10-10' },
        { student_id: 11, class_id: 1, first_name: 'Bek', status: 'Active' },
      ],
      payments: [],
    });
    const [alisher, bek] = result.groups[0].students;
    expect(alisher).toMatchObject({ name: 'Alisher', transferred: true, expected: 100000 });
    expect(bek.transferred).toBe(false);
  });
});
