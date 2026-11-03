export {};

const express_owner = require('express');
const router_owner = express_owner.Router();
const ownerController = require('../modules/owners/controllers/owner.controller');
const { requireDeveloper } = require('../middleware/auth');

router_owner.get('/', ownerController.getAllOwners);
router_owner.get('/:id', ownerController.getOwnerById);
// Owner accounts are added, edited and removed by the developer only.
router_owner.post('/', requireDeveloper, ownerController.createOwner);
router_owner.put('/:id', requireDeveloper, ownerController.updateOwner);
router_owner.delete('/:id', requireDeveloper, ownerController.deleteOwner);
router_owner.post('/:id/change-password', ownerController.changePassword);

module.exports = router_owner;
