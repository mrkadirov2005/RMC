const reportService = require('../services/report.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const getOverviewReport = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const data = await reportService.overview(req.query, centerId ?? undefined);
    res.json(data);
  } catch (error: any) {
    sendError(res, error, "Umumiy hisobotni yuklab bo'lmadi");
  }
};

const getPaymentsReport = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const out = await reportService.paymentsReport(req.query, centerId ?? undefined);
    if (out.mode === 'rows') {
      return res.json(out.rows);
    }
    res.json(out.row);
  } catch (error: any) {
    sendError(res, error, "To'lovlar hisobotini yuklab bo'lmadi");
  }
};

const getAttendanceReport = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const rows = await reportService.attendanceReport(req.query, centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    sendError(res, error, "Davomat hisobotini yuklab bo'lmadi");
  }
};

const getRetentionReport = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const data = await reportService.retentionReport(req.query, centerId ?? undefined);
    res.json(data);
  } catch (error: any) {
    sendError(res, error, "Retention hisobotini yuklab bo'lmadi");
  }
};

module.exports = {
  getOverviewReport,
  getPaymentsReport,
  getAttendanceReport,
  getRetentionReport,
};

export {};
