export {};

const express = require('express');
const router = express.Router();
const watchlistController = require('../modules/watchlist/controllers/watchlist.controller');

router.get('/', watchlistController.getWatchlist);
router.post('/', watchlistController.addToWatchlist);
router.patch('/:id', watchlistController.updateWatch);
router.delete('/:id', watchlistController.removeFromWatchlist);

module.exports = router;
