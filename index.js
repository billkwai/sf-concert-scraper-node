const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { pool } = require('./config');
const app = express();
var http = require('http');
var format = require('pg-format');
var _ = require('lodash');
let scraper = require('./concert-scraper.js');


//mailtrap
let transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
       user: 'facc061d677b90',
       pass: '449df18ebabb6b'
    }
});

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

// comparator function to sort concert event objects by primary key (title, venue, and date_and_time)
function concertComparator(a,b) {
    if(a.date_and_time == b.date_and_time) {
        if(a.title == b.title) {
            return a.venue > b.venue ? 1 : a.venue < b.venue ? -1 : 0;
        }
        return a.title > b.title ? 1 : a.title < b.title ? -1 : 0;
    }
    return a.date_and_time > b.date_and_time ? 1 : a.date_and_time < b.date_and_time ? -1 : 0;
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

// returns events that have been deleted and removes them from the database
function getConcertDeleted(dbEvents, webEvents) {
    let deletedEventsArr = [];
    let newExistingArr = []
    for (var dbEvent of dbEvents) {
        let eventExists = false;
        for (webEvent of webEvents) {
            if(_.isEqual(dbEvent, webEvent)) {
                eventExists = true;
                break;
            }
        };
        if (eventExists) {
            newExistingArr.push(dbEvent);
        } else {
            deletedEventsArr.push(dbEvent);
            // remove deleted concert from database
            // TODO: test this
            pool.query('DELETE from concerts where title = ($1) AND venue = ($2) AND date_and_time = ($3)', 
            [dbEvent.title, dbEvent.venue, dbEvent.date_and_time]);
        }
    };
    return [newExistingArr, deletedEventsArr];
};

// remove events that have already occured
function removeOutdatedConcerts() {
     return pool.query('DELETE from concerts WHERE date_and_time < now()');
};

// identifies new concerts and adds them to database
function getConcertDiff() {
    return scraper.scrapeFillmore().then(function(data) {
        return pool.query('SELECT * from concerts WHERE venue = ($1) ORDER BY title, venue, date_and_time;', ["Fillmore"]
        ).then(res => {
            let newEventsArr = [];
            let existingEvents = res.rows.sort(concertComparator); 
            let newEvents = data.sort(concertComparator);

            let deletedEvents = getConcertDeleted(existingEvents, newEvents);
            existingEvents = deletedEvents[0];

            let i = 0;
            let j = 0;

            // if database is empty, then all events are new
            if(existingEvents.length == 0) {
                newEventsArr = newEvents;
            }

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
            addConcerts(newEventsArr);
            return {new_events: newEventsArr, deleted_events: deletedEvents[1]};
        }).catch(err => console.log(err.stack));
    });
};

function createEmailContent(concerts) {
    let keys = ['venue', 'title', 'date_and_time', 'price', 'url'];
    let html = "<table style='width:100%'>"
    html += "<tr>"
    html += "<th>Venue</th>"
    html += "<th>Artist</th>"
    html += "<th>date and time</th>"
    html += "<th>Price</th>"
    html += "<th>Details</th>"
    for (var concert of concerts) {
        html += "<tr>";
        for (var key of keys) {
            html += "<td>"
            html += concert[key];
            html += "</td>"
        }
    }
    html += "</tr>"
    html += "</table>"
    return html;
}

const getConcerts = (request, response) => {
    removeOutdatedConcerts().then(() => {
        return getConcertDiff();
    }).then((value) => {
        console.log("this is the email message");
        console.log(value);
        const message = {
            from: 'elonmusk@tesla.com', // Sender address
            to: 'to@email.com',         // List of recipients
            subject: 'SF concert scraper updates', // Subject line
            html: createEmailContent(value.new_events) // text body
        };
        console.log(message); 
        console.log("done");
        //response.status(200).json(message);

        // send dummy mail
        /*
        transport.sendMail(message, function(err, info) {
            if (err) {
                console.log(err)
            } else {
                console.log(info);
            }
        });
        */
    }).catch(err => console.log(err.stack));
};

// schedules a concert refresh sunday of every week
cron.schedule("* * * * * Sunday", function() {
    console.log("cron job starting");
    getConcerts();
});

app
    .route('/concerts')
    .get(getConcerts)

// start server
app.listen(process.env.PORT || 8080, () => {
    console.log(`Server listening`);
});

// old code
/*
http.createServer(function(req, res) {
    if(req.url != '/favicon.ico') { //ignore favicon call 
        res.writeHead(200, {'Content-Type': 'text/plain'});

        });
        res.end();
    }
}).listen(process.env.PORT || 8080);
*/

