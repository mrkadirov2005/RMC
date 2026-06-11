const archiveService = require('../services/archive.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getArchive = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const archive = await archiveService.listArchive(centerId ?? undefined);
    res.json(archive);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch archive', details: error.message || String(error) });
  }
};

module.exports = { getArchive };

export {};
