export {};

const express_owner = require('express');
const router_owner = express_owner.Router();
const ownerController = require('../controllers/ownerController');

router_owner.get('/', ownerController.getAllOwners);
router_owner.get('/:id', ownerController.getOwnerById);
router_owner.post('/', ownerController.createOwner);
router_owner.put('/:id', ownerController.updateOwner);
router_owner.delete('/:id', ownerController.deleteOwner);
router_owner.post('/:id/change-password', ownerController.changePassword);

module.exports = router_owner;
