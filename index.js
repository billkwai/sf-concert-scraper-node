const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { pool } = require('./config');
const {transport} = require('./config');
const moment = require('moment-timezone');
moment.tz.setDefault('Etc/UTC');
const app = express();
var http = require('http');
var format = require('pg-format');
var _ = require('lodash');
var path = require('path');
let scraper = require('./concert-scraper.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

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
    aTimeStamp = moment.utc(a.date_and_time);
    bTimeStamp = moment.utc(b.date_and_time);
    if(aTimeStamp == bTimeStamp) {
        if(a.title == b.title) {
            return a.venue > b.venue ? 1 : a.venue < b.venue ? -1 : 0;
        }
        return a.title > b.title ? 1 : a.title < b.title ? -1 : 0;
    }
    return aTimeStamp > bTimeStamp ? 1 : aTimeStamp < bTimeStamp ? -1 : 0;
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
                console.log("res data");
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
            return {new_events: newEventsArr, deleted_events: deletedEvents[1], all_events: newEvents};
        }).catch(err => console.log(err.stack));
    });
};

function createEmailContent(concerts) {
    // date and time formatting options
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'};
    options.timeZone = 'America/Los_Angeles';
    options.timeZoneName = 'short';
    options.hour12 = true;

    // all known keys in each concert object
    let keys = ['venue', 'title', 'date_and_time', 'price', 'url'];
    html = "<h1>SF Concert Digest</h1>"
    html += "<h2>New events added this week</h2>"
    html += "<table style='width:100%' border='1'>"
    html += "<tr>"
    html += "<th>Venue</th>"
    html += "<th>Artist</th>"
    html += "<th>date and time</th>"
    html += "<th>Price</th>"
    html += "<th>Details</th>"
    for (var concert of concerts.new_events) {
        html += "<tr>";
        for (var key of keys) {
            if(key === 'url') {
                html += "<td>"
                html += "<a href='"
                html += concert[key]
                html += "'>"
                html += concert[key]
                html += "</a>"
                html += "</td>"
            } else {
                html += "<td>"
                if(key === 'date_and_time') {
                    html += concert[key].getUTCDate().toLocaleString("en-US", options);
                } else {
                    html += concert[key];
                }
                html += "</td>"
            }
        }
    }
    html += "</tr>"
    html += "</table>"
    html += "<br><br>"
    html += "<h2>All events on the calendar</h2>"
    html += "<table style='width:100%' border='1'>"
    html += "<tr>"
    html += "<th>Venue</th>"
    html += "<th>Artist</th>"
    html += "<th>date and time</th>"
    html += "<th>Price</th>"
    html += "<th>Details</th>"
    for (var concert of concerts.all_events) {
        html += "<tr>";
        for (var key of keys) {
            if(key === 'url') {
                html += "<td>"
                html += "<a href='"
                html += concert[key]
                html += "'>"
                html += concert[key]
                html += "</a>"
                html += "</td>"
            } else {
                html += "<td>"
                if(key === 'date_and_time') {
                    html += concert[key].toLocaleString("en-US", options);
                } else {
                    html += concert[key];
                }
                html += "</td>"
            }
        }
    }
    html += "</tr>"
    html += "</table>"
    return html;
}

function sendEmail(data) {
    const message = {
        from: 'concert.digest@gmail.com', // Sender address
        to: 'billkwai@gmail.com',         // List of recipients
        subject: 'SF concerts -- this week\'s updates,', // Subject line
        html: createEmailContent(data) // text body
    };
    //send email
    transport.sendMail(message, function(err, info) {
        if (err) {
            console.log(err)
        } else {
            console.log("Message sent: %s", info.messageId);
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
    });
}

const getConcerts = (request, response) => {
    removeOutdatedConcerts().then(() => {
        return getConcertDiff();
    }).then((value) => {
        //console.log(value);
        sendEmail(value);
    }).catch(err => console.log(err.stack));
    if(response) {
        response.status(200).json({status: 'success', message: 'getConcert endpoint hit'});
    }
};

// schedules a concert refresh sunday of every week
cron.schedule("0 0 9 * * Sunday", function() {
    console.log("cron job starting");
    getConcerts();
}, {timezone: 'America/Los_Angeles'});

app
    .route('/concerts')
    .get(getConcerts)

app
    .route('/')
    .get(function(req, res, next) {
        res.render('index', {title: 'SF Concert Scraper'});
    })

// start server
app.listen(process.env.PORT || 8080, () => {
    console.log(`Server listening`);
});

