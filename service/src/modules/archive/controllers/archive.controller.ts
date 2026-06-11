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

const restoreArchiveItem = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const entity = String(req.params.entity || '');
    const id = Number(req.params.id);
    const result = await archiveService.restoreArchiveItem(entity, id, centerId ?? undefined);
    if (result?.error === 'invalid_entity') {
      return res.status(400).json({ error: 'Invalid archive entity.' });
    }
    if (!result?.row) {
      return res.status(404).json({ error: 'Archived record not found.' });
    }
    res.json({ message: 'Record restored successfully.', record: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23505') {
      return res.status(409).json({
        error: 'Record cannot be restored because an active record already uses the same unique value.',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to restore archive item', details: error.message || String(error) });
  }
};

const purgeArchiveItem = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const entity = String(req.params.entity || '');
    const id = Number(req.params.id);
    const result = await archiveService.purgeArchiveItem(entity, id, centerId ?? undefined);
    if (result?.error === 'invalid_entity') {
      return res.status(400).json({ error: 'Invalid archive entity.' });
    }
    if (!result?.row) {
      return res.status(404).json({ error: 'Archived record not found.' });
    }
    res.json({ message: 'Record permanently deleted.', record: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Record is still referenced by other records.',
        message: 'Restore or reassign related records before permanently deleting this item.',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to permanently delete archive item', details: error.message || String(error) });
  }
};

module.exports = { getArchive, restoreArchiveItem, purgeArchiveItem };

export {};
