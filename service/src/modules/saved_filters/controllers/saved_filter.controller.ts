const savedFilterService = require('../services/saved_filter.service');

const getMyFilters = async (req: any, res: any) => {
  try {
    const userType = req.user?.userType;
    const userId = req.user?.id;
    const { centerId, isGlobal } = require('../../../shared/tenant').getScopedCenterId(req);
    const { entity } = req.query;
    if (!userType || !userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const rows = await savedFilterService.listMine(userType, userId, centerId ?? undefined, entity);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch saved filters', details: error.message || String(error) });
  }
};

const createFilter = async (req: any, res: any) => {
  try {
    const userType = req.user?.userType;
    const userId = req.user?.id;
    const { centerId, isGlobal } = require('../../../shared/tenant').getScopedCenterId(req);
    if (!userType || !userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await savedFilterService.create(userType, userId, centerId ?? req.body.center_id, req.body);
    if (out.error === 'validation') {
      return res.status(400).json({ error: 'name, entity, and filters_json are required' });
    }
    res.status(201).json({ message: 'Filter saved', filter: (out as any).row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save filter', details: error.message || String(error) });
  }
};

const updateFilter = async (req: any, res: any) => {
  try {
    const userType = req.user?.userType;
    const userId = req.user?.id;
    const { centerId, isGlobal } = require('../../../shared/tenant').getScopedCenterId(req);
    if (!userType || !userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await savedFilterService.update(Number(req.params.id), userType, userId, centerId ?? req.body.center_id, req.body);
    if (!row) return res.status(404).json({ error: 'Filter not found' });
    res.json({ message: 'Filter updated', filter: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update filter', details: error.message || String(error) });
  }
};

const deleteFilter = async (req: any, res: any) => {
  try {
    const userType = req.user?.userType;
    const userId = req.user?.id;
    const { centerId, isGlobal } = require('../../../shared/tenant').getScopedCenterId(req);
    if (!userType || !userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await savedFilterService.remove(Number(req.params.id), userType, userId, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Filter not found' });
    res.json({ message: 'Filter deleted', filter: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete filter', details: error.message || String(error) });
  }
};

module.exports = { getMyFilters, createFilter, updateFilter, deleteFilter };

export {};
