const { generateToken } = require('../../../middleware/auth');
const studentService = require('../services/student.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');
const { hasStudentListParams, parseStudentListQuery } = require('./studentListQuery');
const studentCoinsController = require('./studentCoins.controller');

const getAcquisitionSources = async (_req: any, res: any) => {
  try { res.json(await studentService.listAcquisitionSources()); }
  catch (error: any) { res.status(500).json({ error: "Manbalarni yuklab bo'lmadi", details: error.message }); }
};

const createAcquisitionSource = async (req: any, res: any) => {
  try {
    const name = String(req.body?.source_name || '').trim();
    if (!name) return res.status(400).json({ error: "source_name ko'rsatilishi shart" });
    res.status(201).json(await studentService.createAcquisitionSource(name));
  } catch (error: any) { res.status(500).json({ error: "Manbani yaratib bo'lmadi", details: error.message }); }
};

const getActionReasons = async (req: any, res: any) => {
  try {
    const reasonType = String(req.query?.type || '').trim();
    if (reasonType !== 'transfer' && reasonType !== 'delete') return res.status(400).json({ error: "type qiymati transfer yoki delete bo'lishi kerak" });
    res.json(await studentService.listActionReasons(reasonType));
  } catch (error: any) { res.status(500).json({ error: "Sabablarni yuklab bo'lmadi", details: error.message }); }
};

const createActionReason = async (req: any, res: any) => {
  try {
    const reasonType = String(req.body?.reason_type || '').trim();
    const name = String(req.body?.reason_name || '').trim();
    if (reasonType !== 'transfer' && reasonType !== 'delete') return res.status(400).json({ error: "reason_type qiymati transfer yoki delete bo'lishi kerak" });
    if (!name) return res.status(400).json({ error: "reason_name ko'rsatilishi shart" });
    res.status(201).json(await studentService.createActionReason(reasonType, name));
  } catch (error: any) { res.status(500).json({ error: "Sababni yaratib bo'lmadi", details: error.message }); }
};

const getAllStudents = async (req: any, res: any) => {
  try {
    if (typeof res.set === 'function') {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (hasStudentListParams(req.query)) {
      const result = await studentService.listStudentsPaginated(parseStudentListQuery(req.query), centerId ?? undefined, teacherId);
      return res.json(result);
    }
    const rows = await studentService.listStudents(centerId ?? undefined, teacherId);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchilarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getStudentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const row = await studentService.getStudent(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getDeletedStudents = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    const rows = await studentService.listDeletedStudents(centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'chirilgan o'quvchilarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getClassStudentsWithTransfers = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.classId) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const excludeTransferred = ['1', 'true'].includes(String(req.query?.exclude_transferred || '').toLowerCase());
    const rows = await studentService.listClassStudentsWithTransfers(Number(req.params.classId), centerId ?? undefined, teacherId, excludeTransferred);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruh o'quvchilarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

// Before/after videos: admins and the owner set the links; a teacher can view their own students'.
const getStudentVideos = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const studentId = Number(req.params.id);
    if (req.user?.userType === 'student') return res.status(403).json({ error: 'Kirish rad etildi.' });
    if (req.user?.userType === 'teacher' && !(await studentBelongsToTeacher(studentId, req.user?.id))) {
      return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    const row = await studentService.getVideos(studentId, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Videolarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveStudentVideos = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const out = await studentService.saveVideos(Number(req.params.id), req.body, centerId ?? undefined);
    if (out?.error === 'invalid_url') {
      return res.status(400).json({ error: "Faqat Loom, Google Drive yoki YouTube havolasi (https) qabul qilinadi." });
    }
    if (!out) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Videolarni saqlab bo'lmadi", details: error.message || String(error) });
  }
};

const createStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const payload = { ...req.body, center_id: centerId };
    if (req.user?.userType === 'teacher') {
      // Teachers should not be able to freeze/unfreeze students.
      delete payload.is_frozen;
    }
    const row = await studentService.createStudent(payload);
    res.status(201).json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      // PostgreSQL unique_violation error code
      if (error.constraint === 'students_username_key' || error.message?.includes('username')) {
        return res.status(409).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud', message: "Bunday foydalanuvchi nomiga ega o'quvchi allaqachon mavjud. Iltimos, boshqa foydalanuvchi nomini tanlang." });
      }
      if (error.constraint === 'students_enrollment_number_key' || error.message?.includes('enrollment')) {
        return res.status(409).json({ error: "Ro'yxat raqami allaqachon mavjud", message: "Bu ro'yxat raqamiga ega o'quvchi allaqachon mavjud. Iltimos, boshqa raqam tanlang." });
      }
    }
    
    res.status(500).json({ error: "O'quvchini yaratib bo'lmadi", message: error.message || String(error) });
  }
};

const updateStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const payload = { ...req.body };
    if (req.user?.userType === 'teacher') {
      // Teachers can edit student profile fields, but cannot freeze/unfreeze or reassign teacher ownership.
      delete payload.is_frozen;
      delete payload.teacher_id;
    }
    const row = await studentService.updateStudent(Number(req.params.id), payload, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const row = await studentService.deleteStudent(Number(req.params.id), Number(req.body.reason_id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json({ message: "O'quvchi muvaffaqiyatli o'chirildi", student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const purgeStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const row = await studentService.purgeStudent(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "O'chirilgan o'quvchi topilmadi" });
    res.json({ message: "O'quvchi butunlay o'chirildi", student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: "O'quvchi boshqa yozuvlarda hali ishlatilmoqda",
        message: "Bu yozuvni butunlay o'chirishdan oldin bog'liq yozuvlarni o'chiring yoki boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "O'quvchini butunlay o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const transferStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const result = await studentService.transferStudent(
      Number(req.params.id),
      Number(req.body.target_class_id),
      Number(req.body.reason_id),
      centerId ?? undefined,
      teacherId
    );

    if (result?.error === 'not_found') return res.status(404).json({ error: "O'quvchi topilmadi" });
    if (result?.error === 'target_class_not_found') return res.status(404).json({ error: 'Maqsadli guruh topilmadi' });
    if (result?.error === 'same_class' || result?.error === 'already_in_group') return res.status(400).json({ error: "O'quvchi allaqachon shu guruhda" });

    res.status(201).json({
      message: "O'quvchi muvaffaqiyatli ko'chirildi",
      transferred_student: result.transferred,
      student: result.student,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini ko'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const getStudentGroups = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' || req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const groups = await studentService.listLinkedGroups(Number(req.params.id), centerId ?? undefined);
    if (groups.length === 0) return res.status(404).json({ error: "O'quvchi topilmadi" });
    const main = groups.find((group: any) => group.is_main) || groups[0];
    res.json({
      main_student_id: main.student_id,
      total_coins: groups.reduce((sum: number, group: any) => sum + Number(group.coins || 0), 0),
      groups,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchi guruhlarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const assignStudentToGroup = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' || req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const result = await studentService.assignToGroup(Number(req.params.id), Number(req.body.class_id), centerId ?? undefined);
    if (result?.error === 'not_found') return res.status(404).json({ error: "O'quvchi topilmadi" });
    if (result?.error === 'target_class_not_found') return res.status(404).json({ error: 'Guruh topilmadi' });
    if (result?.error === 'already_in_group') return res.status(400).json({ error: "O'quvchi allaqachon shu guruhda" });
    res.status(201).json({ message: "O'quvchi yangi guruhga qo'shildi", student: result.student, main_student_id: result.main_student_id });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini guruhga qo'shib bo'lmadi", details: error.message || String(error) });
  }
};

const studentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await studentService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: "O'quvchi hisobi faol emas" });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { student } = result;
    const token = generateToken({
      id: student.student_id,
      email: student.email,
      userType: 'student',
      class_id: student.class_id,
      center_id: student.center_id,
      is_frozen: Boolean(student.is_frozen),
    });
    res.json({
      message: 'Tizimga muvaffaqiyatli kirildi',
      token,
      student: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        class_id: student.class_id,
        center_id: student.center_id,
        is_frozen: Boolean(student.is_frozen),
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Tizimga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const setStudentPassword = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'teacher' || req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const row = await studentService.setPasswordByAdmin(Number(req.params.id), username, password, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json({ message: "O'quvchi paroli muvaffaqiyatli o'rnatildi", student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'rnatib bo'lmadi", details: error.message || String(error) });
  }
};

const changeStudentPassword = async (req: any, res: any) => {
  try {
    const { old_password, new_password } = req.body;
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const out = await studentService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: "O'quvchi topilmadi" });
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });
    }
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'zgartirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getStudentVideos,
  saveStudentVideos,
  getAcquisitionSources,
  createAcquisitionSource,
  getActionReasons,
  createActionReason,
  getAllStudents,
  getStudentById,
  getDeletedStudents,
  getClassStudentsWithTransfers,
  createStudent,
  updateStudent,
  deleteStudent,
  purgeStudent,
  transferStudent,
  getStudentGroups,
  assignStudentToGroup,
  studentLogin,
  setStudentPassword,
  changeStudentPassword,
  getStudentCoins: studentCoinsController.getStudentCoins,
  addStudentCoins: studentCoinsController.addStudentCoins,
  updateStudentCoinTransaction: studentCoinsController.updateStudentCoinTransaction,
  deleteStudentCoinTransaction: studentCoinsController.deleteStudentCoinTransaction,
};

export {};
