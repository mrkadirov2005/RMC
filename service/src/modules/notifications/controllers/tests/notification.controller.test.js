jest.mock('../../services/notification.service', () => ({
  listForUser: jest.fn(),
  create: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

jest.mock('../../../../utils/audit', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

jest.mock('../../../../shared/tenantDb', () => ({
  studentInCenter: jest.fn(),
  teacherInCenter: jest.fn(),
  superuserInCenter: jest.fn(),
}));

const notificationController = require('../notification.controller');
const notificationService = require('../../services/notification.service');
const { logAudit } = require('../../../../utils/audit');
const { getScopedCenterId } = require('../../../../shared/tenant');
const { studentInCenter, teacherInCenter, superuserInCenter } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('notifications controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('center scoping applies to every handler', () => {
    const handlers = [
      ['getMyNotifications', {}],
      ['createNotification', { body: {} }],
      ['markAsRead', { params: { id: '1' } }],
      ['deleteNotification', { params: { id: '1' } }],
    ];

    it.each(handlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await notificationController[handler]({ ...req, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(handlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await notificationController[handler]({ ...req, user: { userType: 'superuser', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('getMyNotifications', () => {
    it('refuses an unauthenticated caller before checking the center', async () => {
      const res = createResponse();

      await notificationController.getMyNotifications({ user: {} }, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' });
    });

    it('reads only the signed-in user own notifications', async () => {
      const res = createResponse();
      notificationService.listForUser.mockResolvedValue([{ notification_id: 1 }]);

      await notificationController.getMyNotifications({ user: { userType: 'teacher', id: 5 } }, res);

      expect(notificationService.listForUser).toHaveBeenCalledWith('teacher', 5, 2);
      expect(res.json).toHaveBeenCalledWith([{ notification_id: 1 }]);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      notificationService.listForUser.mockRejectedValue(new Error('offline'));

      await notificationController.getMyNotifications({ user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch notifications', details: 'offline' });
    });
  });

  describe('createNotification', () => {
    it.each([
      ['student', studentInCenter],
      ['teacher', teacherInCenter],
      ['superuser', superuserInCenter],
    ])('checks a %s recipient against the calling center', async (targetType, guard) => {
      const res = createResponse();
      notificationService.create.mockResolvedValue({ row: { notification_id: 3 } });
      guard.mockResolvedValue(true);

      await notificationController.createNotification({
        body: { user_type: targetType, user_id: 4, title: 'Hello' },
        user: { userType: 'admin', id: 1 },
      }, res);

      expect(guard).toHaveBeenCalledWith(4, 2);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('refuses a recipient type a center admin cannot address', async () => {
      const res = createResponse();
      notificationService.create.mockResolvedValue({ row: {} });

      await notificationController.createNotification({
        body: { user_type: 'parent', user_id: 4 },
        user: { userType: 'admin', id: 1 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported recipient type for center admin.' });
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('refuses a recipient who belongs to another center', async () => {
      const res = createResponse();
      notificationService.create.mockResolvedValue({ row: {} });
      studentInCenter.mockResolvedValue(false);

      await notificationController.createNotification({
        body: { user_type: 'student', user_id: 4 },
        user: { userType: 'admin', id: 1 },
      }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Recipient does not belong to this center.' });
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('records an audit entry describing the new notification', async () => {
      const res = createResponse();
      notificationService.create.mockResolvedValue({ row: { notification_id: 3 } });
      studentInCenter.mockResolvedValue(true);

      await notificationController.createNotification({
        body: { user_type: 'student', user_id: 4, title: 'Fees due', type: 'warning' },
        user: { userType: 'admin', id: 1 },
        ip: '10.0.0.5',
      }, res);

      expect(logAudit).toHaveBeenCalledWith({
        user_type: 'admin',
        user_id: 1,
        action: 'CREATE',
        entity_type: 'notification',
        entity_id: 3,
        center_id: 2,
        details: { user_type: 'student', user_id: 4, title: 'Fees due', type: 'warning' },
        ip_address: '10.0.0.5',
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification created', notification: { notification_id: 3 } });
    });

    it('defaults the audited notification type to info', async () => {
      const res = createResponse();
      notificationService.create.mockResolvedValue({ row: { notification_id: 3 } });
      studentInCenter.mockResolvedValue(true);

      await notificationController.createNotification({
        body: { user_type: 'student', user_id: 4, title: 'Fees due' },
        user: { userType: 'admin', id: 1 },
      }, res);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({ type: 'info' }),
      }));
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      notificationService.create.mockRejectedValue(new Error('insert failed'));

      await notificationController.createNotification({ body: {}, user: { userType: 'admin', id: 1 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create notification', details: 'insert failed' });
    });
  });

  describe('markAsRead', () => {
    it('marks only a notification addressed to the caller', async () => {
      const res = createResponse();
      notificationService.markAsRead.mockResolvedValue({ notification_id: 6 });

      await notificationController.markAsRead({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(notificationService.markAsRead).toHaveBeenCalledWith(6, 'teacher', 5, 2);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification marked as read', notification: { notification_id: 6 } });
    });

    it('returns 404 when the notification is not the caller own', async () => {
      const res = createResponse();
      notificationService.markAsRead.mockResolvedValue(null);

      await notificationController.markAsRead({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Notification not found' });
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      notificationService.markAsRead.mockRejectedValue(new Error('conflict'));

      await notificationController.markAsRead({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update notification', details: 'conflict' });
    });
  });

  describe('deleteNotification', () => {
    it('deletes only a notification addressed to the caller', async () => {
      const res = createResponse();
      notificationService.deleteNotification.mockResolvedValue({ notification_id: 6 });

      await notificationController.deleteNotification({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(notificationService.deleteNotification).toHaveBeenCalledWith(6, 'teacher', 5, 2);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted', notification: { notification_id: 6 } });
    });

    it('returns 404 when the notification is not the caller own', async () => {
      const res = createResponse();
      notificationService.deleteNotification.mockResolvedValue(null);

      await notificationController.deleteNotification({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('reports a service failure as a 500', async () => {
      const res = createResponse();
      notificationService.deleteNotification.mockRejectedValue(new Error('locked'));

      await notificationController.deleteNotification({ params: { id: '6' }, user: { userType: 'teacher', id: 5 } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete notification', details: 'locked' });
    });
  });
});
