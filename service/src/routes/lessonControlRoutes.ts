export {};

const express = require('express');
const router = express.Router();
const controller = require('../modules/lesson_control/controllers/lessonControl.controller');

router.get('/discipline', controller.getDiscipline);
router.get('/my-due', controller.getMyDue);
router.get('/days-off', controller.getDaysOff);
router.post('/days-off', controller.addDayOff);
router.delete('/days-off/:id', controller.removeDayOff);
router.get('/reschedules', controller.getReschedules);
router.post('/reschedules', controller.requestReschedule);
router.post('/reschedules/:id/decide', controller.decideReschedule);

module.exports = router;
