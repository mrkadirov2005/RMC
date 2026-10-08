const { generateToken, generatePaymentToken } = require('../../../middleware/auth');
const teacherService = require('../services/teacher.service');
const teacherPaymentService = require('../services/teacher_payment.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const toPositiveInt = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const cleanString = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

const hasTeacherListParams = (query: Record<string, unknown>) =>
  ['q', 'search', 'status', 'page', 'limit'].some((key) => query[key] !== undefined && query[key] !== '');

const parseTeacherListQuery = (query: Record<string, unknown>) => ({
  q: cleanString(query.q || query.search),
  status: cleanString(query.status),
  page: toPositiveInt(query.page) || 1,
  limit: Math.min(100, toPositiveInt(query.limit) || 20),
});

const getMyProfile = async (req: any, res: any) => {
  try {
    const teacherId = Number(req.user?.id);
    if (!teacherId) {
      return res.status(400).json({ error: "O'qituvchi ID sini aniqlab bo'lmadi." });
    }
    const { centerId } = getScopedCenterId(req);
    const teacher = await teacherService.getTeacher(teacherId, centerId ?? undefined);
    if (!teacher) {
      return res.status(404).json({ error: "O'qituvchi topilmadi." });
    }
    res.json({
      teacher_id: teacher.teacher_id,
      employee_id: teacher.employee_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      center_id: teacher.center_id,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Profilni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

// A teacher's salary share (%) is the owner's business: admins see salary amounts only, and a
// teacher sees only their own share. Everyone else gets teachers without it.
const isOwner = (user: any) => user?.userType === 'superuser' && String(user?.role || '').toLowerCase() === 'owner';

const hideSalaryShare = (req: any, row: any) => {
  if (!row || typeof row !== 'object' || isOwner(req.user)) return row;
  if (req.user?.userType === 'teacher' && Number(row.teacher_id) === Number(req.user?.id)) return row;
  const { salary_percentage: _hidden, ...rest } = row;
  return rest;
};

const hideSalaryShares = (req: any, payload: any) => {
  if (Array.isArray(payload)) return payload.map((row) => hideSalaryShare(req, row));
  if (payload && Array.isArray(payload.data)) return { ...payload, data: payload.data.map((row: any) => hideSalaryShare(req, row)) };
  if (payload && Array.isArray(payload.items)) return { ...payload, items: payload.items.map((row: any) => hideSalaryShare(req, row)) };
  return hideSalaryShare(req, payload);
};

/** Only the owner sets a teacher's salary share. */
const withoutShareUnlessOwner = (req: any, body: any) => {
  if (isOwner(req.user) || !body || typeof body !== 'object') return body;
  const { salary_percentage: _ignored, ...rest } = body;
  return rest;
};

const getAllTeachers = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    if (hasTeacherListParams(req.query)) {
      const result = await teacherService.listTeachersPaginated(parseTeacherListQuery(req.query), centerId ?? undefined);
      return res.json(hideSalaryShares(req, result));
    }
    const rows = await teacherService.listTeachers(centerId ?? undefined);
    res.json(hideSalaryShares(req, rows));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchilarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getTeacherById = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    const row = await teacherService.getTeacher(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "O'qituvchi topilmadi" });
    res.json(hideSalaryShare(req, row));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await teacherService.createTeacher({ ...withoutShareUnlessOwner(req, req.body), center_id: centerId });
    if (out.error === 'validation') {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: out.details });
    }
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    }
    res.status(201).json(hideSalaryShare(req, (out as any).row));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchini yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await teacherService.updateTeacher(Number(req.params.id), withoutShareUnlessOwner(req, req.body), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "O'qituvchi topilmadi" });
    res.json(hideSalaryShare(req, row));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const force = String(req.query.force || req.body?.force || '').toLowerCase() === 'true';
    const result = await teacherService.deleteTeacher(Number(req.params.id), centerId ?? undefined, { force });
    if (result?.kind === 'not_found') return res.status(404).json({ error: "O'qituvchi topilmadi", message: "O'qituvchi topilmadi" });
    if (result?.kind === 'blocked') {
      return res.status(409).json({
        error: "O'qituvchida davomat yoki baho yozuvlari mavjud",
        message: "O'qituvchini o'chirib bo'lmaydi: davomat yoki baho yozuvlari hali ham unga bog'langan.",
        reason: result.reason,
        dependencies: result.dependencies,
      });
    }
    if (result?.kind === 'has_dependencies') {
      return res.status(409).json({
        error: "O'qituvchi faol yozuvlarga biriktirilgan",
        message: "O'qituvchi guruhlar, o'quvchilar, fanlar, vazifalar yoki sessiyalarga biriktirilgan. Avval ularni boshqasiga o'tkazing yoki force=true bilan qayta urinib, biriktirishni bekor qiling.",
        dependencies: result.dependencies,
      });
    }
    res.json({ message: "O'qituvchi muvaffaqiyatli o'chirildi", teacher: result.row, unassigned: result.dependencies });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: "O'qituvchi boshqa yozuvlarda hali ishlatilmoqda",
        message: "O'qituvchi boshqa yozuvlarda hali ishlatilmoqda. O'chirishdan oldin bog'liq yozuvlarni boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "O'qituvchini o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const purgeTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const result = await teacherService.purgeTeacher(Number(req.params.id), centerId ?? undefined);
    if (result?.kind === 'not_found') {
      return res.status(404).json({ error: "O'chirilgan o'qituvchi topilmadi", message: "O'chirilgan o'qituvchi topilmadi" });
    }
    res.json({ message: "O'qituvchi butunlay o'chirildi", teacher: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: "O'qituvchi boshqa yozuvlarda hali ishlatilmoqda",
        message: "Bu o'qituvchini butunlay o'chirishdan oldin bog'liq yozuvlarni boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "O'qituvchini butunlay o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const teacherLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await teacherService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: "O'qituvchi hisobi faol emas" });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { teacher } = result;
    const token = generateToken({
      id: teacher.teacher_id,
      email: teacher.email,
      userType: 'teacher',
      center_id: teacher.center_id,
    });
    res.json({
      message: 'Tizimga muvaffaqiyatli kirildi',
      token,
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        center_id: teacher.center_id,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Tizimga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const setTeacherPaymentPassword = async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const teacher = await teacherService.getTeacher(Number(req.params.id), centerId ?? undefined);
    if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });
    const row = await teacherPaymentService.setPaymentPassword(Number(req.params.id), password, req.user?.id);
    if (!row) return res.status(404).json({ error: "O'qituvchi topilmadi" });
    res.json({ message: "To'lovlarga kirish paroli muvaffaqiyatli o'rnatildi." });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov parolini o'rnatib bo'lmadi", details: error.message || String(error) });
  }
};

const teacherPaymentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await teacherPaymentService.authenticatePaymentAccess(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: "O'qituvchi hisobi faol emas" });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { teacher } = result;
    const token = generatePaymentToken({
      id: teacher.teacher_id,
      email: teacher.email,
      userType: 'teacher',
      center_id: teacher.center_id,
      payment_access: true,
    });
    res.json({
      message: "To'lovlarga kirishga ruxsat berildi",
      token,
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        center_id: teacher.center_id,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lovlar bo'limiga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const setTeacherPassword = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await teacherService.setPasswordByAdmin(Number(req.params.id), username, password, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "O'qituvchi topilmadi" });
    res.json({ message: "O'qituvchi paroli muvaffaqiyatli o'rnatildi", teacher: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'rnatib bo'lmadi", details: error.message || String(error) });
  }
};

const changeTeacherPassword = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher' && Number(req.user.id) !== Number(req.params.id)) {
      return res.status(403).json({ error: "Siz faqat o'z parolingizni o'zgartira olasiz." });
    }
    const { old_password, new_password } = req.body;
    const out = await teacherService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: "O'qituvchi topilmadi" });
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });
    }
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'zgartirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getMyProfile,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  purgeTeacher,
  teacherLogin,
  teacherPaymentLogin,
  setTeacherPaymentPassword,
  setTeacherPassword,
  changeTeacherPassword,
};

export {};
