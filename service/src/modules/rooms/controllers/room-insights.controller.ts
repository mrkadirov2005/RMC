const service = require('../services/room-insights.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const resolveCenter = (req: any, res: any): number | null => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Center scope required.' });
    return null;
  }
  if (!centerId && isGlobal) {
    res.status(400).json({ error: 'center_id is required for superuser actions.' });
    return null;
  }
  return centerId as number;
};

const handle = (operation: (req: any, centerId: number) => Promise<any>) => async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const result = await operation(req, centerId);
    if (result == null) return res.status(404).json({ error: 'Room not found' });
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

module.exports = {
  physicalRooms: handle((_req, centerId) => service.getPhysicalRooms(centerId)),
  updatePhysicalRoom: handle((req, centerId) => service.updatePhysicalRoom(Number(req.params.id), centerId, req.body)),
  deletePhysicalRoom: handle((req, centerId) => service.deletePhysicalRoom(Number(req.params.id), centerId)),
  overview: handle((req, centerId) => service.getOverview(centerId, req.query)),
  availability: handle((req, centerId) => service.getAvailability(centerId, req.query)),
  schedule: handle((req, centerId) => service.getSchedule(centerId, req.query)),
  byTeacher: handle((req, centerId) => service.getByTeacher(centerId, req.query)),
  bySubject: handle((req, centerId) => service.getBySubject(centerId, req.query)),
  utilization: handle((req, centerId) => service.getReport(centerId, req.query)),
};
export {};
