const service = require('../services/calendar.service');
const { getScopedCenterId, requireCenterId } = require('../../../shared/tenant');

const scopeFor = async (req: any, centerId: number) => {
  if (req.user?.userType === 'teacher') return { teacherId: Number(req.user.id) };
  if (req.user?.userType === 'student') {
    return { classIds: await service.studentClassIds(centerId, Number(req.user.id)) };
  }
  return {};
};

const run = (operation: any) => async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    if (!requireCenterId(res, centerId)) return;
    const scope = await scopeFor(req, centerId);
    res.json(await operation(centerId, req.query, scope));
  } catch (error: any) {
    console.error('Calendar request failed:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to load calendar data.' });
  }
};

module.exports = {
  events: run(service.events),
  summary: run(service.summary),
  resources: run(service.resources),
  conflicts: run(service.conflicts),
};
export {};
