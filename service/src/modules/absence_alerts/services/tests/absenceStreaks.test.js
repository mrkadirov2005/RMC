const { findOpenAbsenceAlerts } = require('../absenceStreaks');

const rows = (classId, studentId, entries) =>
  entries.map(([date, status, remarks]) => ({ class_id: classId, student_id: studentId, attendance_date: date, status, remarks }));

describe('absence streaks', () => {
  const records = [
    ...rows(1, 10, [['2026-10-01', 'Present'], ['2026-10-03', 'Absent'], ['2026-10-06', 'Absent', 'Kasal']]),
    ...rows(1, 11, [['2026-10-01', 'Absent'], ['2026-10-03', 'Absent'], ['2026-10-06', 'Present']]),
    ...rows(1, 12, [['2026-10-01', 'Absent'], ['2026-10-03', 'Absent R'], ['2026-10-06', 'Absent']]),
    ...rows(1, 13, [['2026-10-01', 'Absent'], ['2026-10-03', 'Absent'], ['2026-10-06', 'Absent']]),
    // Joined after the first two lessons: a single absence is not a run.
    ...rows(1, 14, [['2026-10-06', 'Absent']]),
  ];

  it('finds students whose latest lessons in a row were unexcused absences', () => {
    const alerts = findOpenAbsenceAlerts({ records });
    expect(alerts.map((alert) => [alert.student_id, alert.streak])).toEqual([[13, 3], [10, 2]]);
    expect(alerts.find((alert) => alert.student_id === 10)).toMatchObject({
      class_id: 1,
      last_absent_date: '2026-10-06',
      absent_dates: ['2026-10-06', '2026-10-03'],
      teacher_reason: 'Kasal',
    });
  });

  it('stays closed after a resolution until a newer absence', () => {
    const resolutions = [{ student_id: 13, class_id: 1, resolved_through: '2026-10-06' }];
    expect(findOpenAbsenceAlerts({ records, resolutions }).map((alert) => alert.student_id)).toEqual([10]);

    const later = [...records, ...rows(1, 13, [['2026-10-08', 'Absent']]), ...rows(1, 10, [['2026-10-08', 'Present']])];
    expect(findOpenAbsenceAlerts({ records: later, resolutions }).map((alert) => alert.student_id)).toEqual([13]);
  });

  it('ignores the default remark as a reason', () => {
    const alerts = findOpenAbsenceAlerts({
      records: rows(2, 20, [['2026-10-01', 'Absent', 'Daily Session Grading'], ['2026-10-03', 'Absent', 'Daily Session Grading']]),
    });
    expect(alerts[0].teacher_reason).toBeNull();
  });
});
