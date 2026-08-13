const express = require('express');
const router = express.Router();
const roomsController = require('../modules/rooms/controllers/rooms.controller');
const insightsController = require('../modules/rooms/controllers/room-insights.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, roomsController.getAllRooms);
router.get('/physical', requireAuth, insightsController.physicalRooms);
router.patch('/physical/:id', requireAuth, insightsController.updatePhysicalRoom);
router.delete('/physical/:id', requireAuth, insightsController.deletePhysicalRoom);
router.get('/overview', requireAuth, insightsController.overview);
router.get('/availability', requireAuth, insightsController.availability);
router.get('/schedule', requireAuth, insightsController.schedule);
router.get('/by-teacher', requireAuth, insightsController.byTeacher);
router.get('/by-subject', requireAuth, insightsController.bySubject);
router.get('/reports/utilization', requireAuth, insightsController.utilization);
router.get('/:id', requireAuth, roomsController.getRoomById);
router.post('/', requireAuth, roomsController.createRoom);
router.put('/:id', requireAuth, roomsController.updateRoom);
router.delete('/:id', requireAuth, roomsController.deleteRoom);


module.exports = router;
