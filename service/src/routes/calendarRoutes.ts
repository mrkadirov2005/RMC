const router=require('express').Router();const controller=require('../modules/calendar/controllers/calendar.controller');
const { validateBody } = require('../middleware/validation');
const { RecurringMoveDto } = require('../dtos/request.dto');
router.get('/events',controller.events);router.get('/summary',controller.summary);router.get('/resources',controller.resources);router.get('/conflicts',controller.conflicts);
router.patch('/recurring/:classId/move',validateBody(RecurringMoveDto),controller.moveRecurring);
module.exports=router;export {};
