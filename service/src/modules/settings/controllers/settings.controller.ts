const settingsService = require('../services/settings.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getLessonScoring = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    res.json(await settingsService.getLessonScoring(centerId ?? undefined));
  } catch (error: any) {
    res.status(500).json({ error: "Dars baholash sozlamalarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveLessonScoring = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Sozlamalar uchun center_id ko'rsatilishi shart." });
    }
    res.json(await settingsService.saveLessonScoring(req.body, centerId ?? req.body.center_id));
  } catch (error: any) {
    res.status(500).json({ error: "Dars baholash sozlamalarini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

const getOwnerPalette = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (!centerId) return res.status(400).json({ error: "Rang palitrasi sozlamalari uchun center_id ko'rsatilishi shart." });
    res.json({ palette: await settingsService.getOwnerPalette(centerId) });
  } catch (error: any) {
    res.status(500).json({ error: "Rang palitrasini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveOwnerPalette = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (!centerId) return res.status(400).json({ error: "Rang palitrasi sozlamalari uchun center_id ko'rsatilishi shart." });
    const palette = await settingsService.saveOwnerPalette(req.body?.palette, centerId);
    res.json({ palette });
  } catch (error: any) {
    res.status(500).json({ error: "Rang palitrasini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

// Every signed-in account reads the sizes to apply its own. A center's choice wins; an owner with
// no branch selected reads and saves the all-branches default.
const getTextSizes = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    res.json(await settingsService.getTextSizes(centerId ?? undefined));
  } catch (error: any) {
    res.status(500).json({ error: "Matn o'lchamini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveTextSizes = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    res.json(await settingsService.saveTextSizes(req.body?.sizes, centerId ?? undefined));
  } catch (error: any) {
    res.status(500).json({ error: "Matn o'lchamini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

const getVisualOverrides = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    if (!centerId) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    res.json(await settingsService.getVisualOverrides(centerId));
  } catch (error: any) {
    res.status(500).json({ error: "Vizual o'zgartirishlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveVisualOverrides = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    if (!centerId) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    res.json(await settingsService.saveVisualOverrides(req.body?.overrides, centerId));
  } catch (error: any) {
    res.status(500).json({ error: "Vizual o'zgartirishlarni saqlab bo'lmadi", details: error.message || String(error) });
  }
};

const getSidebarOrder = async (req: any, res: any) => {
  try {
    res.json(await settingsService.getSidebarOrder(String(req.user.userType), Number(req.user.id)));
  } catch (error: any) {
    res.status(500).json({ error: "Yon panel tartibini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const saveSidebarOrder = async (req: any, res: any) => {
  try {
    res.json(await settingsService.saveSidebarOrder(String(req.user.userType), Number(req.user.id), req.body?.order));
  } catch (error: any) {
    res.status(500).json({ error: "Yon panel tartibini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getTextSizes,
  saveTextSizes, getLessonScoring, saveLessonScoring, getOwnerPalette, saveOwnerPalette, getVisualOverrides, saveVisualOverrides, getSidebarOrder, saveSidebarOrder };

export {};
