const service = require('../services/telegram_registration.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const listRegistrations = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const status = String(req.query.status || '').trim() || undefined;
    const rows = await service.listRegistrations(centerId ?? undefined, status);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch Telegram registrations', details: error.message || String(error) });
  }
};

const convertRegistration = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const assignData = {
      class_id: req.body?.class_id ? Number(req.body.class_id) : undefined,
      teacher_id: req.body?.teacher_id ? Number(req.body.teacher_id) : undefined,
    };
    const result = await service.convertRegistration(Number(req.params.id), centerId ?? undefined, assignData);
    if (result?.error === 'not_found') return res.status(404).json({ error: 'Registration not found' });
    if (result?.error === 'already_imported') return res.status(409).json({ error: 'Registration is already imported' });
    if (result?.error === 'center_required') return res.status(400).json({ error: 'Center is required to import this registration' });
    res.status(201).json({ message: 'Registration imported into students', ...result });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'Student cannot be created because username or enrollment number already exists',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to import Telegram registration', details: error.message || String(error) });
  }
};

const rejectRegistration = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await service.rejectRegistration(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Registration not found' });
    res.json({ message: 'Registration rejected', registration: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to reject Telegram registration', details: error.message || String(error) });
  }
};

module.exports = { listRegistrations, convertRegistration, rejectRegistration };

export {};
