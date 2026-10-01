const { logAudit } = require('../../../utils/audit');
const importExportService = require('../services/import_export.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const exportEntity = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const out = await importExportService.exportEntity(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: "Bu bo'limni eksport qilib bo'lmaydi" });
    }
    const { csv, rows } = out as { csv: string; rows: number; entity: string };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'EXPORT',
      entity_type: entity,
      center_id: centerId ?? undefined,
      details: { rows },
      ip_address: req.ip,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "CSV'ni eksport qilib bo'lmadi", details: error.message || String(error) });
  }
};

const importEntity = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { csv } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await importExportService.importEntity(entity, csv, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: "Bu bo'limni import qilib bo'lmaydi" });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: "CSV qatorlari shu markazga tegishli bo'lishi kerak." });
    }
    if (out.error === 'missing_student') {
      return res.status(400).json({ error: "To'lov qatorida noma'lum o'quvchi ko'rsatilgan.", details: out.details, row: out.row });
    }
    const { created } = out as { created: number; entity: string };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'IMPORT',
      entity_type: entity,
      center_id: centerId ?? undefined,
      details: { rows: created },
      ip_address: req.ip,
    });
    res.status(201).json({ message: `Imported ${created} ${entity}` });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "CSV'ni import qilib bo'lmadi", details: error.message || String(error) });
  }
};

const pushEntityToSheets = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const out = await importExportService.pushEntityToSheets(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: "Bu bo'limni Google Sheets bilan ishlatib bo'lmaydi" });
    }
    if (out.error === 'missing_config') {
      return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' });
    }
    if (out.error === 'apps_script_failed') {
      return res.status(502).json({ error: 'Google Apps Script sinxronlashi muvaffaqiyatsiz tugadi.', details: out.details });
    }
    if (out.error === 'apps_script_timeout') {
      return res.status(504).json({ error: 'Google Apps Script vaqtida javob bermadi.', details: out.details });
    }
    const { rows } = out as { rows: number; entity: string };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'GOOGLE_SHEETS_PUSH',
      entity_type: entity,
      center_id: centerId ?? undefined,
      details: { rows },
      ip_address: req.ip,
    });
    res.json({ message: `Updated Google Sheets with ${rows} ${entity}`, rows });
  } catch (error: any) {
    console.error('Google Sheets push error:', error);
    res.status(500).json({ error: "Google Sheets'ni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const pullEntityFromSheets = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await importExportService.pullEntityFromSheets(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: "Bu bo'limni Google Sheets bilan ishlatib bo'lmaydi" });
    }
    if (out.error === 'missing_config') {
      return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' });
    }
    if (out.error === 'apps_script_failed') {
      return res.status(502).json({ error: 'Google Apps Script orqali import muvaffaqiyatsiz tugadi.', details: out.details });
    }
    if (out.error === 'apps_script_timeout') {
      return res.status(504).json({ error: 'Google Apps Script vaqtida javob bermadi.', details: out.details });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: "Google Sheet qatorlari shu markazga tegishli bo'lishi kerak." });
    }
    if (out.error === 'missing_student') {
      return res.status(400).json({ error: "To'lov qatorida noma'lum o'quvchi ko'rsatilgan.", details: out.details, row: out.row });
    }
    const { rows } = out as { rows: number; entity: string };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'GOOGLE_SHEETS_PULL',
      entity_type: entity,
      center_id: centerId ?? undefined,
      details: { rows },
      ip_address: req.ip,
    });
    res.json({ message: `Imported ${rows} ${entity} from Google Sheets`, rows });
  } catch (error: any) {
    console.error('Google Sheets pull error:', error);
    res.status(500).json({ error: "Google Sheets'dan import qilib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = { exportEntity, importEntity, pushEntityToSheets, pullEntityFromSheets };

export {};
