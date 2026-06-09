const { logAudit } = require('../../../utils/audit');
const importExportService = require('../services/import_export.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const exportEntity = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const out = await importExportService.exportEntity(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: 'Unsupported export entity' });
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
    res.status(500).json({ error: 'Failed to export CSV', details: error.message || String(error) });
  }
};

const importEntity = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { csv } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await importExportService.importEntity(entity, csv, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: 'Unsupported import entity' });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'CSV rows must belong to this center.' });
    }
    if (out.error === 'missing_student') {
      return res.status(400).json({ error: 'Payment row references an unknown student.', details: out.details, row: out.row });
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
    res.status(500).json({ error: 'Failed to import CSV', details: error.message || String(error) });
  }
};

const pushEntityToSheets = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const out = await importExportService.pushEntityToSheets(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: 'Unsupported Google Sheets entity' });
    }
    if (out.error === 'missing_config') {
      return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' });
    }
    if (out.error === 'apps_script_failed') {
      return res.status(502).json({ error: 'Google Apps Script sync failed.', details: out.details });
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
    res.status(500).json({ error: 'Failed to update Google Sheets', details: error.message || String(error) });
  }
};

const pullEntityFromSheets = async (req: any, res: any) => {
  try {
    const { entity } = req.params;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await importExportService.pullEntityFromSheets(entity, centerId ?? undefined);
    if (out.error === 'unsupported') {
      return res.status(400).json({ error: 'Unsupported Google Sheets entity' });
    }
    if (out.error === 'missing_config') {
      return res.status(400).json({ error: 'GOOGLE_APPS_SCRIPT_URL is not configured.' });
    }
    if (out.error === 'apps_script_failed') {
      return res.status(502).json({ error: 'Google Apps Script import failed.', details: out.details });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Google Sheet rows must belong to this center.' });
    }
    if (out.error === 'missing_student') {
      return res.status(400).json({ error: 'Payment row references an unknown student.', details: out.details, row: out.row });
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
    res.status(500).json({ error: 'Failed to import from Google Sheets', details: error.message || String(error) });
  }
};

module.exports = { exportEntity, importEntity, pushEntityToSheets, pullEntityFromSheets };

export {};
