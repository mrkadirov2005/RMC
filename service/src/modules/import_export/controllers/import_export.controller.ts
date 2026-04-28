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

module.exports = { exportEntity, importEntity };

export {};
