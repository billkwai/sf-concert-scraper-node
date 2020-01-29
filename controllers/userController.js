var User = require('../models/user');

exports.user_register = function(req, res) {
    User.registerUser(req, res);
}