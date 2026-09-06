const express = require('express');
const router = express.Router();
const roomsController = require('../modules/rooms/controllers/rooms.controller');
const insightsController = require('../modules/rooms/controllers/room-insights.controller');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  CreateRoomDto,
  IdParamDto,
  UpdatePhysicalRoomDto,
  UpdateRoomDto,
} = require('../dtos/request.dto');

router.get('/', requireAuth, roomsController.getAllRooms);
router.get('/physical', requireAuth, insightsController.physicalRooms);
router.patch('/physical/:id', requireAuth, validateParams(IdParamDto), validateBody(UpdatePhysicalRoomDto), insightsController.updatePhysicalRoom);
router.delete('/physical/:id', requireAuth, validateParams(IdParamDto), insightsController.deletePhysicalRoom);
router.get('/overview', requireAuth, insightsController.overview);
router.get('/availability', requireAuth, insightsController.availability);
router.get('/schedule', requireAuth, insightsController.schedule);
router.get('/by-teacher', requireAuth, insightsController.byTeacher);
router.get('/by-subject', requireAuth, insightsController.bySubject);
router.get('/reports/utilization', requireAuth, insightsController.utilization);
router.get('/:id', requireAuth, validateParams(IdParamDto), roomsController.getRoomById);
router.post('/', requireAuth, validateBody(CreateRoomDto), roomsController.createRoom);
router.put('/:id', requireAuth, validateParams(IdParamDto), validateBody(UpdateRoomDto), roomsController.updateRoom);
router.delete('/:id', requireAuth, validateParams(IdParamDto), roomsController.deleteRoom);


module.exports = router;
