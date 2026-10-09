const reportService = require('../services/report.service');
const studentTrendService = require('../services/studentTrend.service');
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

// Student count on the 10th, 20th and 30th of each month. The owner may see every branch.
const getStudentTrend = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    res.json(await studentTrendService.studentTrend(req.query, scope.centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, "O'quvchilar soni trendini yuklab bo'lmadi");
  }
};

module.exports = {
  getStudentTrend,
  getOverviewReport,
  getPaymentsReport,
  getAttendanceReport,
  getRetentionReport,
};

export {};
