const searchService = require('../services/search.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const search = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    let entity = req.query.entity;
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (teacherId && entity && entity !== 'students') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (teacherId && !entity) {
      entity = 'students';
    }
    const out = await searchService.runSearch(req.query.q, entity, req.query.limit, centerId ?? undefined, teacherId);
    res.json((out as any).results);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to search', details: error.message || String(error) });
  }
};

module.exports = { search };

export {};
