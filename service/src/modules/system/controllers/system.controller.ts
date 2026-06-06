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

module.exports = {
  redeployServer,
};

export {};
