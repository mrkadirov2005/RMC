export {};

const express = require('express');
const router = express.Router();
const studentLinkController = require('../modules/student_links/controllers/studentLink.controller');

router.get('/', studentLinkController.getLinks);
router.post('/', studentLinkController.createLink);
router.put('/:id', studentLinkController.updateLink);
router.delete('/:id', studentLinkController.deleteLink);

module.exports = router;
