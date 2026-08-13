const service = require('../services/room-insights.service');

const centerId = (req: any) => Number(req.query.center_id || req.body?.center_id || req.user.center_id);
const handle = (operation: (req: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    const result = await operation(req);
    if (result == null) return res.status(404).json({ error: 'Room not found' });
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

module.exports = {
  physicalRooms: handle(req => service.getPhysicalRooms(centerId(req))),
  updatePhysicalRoom: handle(req => service.updatePhysicalRoom(Number(req.params.id), centerId(req), req.body)),
  overview: handle(req => service.getOverview(centerId(req), req.query)),
  availability: handle(req => service.getAvailability(centerId(req), req.query)),
  schedule: handle(req => service.getSchedule(centerId(req), req.query)),
  byTeacher: handle(req => service.getByTeacher(centerId(req), req.query)),
  bySubject: handle(req => service.getBySubject(centerId(req), req.query)),
  utilization: handle(req => service.getReport(centerId(req), req.query)),
};
export {};
