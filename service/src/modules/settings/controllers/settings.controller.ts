const settingsService = require('../services/settings.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getLessonScoring = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    res.json(await settingsService.getLessonScoring(centerId ?? undefined));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch lesson scoring settings', details: error.message || String(error) });
  }
};

const saveLessonScoring = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for settings.' });
    }
    res.json(await settingsService.saveLessonScoring(req.body, centerId ?? req.body.center_id));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save lesson scoring settings', details: error.message || String(error) });
  }
};

module.exports = { getLessonScoring, saveLessonScoring };

export {};
