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
});
