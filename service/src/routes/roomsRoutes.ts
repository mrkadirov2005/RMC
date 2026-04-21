const express = require('express');
const router = express.Router();
const roomsController = require('../modules/rooms/controllers/rooms.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, roomsController.getAllRooms);
router.get('/:id', requireAuth, roomsController.getRoomById);
router.post('/', requireAuth, roomsController.createRoom);
router.put('/:id', requireAuth, roomsController.updateRoom);
router.delete('/:id', requireAuth, roomsController.deleteRoom);


module.exports = router;
