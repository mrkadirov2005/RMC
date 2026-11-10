export {};

// Levels of a subject: /api/levels. A subject's own levels are under /api/subjects/:id/levels,
// a group's level under PUT /api/classes/:id/level.
const express_level = require('express');
const router_level = express_level.Router();
const levelController = require('../modules/levels/level.controller');

router_level.get('/', levelController.listAll);
router_level.put('/:id', levelController.updateLevel);
router_level.delete('/:id', levelController.deleteLevel);
router_level.get('/:id/price-history', levelController.levelHistory);
router_level.post('/:id/price-changes', levelController.changeLevelPrice);

module.exports = router_level;
