const { generateToken } = require('../../../middleware/auth');
const parentService = require('../services/parent.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllParents = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    res.json(await parentService.listParents(centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-onalarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getParentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await parentService.getParent(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Ota-ona topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-onani yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createParent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await parentService.createParent({ ...req.body, center_id: centerId });
    res.status(201).json({ message: 'Ota-ona yaratildi', parent: (out as any).row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-onani yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateParent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await parentService.updateParent(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Ota-ona topilmadi' });
    res.json({ message: 'Ota-ona yangilandi', parent: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-onani yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteParent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await parentService.deleteParent(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Ota-ona topilmadi' });
    res.json({ message: "Ota-ona o'chirildi", parent: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-onani o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const assignStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const out = await parentService.assignStudent(req.body, centerId ?? undefined);
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: "O'quvchi bu markazga tegishli emas." });
    }
    res.status(201).json({ message: "O'quvchi ota-onaga biriktirildi" });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'quvchini biriktirib bo'lmadi", details: error.message || String(error) });
  }
};

const parentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await parentService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Ota-ona hisobi faol emas' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { parent } = result;
    const token = generateToken({
      id: parent.parent_id,
      email: parent.email,
      userType: 'parent',
    });
    res.json({
      message: 'Tizimga muvaffaqiyatli kirildi',
      token,
      parent: {
        parent_id: parent.parent_id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Tizimga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const getMyStudents = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudents(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-ona o'quvchilarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getMyStudentPayments = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentPayments(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lovlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getMyStudentAttendance = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentAttendance(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getMyStudentGrades = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentGrades(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Baholarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getMyStudentTests = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentTests(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Topshirilgan testlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  assignStudent,
  parentLogin,
  getMyStudents,
  getMyStudentPayments,
  getMyStudentAttendance,
  getMyStudentGrades,
  getMyStudentTests,
};

export {};
