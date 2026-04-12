const notificationRepository = require('../repositories/notification.repository');

const listForUser = (userType: string, userId: number, centerId?: number) =>
  notificationRepository.findByUser(userType, userId, centerId);

const create = (body: any, centerId?: number) => {
  const { user_type, user_id, title, message, type } = body;
  if (!user_type || !user_id || !title || !message) {
    return { error: 'validation' as const };
  }
  if (!centerId) {
    return { error: 'validation' as const };
  }
  return notificationRepository.insert([centerId, user_type, user_id, title, message, type || 'info']).then((row: any) => ({ row }));
};

const markAsRead = (id: number, userType: string, userId: number, centerId?: number) =>
  notificationRepository.markRead(id, userType, userId, centerId);

const deleteNotification = (id: number, userType: string, userId: number, centerId?: number) =>
  notificationRepository.remove(id, userType, userId, centerId);

module.exports = { listForUser, create, markAsRead, deleteNotification };

export {};
