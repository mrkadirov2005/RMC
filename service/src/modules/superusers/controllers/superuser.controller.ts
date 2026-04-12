const { generateToken } = require('../../../middleware/auth');
const superuserService = require('../services/superuser.service');
const { isCenterAdmin } = require('../../../shared/tenant');

const getAllSuperusers = async (req: any, res: any) => {
  try {
    res.json(await superuserService.listSuperusers(req.user));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superusers', details: error.message || String(error) });
  }
};

const getSuperuserById = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    if (isCenterAdmin(req.user)) {
      const existing = await superuserService.getSuperuser(requestedId);
      if (existing && Number(existing.center_id) !== Number(req.user?.center_id)) {
        return res.status(403).json({ error: 'Center scope required.' });
      }
      if (!existing) return res.status(404).json({ error: 'Superuser not found' });
      return res.json(existing);
    }
    const row = await superuserService.getSuperuser(requestedId, req.user);
    if (!row) return res.status(404).json({ error: 'Superuser not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch superuser', details: error.message || String(error) });
  }
};

const createSuperuser = async (req: any, res: any) => {
  try {
    const out = await superuserService.createSuperuser(req.body, req.user);
    if (out.error === 'no_center') {
      return res.status(400).json({ error: 'No centers available. Please create a center first.' });
    }
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create superuser', details: error.message || String(error) });
  }
};

const updateSuperuser = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    if (isCenterAdmin(req.user)) {
      const existing = await superuserService.getSuperuser(requestedId);
      if (existing && Number(existing.center_id) !== Number(req.user?.center_id)) {
        return res.status(403).json({ error: 'Center scope required.' });
      }
      if (!existing) return res.status(404).json({ error: 'Superuser not found' });
    }
    const row = await superuserService.updateSuperuser(requestedId, req.body, req.user);
    if (!row) return res.status(404).json({ error: 'Superuser not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update superuser', details: error.message || String(error) });
  }
};

const deleteSuperuser = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    if (isCenterAdmin(req.user)) {
      const existing = await superuserService.getSuperuser(requestedId);
      if (existing && Number(existing.center_id) !== Number(req.user?.center_id)) {
        return res.status(403).json({ error: 'Center scope required.' });
      }
      if (!existing) return res.status(404).json({ error: 'Superuser not found' });
    }
    const row = await superuserService.deleteSuperuser(requestedId, req.user);
    if (!row) return res.status(404).json({ error: 'Superuser not found' });
    res.json({ message: 'Superuser deleted successfully', superuser: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete superuser', details: error.message || String(error) });
  }
};

const login = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const result = await superuserService.authenticate(username, password);
    if (result.kind === 'locked') {
      return res.status(403).json({ error: 'Account is locked' });
    }
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { superuser } = result;
    const token = generateToken({
      id: superuser.superuser_id,
      username: superuser.username,
      email: superuser.email,
      userType: 'superuser',
      role: superuser.role,
      center_id: superuser.center_id,
    });
    res.json({
      message: 'Login successful',
      token,
      superuser: {
        superuser_id: superuser.superuser_id,
        center_id: superuser.center_id,
        username: superuser.username,
        email: superuser.email,
        first_name: superuser.first_name,
        last_name: superuser.last_name,
        role: superuser.role,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || String(error) });
  }
};

const changePassword = async (req: any, res: any) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }
    const out = await superuserService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: 'Superuser not found' });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || String(error) });
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
