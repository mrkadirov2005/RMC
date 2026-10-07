jest.mock('../../repositories/absenceAlert.repository', () => ({
  findRecentAttendance: jest.fn(),
  findResolutions: jest.fn(),
  findStudentDetails: jest.fn(),
  insertResolution: jest.fn(),
  freezeStudent: jest.fn(),
}));
jest.mock('../../../payments/repositories/payment.repository', () => ({ findStaffName: jest.fn() }));

const repository = require('../../repositories/absenceAlert.repository');
const paymentRepository = require('../../../payments/repositories/payment.repository');
const service = require('../absenceAlert.service');

const absentTwice = (studentId, classId = 1) => [
  { student_id: studentId, class_id: classId, attendance_date: '2026-10-03', status: 'Absent' },
  { student_id: studentId, class_id: classId, attendance_date: '2026-10-06', status: 'Absent' },
];
const student = (id, extra = {}) => ({ student_id: id, first_name: 'Ali', last_name: `S${id}`, class_id: 1, status: 'Active', is_frozen: false, is_deleted: false, class_name: 'Math', teacher_name: 'Ibrohim M', center_id: 4, parent_phone: '901234567', ...extra });

describe('absence alert service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.findRecentAttendance.mockResolvedValue([...absentTwice(1), ...absentTwice(2), ...absentTwice(3), ...absentTwice(4)]);
    repository.findResolutions.mockResolvedValue([]);
    repository.findStudentDetails.mockResolvedValue([
      student(1),
      student(2, { is_frozen: true }),
      student(3, { class_id: 9 }),
      student(4, { is_deleted: true }),
    ]);
  });

  it('lists only students still active in that group, with follow-up details', async () => {
    const alerts = await service.listAlerts({ centerId: 4 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ student_id: 1, student_name: 'S1 Ali', class_name: 'Math', teacher_name: 'Ibrohim M', parent_phone: '901234567', streak: 2 });
    expect(repository.findRecentAttendance).toHaveBeenCalledWith({ centerId: 4, teacherId: undefined });
  });

  it('resolves through the latest absence and freezes a sick student', async () => {
    paymentRepository.findStaffName.mockResolvedValue('Anvar Jalolov');
    repository.insertResolution.mockResolvedValue({ resolution_id: 5 });

    const out = await service.resolveAlert({ studentId: 1, classId: 1, outcome: 'sick', note: ' Isitma ', centerId: 4, actingUser: { id: 2, userType: 'superuser', role: 'admin' } });

    expect(repository.insertResolution).toHaveBeenCalledWith(expect.objectContaining({
      studentId: 1, classId: 1, resolvedThrough: '2026-10-06', outcome: 'sick', note: 'Isitma', resolvedByName: 'Anvar Jalolov', centerId: 4,
    }));
    expect(repository.freezeStudent).toHaveBeenCalledWith(1);
    expect(out).toEqual({ resolution: { resolution_id: 5 }, frozen: true });
  });

  it('does not freeze for other outcomes and refuses unknown ones or closed alerts', async () => {
    repository.insertResolution.mockResolvedValue({ resolution_id: 6 });
    await service.resolveAlert({ studentId: 1, classId: 1, outcome: 'left', centerId: 4, actingUser: {} });
    expect(repository.freezeStudent).not.toHaveBeenCalled();

    expect(await service.resolveAlert({ studentId: 1, classId: 1, outcome: 'gone', actingUser: {} })).toEqual({ error: 'invalid_outcome' });
    expect(await service.resolveAlert({ studentId: 2, classId: 1, outcome: 'left', actingUser: {} })).toEqual({ error: 'not_found' });
  });
});
