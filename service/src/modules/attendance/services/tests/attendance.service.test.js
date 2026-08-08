jest.mock('../../repositories/attendance.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), studentInCenter: jest.fn(), classInCenter: jest.fn(),
  insert: jest.fn(), update: jest.fn(), findByStudent: jest.fn(), findByClass: jest.fn(),
  findBySession: jest.fn(), remove: jest.fn(),
}));

const repository = require('../../repositories/attendance.repository');
const service = require('../attendance.service');

describe('attendance service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('forwards scoped list and lookup operations', async () => {
    service.list(2, 3); service.getById(1, 2, 3); service.byStudent(4, 2, 3);
    service.byClass(5, 2, 3); service.bySession(6, 2, 3); service.remove(7, 2, 3);
    expect(repository.findAll).toHaveBeenCalledWith(2, 3);
    expect(repository.findById).toHaveBeenCalledWith(1, 2, 3);
    expect(repository.findByStudent).toHaveBeenCalledWith(4, 2, 3);
    expect(repository.findByClass).toHaveBeenCalledWith(5, 2, 3);
    expect(repository.findBySession).toHaveBeenCalledWith(6, 2, 3);
    expect(repository.remove).toHaveBeenCalledWith(7, 2, 3);
  });

  test('rejects creation if student or class is outside the center', async () => {
    repository.studentInCenter.mockResolvedValue(true);
    repository.classInCenter.mockResolvedValue(false);
    await expect(service.create({ student_id: 1, class_id: 4 }, 2)).resolves.toEqual({ error: 'invalid_center' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('creates center-forced attendance with defaults', async () => {
    repository.studentInCenter.mockResolvedValue(true);
    repository.classInCenter.mockResolvedValue(true);
    repository.insert.mockResolvedValue({ attendance_id: 8 });
    await expect(service.create({
      center_id: 99, student_id: 1, teacher_id: 3, class_id: 4, attendance_date: '2026-08-08',
    }, 2)).resolves.toEqual({ attendance_id: 8 });
    expect(repository.insert).toHaveBeenCalledWith([2, 1, 3, 4, null, '2026-08-08', 'Present', undefined]);
  });

  test('preserves explicit session, status, and remarks', async () => {
    repository.studentInCenter.mockResolvedValue(true);
    repository.classInCenter.mockResolvedValue(true);
    await service.create({
      student_id: 1, class_id: 4, session_id: 9, attendance_date: '2026-08-08', status: 'Absent R', remarks: 'Excused',
    }, 2);
    expect(repository.insert).toHaveBeenCalledWith([2, 1, undefined, 4, 9, '2026-08-08', 'Absent R', 'Excused']);
  });

  test('updates only mutable attendance fields with actor scope', () => {
    service.update(8, { status: 'Late', remarks: 'Traffic', student_id: 999 }, 2, 3);
    expect(repository.update).toHaveBeenCalledWith(8, ['Late', 'Traffic'], 2, 3);
  });
});
