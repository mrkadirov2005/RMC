const systemService = require('../services/system.service');
const e2eRunnerService = require('../services/e2e-runner.service');

const redeployServer = async (req: any, res: any) => {
  try {
    systemService.validateRedeployPassword(req.body?.password);
    systemService.scheduleRedeploy();
    res.status(202).json({
      message: 'Server redeploy started.',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const resetTable = (tableName: 'students' | 'teachers' | 'classes' | 'payments') => async (req: any, res: any) => {
  try {
    systemService.validateDevResetRequest(req.body?.confirmation);
    const result = await systemService.resetTable(tableName);
    res.json({
      message: `${tableName} reset completed.`,
      ...result,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

const getStats = async (req: any, res: any) => {
  try {
    const stats = await systemService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load server stats.' });
  }
};

const getDatabaseTables = async (_req: any, res: any) => {
  try { res.json(await systemService.getDatabaseTables()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load database tables.' }); }
};

const getDatabaseTableRows = async (req: any, res: any) => {
  try {
    res.json(await systemService.getDatabaseTableRows(String(req.params.table || ''), {
      limit: Number(req.query.limit), offset: Number(req.query.offset), query: String(req.query.q || ''),
    }));
  } catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load table rows.' }); }
};

const getE2eCatalog = (_req: any, res: any) => {
  try { res.json(e2eRunnerService.getCatalog()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getE2eStatus = (_req: any, res: any) => {
  try { res.json(e2eRunnerService.getStatus()); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const startE2eRun = (req: any, res: any) => {
  try { res.status(202).json(e2eRunnerService.startRun(req.body?.flowId)); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

const cancelE2eRun = (req: any, res: any) => {
  try { res.json(e2eRunnerService.cancelRun(req.params.runId)); }
  catch (error: any) { res.status(error.statusCode || 500).json({ error: error.message }); }
};

module.exports = {
  getStats,
  getDatabaseTables,
  getDatabaseTableRows,
  getE2eCatalog,
  getE2eStatus,
  startE2eRun,
  cancelE2eRun,
  redeployServer,
  resetStudents: resetTable('students'),
  resetTeachers: resetTable('teachers'),
  resetClasses: resetTable('classes'),
  resetPayments: resetTable('payments'),
};

export {};
