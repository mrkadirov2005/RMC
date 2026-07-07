const systemService = require('../services/system.service');

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

module.exports = {
  getStats,
  redeployServer,
  resetStudents: resetTable('students'),
  resetTeachers: resetTable('teachers'),
  resetClasses: resetTable('classes'),
  resetPayments: resetTable('payments'),
};

export {};
