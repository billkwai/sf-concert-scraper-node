var express = require('express');
var router = express.Router();
const { check } = require('express-validator');

// Require controller modules
var user_controller = require('../controllers/userController');
var concert_controller = require('../controllers/concertController');
var index_controller = require('../controllers/indexController');

// GET home page.
router.get('/', index_controller.index);

// POST request to register user
router.post('/user/register', [check('email').isEmail()], user_controller.user_register);

module.exports = router;