jest.mock('../../repositories/teacherTask.repository', () => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  remove: jest.fn(),
  getStats: jest.fn(),
}));

const repository = require('../../repositories/teacherTask.repository');
const service = require('../teacherTask.service');

describe('teacher task service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('scopes list/get/update/status/delete through to the repository', () => {
    service.getAllTeacherTasks({ centerId: 2 });
    service.getTeacherTaskById(1, 2, 3, 4);
    service.updateTeacherTask(1, { task_title: 'A' }, 2);
    service.updateTeacherTaskStatus(1, { status: 'accepted', statusNote: null }, { centerId: 2 });
    service.deleteTeacherTask(1, 2);
    expect(repository.getAll).toHaveBeenCalledWith({ centerId: 2 });
    expect(repository.getById).toHaveBeenCalledWith(1, 2, 3, 4);
    expect(repository.update).toHaveBeenCalledWith(1, { task_title: 'A' }, 2);
    expect(repository.updateStatus).toHaveBeenCalledWith(1, { status: 'accepted', statusNote: null }, { centerId: 2 });
    expect(repository.remove).toHaveBeenCalledWith(1, 2);
  });

  test('creates a task by forwarding the payload as-is', () => {
    service.createTeacherTask({ task_title: 'A' });
    expect(repository.create).toHaveBeenCalledWith({ task_title: 'A' });
  });

  test('computes done efficiency and total from raw status counts', async () => {
    repository.getStats.mockResolvedValue([
      { status: 'pending', count: '2' },
      { status: 'accepted', count: '1' },
      { status: 'done', count: '3' },
      { status: 'unexpected_status', count: '99' },
    ]);
    const stats = await service.getTeacherTaskStats({ centerId: 2 });
    expect(stats).toEqual({
      pending: 2,
      accepted: 1,
      rejected: 0,
      done: 3,
      total: 6,
      efficiency: 50,
    });
  });

  // RMC-025: isValidDeadline now rejects an invalid, non-empty deadline instead of the old
  // toDateOrNull() behavior that silently stored it as NULL with no error.
  describe('isValidDeadline (RMC-025)', () => {
    test('accepts an omitted deadline (undefined, null, or empty string) as valid', () => {
      expect(service.isValidDeadline(undefined)).toBe(true);
      expect(service.isValidDeadline(null)).toBe(true);
      expect(service.isValidDeadline('')).toBe(true);
    });

    test('accepts a valid date string or Date instance', () => {
      expect(service.isValidDeadline('2026-12-31')).toBe(true);
      expect(service.isValidDeadline(new Date('2026-12-31'))).toBe(true);
    });

    test('rejects a non-empty, invalid deadline value rather than silently allowing it', () => {
      expect(service.isValidDeadline('not-a-real-date')).toBe(false);
      expect(service.isValidDeadline('31-31-2026')).toBe(false);
      expect(service.isValidDeadline(new Date('garbage'))).toBe(false);
    });
  });
});
