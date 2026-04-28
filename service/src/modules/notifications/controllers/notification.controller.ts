const { logAudit } = require('../../../utils/audit');
const notificationService = require('../services/notification.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentInCenter, teacherInCenter, superuserInCenter } = require('../../../shared/tenantDb');

const getMyNotifications = async (req: any, res: any) => {
  try {
    const userType = req.user?.userType;
    const userId = req.user?.id;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!userType || !userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const rows = await notificationService.listForUser(userType, userId, centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message || String(error) });
  }
};

const createNotification = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await notificationService.create(req.body, centerId ?? req.body.center_id);
    if (centerId) {
      const targetType = String(req.body.user_type || '').toLowerCase();
      const targetId = Number(req.body.user_id);
      let allowed = false;
      if (targetType === 'student') allowed = await studentInCenter(targetId, centerId);
      else if (targetType === 'teacher') allowed = await teacherInCenter(targetId, centerId);
      else if (targetType === 'superuser') allowed = await superuserInCenter(targetId, centerId);
      else return res.status(400).json({ error: 'Unsupported recipient type for center admin.' });
      if (!allowed) {
        return res.status(403).json({ error: 'Recipient does not belong to this center.' });
      }
    }
    const { row } = out as { row: any };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'notification',
      entity_id: row?.notification_id,
      center_id: centerId ?? undefined,
      details: { user_type: req.body.user_type, user_id: req.body.user_id, title: req.body.title, type: req.body.type || 'info' },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Notification created', notification: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create notification', details: error.message || String(error) });
  }
};

const markAsRead = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await notificationService.markAsRead(Number(req.params.id), req.user?.userType, req.user?.id, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read', notification: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update notification', details: error.message || String(error) });
  }
};

const deleteNotification = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await notificationService.deleteNotification(Number(req.params.id), req.user?.userType, req.user?.id, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted', notification: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete notification', details: error.message || String(error) });
  }
};

module.exports = { getMyNotifications, createNotification, markAsRead, deleteNotification };

export {};
