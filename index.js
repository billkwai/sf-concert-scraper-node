let scraper = require('./concert-scraper.js');
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

function getConcertDiff() {
    scraper.scrapeFillmore().then(data => {
        pool.query('SELECT * from concerts WHERE venue = ($1) ORDER BY title, venue, date_and_time', ["Fillmore"], (err, res) => {
            if (err) {
                console.log(err.stack);
            } else {
                let newEvents = [];
                let existingEvents = new Set(res.rows);
                data.forEach(event => {
                    if (!existingEvents.has(event)) {
                        newEvents.push(event);
                    }
                });
                console.log(newEvents);
            }
        });
    });
}

http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    getConcertDiff();
    res.end();
}).listen(process.env.PORT || 8080);

