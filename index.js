let scraper = require('./concert-scraper.js');
var http = require('http');
var format = require('pg-format');
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

// only use this function when populating an empty database for the first time
function populateEmptyDatabase() {
    let newEvents = scraper.scrapeFillmore().then(data => {
        pool.query('SELECT * from concerts WHERE venue = ($1) ORDER BY title, venue, date_and_time', ["Fillmore"], (err, res) => {
            if (err) {
                console.log(err.stack);
            } else {
                addConcerts(data);
            }
        });
    });
};

// comparator function to sort concert event objects by primary key (title, venue, and date_and_time)
function concertComparator(a,b) {
    if(a.title == b.title) {
        if(a.venue == b.venue) {
            return a.date_and_time > b.date_and_time ? 1 : a.date_and_time < b.date_and_time ? -1 : 0;
        }
        return a.venue > b.venue ? 1 : a.venue < b.venue ? -1 : 0;
    }
    return a.title > b.title ? 1 : a.title < b.title ? -1 : 0;
};

// adds concert events into database
function addConcerts(concerts) {
    let rows = concerts.map(function(concert) {
        let row = [];
        Object.keys(concert).forEach(function(key) {
            row.push(concert[key]);
        });
        return row;
    });

    // debugging comments
    //console.log(concerts);
    //console.log(format('INSERT INTO concerts (title, venue, url, date_and_time, price) VALUES %L', rows));
    
    if(concerts.length != 0) {
        pool.query(format('INSERT INTO concerts (title, venue, url, date_and_time, price) VALUES %L;', rows), (err, res) => {
            if (err) {
                console.log(err.stack);
            } else {
                console.log(res.data);
            }
        });
    }

};

// identifies new concerts and adds them to database
// TODO: write functionality to remove events that have been removed / ended
function getConcertDiff() {
    let newEvents = scraper.scrapeFillmore().then(data => {
        pool.query('SELECT * from concerts WHERE venue = ($1) ORDER BY title, venue, date_and_time;', ["Fillmore"], (err, res) => {
            if (err) {
                console.log(err.stack);
            } else {
                let newEventsArr = [];
                let existingEvents = res.rows.sort(concertComparator);
                let newEvents = data.sort(concertComparator);
                let i = 0;
                let j = 0;

                while (i < existingEvents.length && j < newEvents.length) {
                    if (concertComparator(existingEvents[i], newEvents[j]) == 1) {
                        newEventsArr.push(newEvents[j]);
                        j++;
                    } else if (concertComparator(existingEvents[i], newEvents[j]) == -1) {
                        i++;
                    } else {
                        i++;
                        j++;
                    }
                }
                console.log(newEventsArr);
                addConcerts(newEventsArr);
            }
        });
    });
};

http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    getConcertDiff();
    res.end();
}).listen(process.env.PORT || 8080);

