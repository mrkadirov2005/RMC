jest.mock('../../repositories/notification.repository', () => ({ findByUser: jest.fn(), insert: jest.fn(), markRead: jest.fn(), remove: jest.fn() }));
const repository = require('../../repositories/notification.repository');
const service = require('../notification.service');

describe('notification service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('lists, marks, and deletes only the actor notification scope', () => {
    service.listForUser('teacher', 4, 2); service.markAsRead(1, 'teacher', 4, 2); service.deleteNotification(1, 'teacher', 4, 2);
    expect(repository.findByUser).toHaveBeenCalledWith('teacher', 4, 2);
    expect(repository.markRead).toHaveBeenCalledWith(1, 'teacher', 4, 2);
    expect(repository.remove).toHaveBeenCalledWith(1, 'teacher', 4, 2);
  });
  test('creates a center-scoped notification with info default', async () => {
    repository.insert.mockResolvedValue({ notification_id: 1 });
    await expect(service.create({ user_type: 'student', user_id: 7, title: 'A', message: 'B' }, 2)).resolves.toEqual({ row: { notification_id: 1 } });
    expect(repository.insert).toHaveBeenCalledWith([2, 'student', 7, 'A', 'B', 'info']);
  });
});
