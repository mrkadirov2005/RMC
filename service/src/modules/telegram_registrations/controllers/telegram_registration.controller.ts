const service = require('../services/telegram_registration.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const listRegistrations = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const status = String(req.query.status || '').trim() || undefined;
    const rows = await service.listRegistrations(centerId ?? undefined, status);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Telegram arizalarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const convertRegistration = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const assignData = {
      class_id: req.body?.class_id ? Number(req.body.class_id) : undefined,
      teacher_id: req.body?.teacher_id ? Number(req.body.teacher_id) : undefined,
    };
    const result = await service.convertRegistration(Number(req.params.id), centerId ?? undefined, assignData);
    if (result?.error === 'not_found') return res.status(404).json({ error: 'Ariza topilmadi' });
    if (result?.error === 'already_imported') return res.status(409).json({ error: 'Ariza allaqachon import qilingan' });
    if (result?.error === 'center_required') return res.status(400).json({ error: "Bu arizani import qilish uchun markaz ko'rsatilishi shart" });
    res.status(201).json({ message: "Ariza o'quvchilarga import qilindi", ...result });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23505') {
      return res.status(409).json({
        error: "O'quvchini yaratib bo'lmadi: foydalanuvchi nomi yoki ro'yxat raqami allaqachon mavjud",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "Telegram arizasini import qilib bo'lmadi", details: error.message || String(error) });
  }
};

const rejectRegistration = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await service.rejectRegistration(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Ariza topilmadi' });
    res.json({ message: 'Ariza rad etildi', registration: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Telegram arizasini rad etib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = { listRegistrations, convertRegistration, rejectRegistration };

export {};
