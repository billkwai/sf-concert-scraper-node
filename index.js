var http = require('http');
const { pool } = require('./config');

// tests database query
function getAllConcerts() {
    pool.query('SELECT * from concerts', (err, res) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(res);
        }
    });
};

http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    getAllConcerts();
    res.end();
}).listen(process.env.PORT || 8080);

