const centerService = require('../services/center.service');
const { isCenterAdmin } = require('../../../shared/tenant');

const getAllCenters = async (req: any, res: any) => {
  try {
    res.json(await centerService.listCenters(req.user));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch centers', details: error.message || String(error) });
  }
};

const getCenterById = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    if (isCenterAdmin(req.user) && Number(req.user?.center_id) !== requestedId) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await centerService.getCenter(requestedId, req.user);
    if (!row) return res.status(404).json({ error: 'Center not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch center', details: error.message || String(error) });
  }
};

const createCenter = async (req: any, res: any) => {
  try {
    if (isCenterAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin users cannot create centers.' });
    }
    res.status(201).json(await centerService.createCenter(req.body));
  } catch (error: any) {
    console.error('Database error in createCenter:', error.message);
    res.status(500).json({ error: 'Failed to create center', details: error.message || String(error) });
  }
};

const updateCenter = async (req: any, res: any) => {
  try {
    const requestedId = Number(req.params.id);
    if (isCenterAdmin(req.user)) {
      const existing = await centerService.getCenter(requestedId);
      if (existing && Number(existing.center_id) !== Number(req.user?.center_id)) {
        return res.status(403).json({ error: 'Center scope required.' });
      }
      if (!existing) return res.status(404).json({ error: 'Center not found' });
    }
    const row = await centerService.updateCenter(requestedId, req.body, req.user);
    if (!row) return res.status(404).json({ error: 'Center not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update center', details: error.message || String(error) });
  }
};

const deleteCenter = async (req: any, res: any) => {
  try {
    if (isCenterAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin users cannot delete centers.' });
    }
    const row = await centerService.deleteCenter(Number(req.params.id), req.user);
    if (!row) return res.status(404).json({ error: 'Center not found' });
    res.json({ message: 'Center deleted successfully', center: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete center', details: error.message || String(error) });
  }
};

module.exports = { getAllCenters, getCenterById, createCenter, updateCenter, deleteCenter };

export {};
