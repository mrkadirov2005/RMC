const absenceAlertService = require('../services/absenceAlert.service');
const { getScopedCenterId } = require('../../../shared/tenant');

// Teachers see their own groups' alerts; admins their branch; the owner the active branch, or
// every branch when none is selected.
const getAlerts = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const teacherId = req.user?.userType === 'teacher' ? Number(req.user.id) : undefined;
    res.json(await absenceAlertService.listAlerts({ centerId: centerId ?? undefined, teacherId }));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomat ogohlantirishlarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

// Only admins and the owner close an alert, after the teacher has told them why.
const resolveAlert = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const studentId = Number(req.body?.student_id);
    const classId = Number(req.body?.class_id);
    if (!studentId || !classId) {
      return res.status(400).json({ error: "student_id va class_id ko'rsatilishi shart." });
    }
    const out = await absenceAlertService.resolveAlert({
      studentId,
      classId,
      outcome: String(req.body?.outcome || ''),
      note: req.body?.note,
      centerId: centerId ?? undefined,
      actingUser: req.user,
    });
    if (out?.error === 'invalid_outcome') return res.status(400).json({ error: "Natija noto'g'ri." });
    if (out?.error === 'not_found') return res.status(404).json({ error: 'Ochiq ogohlantirish topilmadi.' });
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ogohlantirishni yopib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = { getAlerts, resolveAlert };

export {};
