const router=require('express').Router();const controller=require('../modules/calendar/controllers/calendar.controller');
router.get('/events',controller.events);router.get('/summary',controller.summary);router.get('/resources',controller.resources);router.get('/conflicts',controller.conflicts);
module.exports=router;export {};
