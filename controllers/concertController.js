var Concert = require('../models/concert');
var User = require('../models/user');

exports.update_concerts = function(req, res) {
    Concert.getConcerts(req, res);
}