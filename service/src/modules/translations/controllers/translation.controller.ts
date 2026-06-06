const translationService = require('../services/translation.service');

const getAllTranslations = async (req: any, res: any) => {
  try {
    const rows = await translationService.listTranslations();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getTranslationById = async (req: any, res: any) => {
  try {
    const row = await translationService.getTranslation(req.params.id);
    if (!row) return res.status(404).json({ error: 'Translation not found' });
    res.json(row);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const saveTranslation = async (req: any, res: any) => {
  try {
    const row = await translationService.saveTranslation(req.params.id, req.body || {});
    res.json(row);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const saveTranslations = async (req: any, res: any) => {
  try {
    const rows = Array.isArray(req.body?.translations) ? req.body.translations : [];
    const savedRows = await translationService.saveTranslations(rows);
    res.json(savedRows);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTranslation = async (req: any, res: any) => {
  try {
    const row = await translationService.deleteTranslation(req.params.id);
    if (!row) return res.status(404).json({ error: 'Translation not found' });
    res.json({ message: 'Translation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllTranslations,
  getTranslationById,
  saveTranslation,
  saveTranslations,
  deleteTranslation,
};

export {};
