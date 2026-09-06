jest.mock('../../../classes/repositories/class.repository', () => ({ findById: jest.fn() }));
jest.mock('../../repositories/session.repository', () => ({
  bulkInsert: jest.fn(), findByClass: jest.fn(), findByClasses: jest.fn(), deleteUpcoming: jest.fn(),
  deleteById: jest.fn(), purgeById: jest.fn(), create: jest.fn(),
}));

const classes = require('../../../classes/repositories/class.repository');
const repository = require('../../repositories/session.repository');
const service = require('../session.service');

describe('session service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects missing classes and classes without a usable schedule', async () => {
    classes.findById.mockResolvedValueOnce(null);
    await expect(service.generateMonthlySessions({ classId: 1, month: 2, year: 2024, durationMinutes: 60 }))
      .resolves.toEqual({ error: 'not_found' });
    classes.findById.mockResolvedValueOnce({ section: 'invalid-json' });
    await expect(service.generateMonthlySessions({ classId: 1, month: 2, year: 2024, durationMinutes: 60 }))
      .resolves.toEqual({ error: 'missing_schedule' });
  });

  test('generates bounded leap-month sessions from short and full weekdays', async () => {
    classes.findById.mockResolvedValue({
      center_id: 2, class_id: 7, teacher_id: 4,
      section: JSON.stringify({ days: ['Mon', 'thursday'], time: '09:00', endTime: '10:30' }),
      start_date: '2024-02-05', end_date: '2024-02-29',
    });
    repository.bulkInsert.mockImplementation(async (rows) => ({ created: rows.length - 1 }));
    const result = await service.generateMonthlySessions({ classId: 7, centerId: 2, month: 2, year: 2024, durationMinutes: 45 });
    const rows = repository.bulkInsert.mock.calls[0][0];
    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatchObject({ session_date: '2024-02-05', start_time: '09:00', end_time: '10:30', duration_minutes: 90 });
    expect(rows.at(-1).session_date).toBe('2024-02-29');
    expect(result).toEqual({ created: 7, total: 8, skipped: 1 });
  });

  test('uses fallback duration and calculates an end time across an hour boundary', async () => {
    classes.findById.mockResolvedValue({ center_id: 2, class_id: 7, section: JSON.stringify({ days: [1], time: '09:45' }) });
    repository.bulkInsert.mockResolvedValue({ created: 4 });
    await service.generateMonthlySessions({ classId: 7, month: 4, year: 2024, durationMinutes: 50 });
    expect(repository.bulkInsert.mock.calls[0][0][0]).toMatchObject({ end_time: '10:35', duration_minutes: 50 });
  });

  test('creates a scoped single session with calculated end time', async () => {
    classes.findById.mockResolvedValue({ center_id: 2, class_id: 7, teacher_id: 4 });
    await service.createSession({ classId: 7, centerId: 2, teacherId: 4, sessionDate: '2026-08-08', startTime: '23:40', durationMinutes: 40 });
    expect(repository.create).toHaveBeenCalledWith({
      center_id: 2, class_id: 7, teacher_id: 4, session_date: '2026-08-08', start_time: '23:40', duration_minutes: 40, end_time: '00:20',
    });
  });

  test('rejects creating a session for an absent class', async () => {
    classes.findById.mockResolvedValue(null);
    await expect(service.createSession({ classId: 7, sessionDate: '2026-08-08', startTime: '09:00', durationMinutes: 60 }))
      .resolves.toEqual({ error: 'not_found' });
  });

  test('forwards scoped list and deletion operations', () => {
    service.listByClass(1, 2, 3); service.listByClasses([1, 2], 2, 3);
    service.deleteUpcomingSessions({ classId: 1, fromDate: '2026-01-01', toDate: '2026-02-01', centerId: 2, teacherId: 3 });
    service.deleteSessionById({ classId: 1, sessionId: 8, centerId: 2, teacherId: 3 });
    service.purgeSessionById({ classId: 1, sessionId: 8, centerId: 2, teacherId: 3 });
    expect(repository.findByClass).toHaveBeenCalledWith(1, 2, 3);
    expect(repository.findByClasses).toHaveBeenCalledWith([1, 2], 2, 3);
    expect(repository.deleteUpcoming).toHaveBeenCalledWith(1, '2026-01-01', '2026-02-01', 2, 3);
    expect(repository.deleteById).toHaveBeenCalledWith(1, 8, 2, 3);
    expect(repository.purgeById).toHaveBeenCalledWith(1, 8, 2, 3);
  });
});
