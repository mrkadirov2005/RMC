const { generateToken } = require('../../../middleware/auth');
const superuserService = require('../services/superuser.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllSuperusers = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    res.json(await superuserService.listSuperusers(centerId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Superuserlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getSuperuserById = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    const { centerId } = getScopedCenterId(req);
    const row = await superuserService.getSuperuser(requestedId, centerId);
    if (!row) return res.status(404).json({ error: 'Superuser topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Superuserni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createSuperuser = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    const out = await superuserService.createSuperuser(req.body, req.user, centerId);
    if (out.error === 'branch_required') {
      return res.status(400).json({ error: 'Branch is required. Please select a branch first.' });
    }
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    }
    if (out.error === 'forbidden_role') {
      return res.status(403).json({ error: 'Only owners can assign the owner role.' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Superuserni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateSuperuser = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    const { centerId } = getScopedCenterId(req);
    const out = await superuserService.updateSuperuser(requestedId, req.body, req.user, centerId);
    if (out.error === 'forbidden_role') {
      return res.status(403).json({ error: 'Only owners can assign the owner role.' });
    }
    if (!out.row) return res.status(404).json({ error: 'Superuser topilmadi' });
    res.json(out.row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Superuserni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteSuperuser = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    const { centerId } = getScopedCenterId(req);
    const out = await superuserService.deleteSuperuser(requestedId, req.user, centerId);
    if (out.error === 'forbidden_role') {
      return res.status(403).json({ error: 'Only owners can delete an owner account.' });
    }
    if (!out.row) return res.status(404).json({ error: 'Superuser topilmadi' });
    res.json({ message: "Superuser muvaffaqiyatli o'chirildi", superuser: out.row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Superuserni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const login = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await superuserService.authenticate(username, password);
    if (result.kind === 'locked') {
      return res.status(403).json({ error: 'Account is locked' });
    }
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { superuser } = result;
    const token = generateToken({
      id: superuser.superuser_id,
      username: superuser.username,
      email: superuser.email,
      userType: 'superuser',
      role: superuser.role,
      permissions: superuser.permissions,
      branch_id: superuser.branch_id,
      center_id: superuser.center_id,
      can_hard_delete: Boolean(superuser.can_hard_delete),
    });
    res.json({
      message: 'Tizimga muvaffaqiyatli kirildi',
      token,
      superuser: {
        superuser_id: superuser.superuser_id,
        branch_id: superuser.branch_id,
        permissions: superuser.permissions,
        center_id: superuser.center_id,
        username: superuser.username,
        email: superuser.email,
        first_name: superuser.first_name,
        last_name: superuser.last_name,
        role: superuser.role,
        can_hard_delete: Boolean(superuser.can_hard_delete),
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Tizimga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const changePassword = async (req: any, res: any) => {
  try {
    const { old_password, new_password } = req.body;
    const out = await superuserService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: 'Superuser topilmadi' });
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });
    }
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'zgartirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllSuperusers,
  getSuperuserById,
  createSuperuser,
  updateSuperuser,
  deleteSuperuser,
  login,
  changePassword,
};

export {};
