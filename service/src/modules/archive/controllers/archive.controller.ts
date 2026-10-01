const archiveService = require('../services/archive.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getArchive = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const archive = await archiveService.listArchive(centerId ?? undefined);
    res.json(archive);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Arxivni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const restoreArchiveItem = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const entity = String(req.params.entity || '');
    const id = Number(req.params.id);
    const result = await archiveService.restoreArchiveItem(entity, id, centerId ?? undefined);
    if (result?.error === 'invalid_entity') {
      return res.status(400).json({ error: "Arxiv turi noto'g'ri." });
    }
    if (!result?.row) {
      return res.status(404).json({ error: 'Arxivlangan yozuv topilmadi.' });
    }
    res.json({ message: 'Yozuv muvaffaqiyatli tiklandi.', record: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23505') {
      return res.status(409).json({
        error: "Yozuvni tiklab bo'lmaydi: faol yozuv allaqachon xuddi shu noyob qiymatdan foydalanmoqda.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "Arxiv elementini tiklab bo'lmadi", details: error.message || String(error) });
  }
};

const purgeArchiveItem = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const entity = String(req.params.entity || '');
    const id = Number(req.params.id);
    const result = await archiveService.purgeArchiveItem(entity, id, centerId ?? undefined);
    if (result?.error === 'invalid_entity') {
      return res.status(400).json({ error: "Arxiv turi noto'g'ri." });
    }
    if (!result?.row) {
      return res.status(404).json({ error: 'Arxivlangan yozuv topilmadi.' });
    }
    res.json({ message: "Yozuv butunlay o'chirildi.", record: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Yozuv boshqa yozuvlarda hali ishlatilmoqda.',
        message: "Bu elementni butunlay o'chirishdan oldin bog'liq yozuvlarni tiklang yoki boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "Arxiv elementini butunlay o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = { getArchive, restoreArchiveItem, purgeArchiveItem };

export {};
