const auditLogService = require('../services/audit_log.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAuditLogs = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const rows = await auditLogService.listLogs(req.query, centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message || String(error) });
  }
};

module.exports = { getAuditLogs };

export {};
