const reportService = require('../services/report.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getOverviewReport = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const data = await reportService.overview(req.query, centerId ?? undefined);
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch overview report', details: error.message || String(error) });
  }
};

const getPaymentsReport = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await reportService.paymentsReport(req.query, centerId ?? undefined);
    if (out.mode === 'rows') {
      return res.json(out.rows);
    }
    res.json(out.row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments report', details: error.message || String(error) });
  }
};

const getAttendanceReport = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const rows = await reportService.attendanceReport(req.query, centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance report', details: error.message || String(error) });
  }
};

module.exports = {
  getOverviewReport,
  getPaymentsReport,
  getAttendanceReport,
};

export {};
