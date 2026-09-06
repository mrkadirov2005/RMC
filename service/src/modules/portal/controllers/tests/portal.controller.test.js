const serviceMocks = {
  attendance: { byStudent: jest.fn() }, grades: { listByStudent: jest.fn() }, debts: { listByStudent: jest.fn() },
  payments: { listByStudent: jest.fn() }, students: { getStudent: jest.fn() }, classes: { getClass: jest.fn() },
  subjects: { listByClass: jest.fn() }, teachers: { getTeacher: jest.fn() }, tests: { getAssignedTests: jest.fn() },
  assignments: { getAllAssignments: jest.fn() }, rooms: { findByClassId: jest.fn() },
};
jest.mock('../../../attendance/services/attendance.service', () => serviceMocks.attendance);
jest.mock('../../../grades/services/grade.service', () => serviceMocks.grades);
jest.mock('../../../debts/services/debt.service', () => serviceMocks.debts);
jest.mock('../../../payments/services/payment.service', () => serviceMocks.payments);
jest.mock('../../../students/services/student.service', () => serviceMocks.students);
jest.mock('../../../classes/services/class.service', () => serviceMocks.classes);
jest.mock('../../../subjects/services/subject.service', () => serviceMocks.subjects);
jest.mock('../../../teachers/services/teacher.service', () => serviceMocks.teachers);
jest.mock('../../../tests/services/test.service', () => serviceMocks.tests);
jest.mock('../../../assignments/services/assignment.service', () => serviceMocks.assignments);
jest.mock('../../../rooms/repositories/rooms.repository', () => serviceMocks.rooms);
const controller = require('../portal.controller');
const response = () => { const res = { json: jest.fn() }; res.status = jest.fn(() => res); return res; };

describe('student portal controller', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  test('returns 404 when authenticated student no longer exists', async () => {
    serviceMocks.students.getStudent.mockResolvedValue(null); const res = response();
    await controller.getDashboardData({ user: { id: 1, center_id: 2 } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  test('composes only authenticated student data and isolates optional failures', async () => {
    serviceMocks.students.getStudent.mockResolvedValue({ student_id: 1, class_id: 3, teacher_id: 4 });
    serviceMocks.attendance.byStudent.mockRejectedValue(new Error('optional down'));
    serviceMocks.grades.listByStudent.mockResolvedValue([{ grade_id: 1 }]); serviceMocks.debts.listByStudent.mockResolvedValue([]);
    serviceMocks.payments.listByStudent.mockResolvedValue([]); serviceMocks.tests.getAssignedTests.mockResolvedValue([]);
    serviceMocks.assignments.getAllAssignments.mockResolvedValue([{ class_id: 3, assignment_id: 1 }, { class_id: 9, assignment_id: 2 }]);
    serviceMocks.classes.getClass.mockResolvedValue({ class_id: 3 }); serviceMocks.subjects.listByClass.mockResolvedValue([]);
    serviceMocks.teachers.getTeacher.mockResolvedValue({ teacher_id: 4 }); serviceMocks.rooms.findByClassId.mockResolvedValue([]);
    const res = response(); await controller.getDashboardData({ user: { id: 1, center_id: 2 } }, res);
    expect(serviceMocks.attendance.byStudent).toHaveBeenCalledWith(1, 2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ attendance: [], grades: [{ grade_id: 1 }], assignments: [{ class_id: 3, assignment_id: 1 }] }));
  });
  test('returns empty schedule when student has no class', async () => {
    serviceMocks.students.getStudent.mockResolvedValue({ student_id: 1, class_id: null }); const res = response();
    await controller.getMySchedule({ user: { id: 1, center_id: 2 } }, res);
    expect(res.json).toHaveBeenCalledWith([]); expect(serviceMocks.rooms.findByClassId).not.toHaveBeenCalled();
  });
  test('scopes direct attendance, grades, and tests endpoints to token identity', async () => {
    serviceMocks.attendance.byStudent.mockResolvedValue([]); serviceMocks.grades.listByStudent.mockResolvedValue([]); serviceMocks.tests.getAssignedTests.mockResolvedValue([]);
    await controller.getMyAttendance({ user: { id: 1, center_id: 2 } }, response());
    await controller.getMyGrades({ user: { id: 1, center_id: 2 } }, response());
    await controller.getMyTests({ user: { id: 1, center_id: 2 } }, response());
    expect(serviceMocks.attendance.byStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.grades.listByStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.tests.getAssignedTests).toHaveBeenCalledWith('student', 1, 2);
  });

  // RMC-080: every aggregated dashboard section must be keyed off req.user.id/req.user.center_id
  // (the authenticated student's own token), never a client-supplied id. The controller code never
  // reads params/query/body for a student id at all, so this test spoofs every plausible smuggling
  // vector (params, query, body) alongside the real token and proves student B's id (999) never
  // reaches any repository/service call.
  test('getDashboardData ignores any client-supplied student id on every aggregated section and scopes all of them to the authenticated user', async () => {
    serviceMocks.students.getStudent.mockResolvedValue({ student_id: 1, class_id: 3, teacher_id: 4 });
    serviceMocks.attendance.byStudent.mockResolvedValue([{ attendance_id: 'own' }]);
    serviceMocks.grades.listByStudent.mockResolvedValue([{ grade_id: 'own' }]);
    serviceMocks.debts.listByStudent.mockResolvedValue([{ debt_id: 'own' }]);
    serviceMocks.payments.listByStudent.mockResolvedValue([{ payment_id: 'own' }]);
    serviceMocks.tests.getAssignedTests.mockResolvedValue([{ test_id: 'own' }]);
    serviceMocks.assignments.getAllAssignments.mockResolvedValue([]);
    serviceMocks.classes.getClass.mockResolvedValue({ class_id: 3 });
    serviceMocks.subjects.listByClass.mockResolvedValue([]);
    serviceMocks.teachers.getTeacher.mockResolvedValue({ teacher_id: 4 });
    serviceMocks.rooms.findByClassId.mockResolvedValue([{ slot_id: 'own' }]);

    const OTHER_STUDENT_ID = 999;
    const spoofedReq = {
      user: { id: 1, center_id: 2 },
      params: { studentId: String(OTHER_STUDENT_ID), student_id: String(OTHER_STUDENT_ID) },
      query: { studentId: String(OTHER_STUDENT_ID), student_id: String(OTHER_STUDENT_ID) },
      body: { studentId: OTHER_STUDENT_ID, student_id: OTHER_STUDENT_ID },
    };
    const res = response();

    await controller.getDashboardData(spoofedReq, res);

    // student lookup and every section must key off the token's own id/center, not the spoofed one
    expect(serviceMocks.students.getStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.attendance.byStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.grades.listByStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.debts.listByStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.payments.listByStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.tests.getAssignedTests).toHaveBeenCalledWith('student', 1, 2);
    expect(serviceMocks.teachers.getTeacher).toHaveBeenCalledWith(4, 2);
    expect(serviceMocks.rooms.findByClassId).toHaveBeenCalledWith(3, 2);

    // the spoofed id must never leak into any downstream call
    const allSectionCalls = [
      ...serviceMocks.attendance.byStudent.mock.calls,
      ...serviceMocks.grades.listByStudent.mock.calls,
      ...serviceMocks.debts.listByStudent.mock.calls,
      ...serviceMocks.payments.listByStudent.mock.calls,
      ...serviceMocks.tests.getAssignedTests.mock.calls,
      ...serviceMocks.rooms.findByClassId.mock.calls,
    ];
    for (const args of allSectionCalls) {
      expect(args).not.toContain(OTHER_STUDENT_ID);
      expect(args).not.toContain(String(OTHER_STUDENT_ID));
    }
    // and the response is built entirely from the authenticated user's own data
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      attendance: [{ attendance_id: 'own' }],
      grades: [{ grade_id: 'own' }],
      debts: [{ debt_id: 'own' }],
      payments: [{ payment_id: 'own' }],
      tests: [{ test_id: 'own' }],
      schedule: [{ slot_id: 'own' }],
    }));
  });

  test.each([
    ['getMyAttendance', () => serviceMocks.attendance.byStudent, () => serviceMocks.attendance.byStudent.mockResolvedValue([])],
    ['getMyGrades', () => serviceMocks.grades.listByStudent, () => serviceMocks.grades.listByStudent.mockResolvedValue([])],
  ])('%s ignores a client-supplied student id and scopes to the authenticated user', async (method, getMock, arrange) => {
    arrange();
    const OTHER_STUDENT_ID = 999;
    const spoofedReq = {
      user: { id: 1, center_id: 2 },
      params: { studentId: String(OTHER_STUDENT_ID) },
      query: { student_id: String(OTHER_STUDENT_ID) },
      body: { studentId: OTHER_STUDENT_ID },
    };

    await controller[method](spoofedReq, response());

    expect(getMock()).toHaveBeenCalledWith(1, 2);
  });

  test('getMyTests ignores a client-supplied student id and scopes to the authenticated user', async () => {
    serviceMocks.tests.getAssignedTests.mockResolvedValue([]);
    const spoofedReq = {
      user: { id: 1, center_id: 2 },
      params: { studentId: '999' },
      query: { student_id: '999' },
      body: { studentId: 999 },
    };

    await controller.getMyTests(spoofedReq, response());

    expect(serviceMocks.tests.getAssignedTests).toHaveBeenCalledWith('student', 1, 2);
  });

  test('getMySchedule ignores a client-supplied student id, looking up the class via the authenticated user only', async () => {
    serviceMocks.students.getStudent.mockResolvedValue({ student_id: 1, class_id: 3 });
    serviceMocks.rooms.findByClassId.mockResolvedValue([{ slot_id: 'own' }]);
    const spoofedReq = {
      user: { id: 1, center_id: 2 },
      params: { studentId: '999' },
      query: { student_id: '999' },
      body: { studentId: 999 },
    };

    const res = response();
    await controller.getMySchedule(spoofedReq, res);

    expect(serviceMocks.students.getStudent).toHaveBeenCalledWith(1, 2);
    expect(serviceMocks.rooms.findByClassId).toHaveBeenCalledWith(3, 2);
    expect(res.json).toHaveBeenCalledWith([{ slot_id: 'own' }]);
  });
});
