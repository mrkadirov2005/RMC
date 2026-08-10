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

const getOwnerPalette = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId) return res.status(400).json({ error: 'center_id is required for palette settings.' });
    res.json({ palette: await settingsService.getOwnerPalette(centerId) });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch owner palette', details: error.message || String(error) });
  }
};

const saveOwnerPalette = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId) return res.status(400).json({ error: 'center_id is required for palette settings.' });
    const palette = await settingsService.saveOwnerPalette(req.body?.palette, centerId);
    res.json({ palette });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save owner palette', details: error.message || String(error) });
  }
};

const getSidebarOrder = async (req: any, res: any) => {
  try {
    res.json(await settingsService.getSidebarOrder(String(req.user.userType), Number(req.user.id)));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch sidebar order', details: error.message || String(error) });
  }
};

const saveSidebarOrder = async (req: any, res: any) => {
  try {
    res.json(await settingsService.saveSidebarOrder(String(req.user.userType), Number(req.user.id), req.body?.order));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save sidebar order', details: error.message || String(error) });
  }
};

module.exports = { getLessonScoring, saveLessonScoring, getOwnerPalette, saveOwnerPalette, getSidebarOrder, saveSidebarOrder };

export {};
