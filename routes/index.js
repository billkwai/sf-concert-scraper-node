var express = require('express');
var router = express.Router();

// Require controller modules
var user_controller = require('../controllers/userController');
var concert_controller = require('../controllers/concertController');
var index_controller = require('../controllers/indexController');

// GET home page.
router.get('/', index_controller.index);

module.exports = router;