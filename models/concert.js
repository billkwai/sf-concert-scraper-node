const { pool } = require('../config');
const moment = require('moment-timezone');
moment.tz.setDefault('Etc/UTC');
var format = require('pg-format');
var _ = require('lodash');
let scraper = require('../concert-scraper.js');

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
    if(aTimeStamp.isSame(bTimeStamp)) {
        if(String(a.title) == String(b.title)) {
            return a.venue > b.venue ? 1 : a.venue < b.venue ? -1 : 0;
        }
        return String(a.title) > String(b.title) ? 1 : String(a.title) < String(b.title) ? -1 : 0;
    }
    return aTimeStamp.isAfter(bTimeStamp) ? 1 : aTimeStamp.isBefore(bTimeStamp) ? -1 : 0;
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
        return pool.query(format('INSERT INTO concerts (title, venue, url, date_and_time, price) VALUES %L;', rows, (err, res) => {
            if (err) {
                console.log(err.stack);
            } else {
                if (res.data) {
                    console.log(res.data);
                }
            }
        }));
    } else {
        return Promise.resolve();
    }
};

// returns events that have been deleted and removes them from the database
function getConcertDeleted(dbEvents, webEvents) {
    let deletedEventsArr = [];
    let newExistingArr = [];
    let dbQuery = [];
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
            let query = pool.query('DELETE from concerts where title = ($1) AND venue = ($2) AND date_and_time = ($3)', 
            [dbEvent.title, dbEvent.venue, dbEvent.date_and_time], (err, res) => {
                if (err) {
                    console.log(err.stack);
                } else {
                    if (res.data) {
                        console.log(res.data);
                    }
                }
            });
            dbQuery.push(query);
        }
    };
    // wait for DB deletes to resolve
    return Promise.all(dbQuery)
    .then(result => {return [newExistingArr, deletedEventsArr]})
    .catch(err => console.log(err));
};

// remove events that have already occured
function removeOutdatedConcerts() {
     return pool.query('DELETE from concerts WHERE date_and_time < now()');
};

// identifies new concerts and adds them to database
function getConcertDiff() {
    return scraper.scrape().then(function(data) {
        return pool.query('SELECT * from concerts ORDER BY date_and_time, title, venue')
        .then(async (res) => {
            let newEventsArr = [];
            let existingEvents = res.rows.sort(concertComparator); 
            let newEvents = data.sort(concertComparator);

            const deletedEvents = await getConcertDeleted(existingEvents, newEvents);

            let i = 0;
            let j = 0;

            // if database is empty, then all events are new
            if(existingEvents.length == 0) {
                newEventsArr = newEvents;
            }

            while (i < existingEvents.length && j < newEvents.length) {
                if (concertComparator(existingEvents[i], newEvents[j]) == 1) { // new event
                    // sometimes, outdated events are still posted on the website
                    var now = new Date();
                    if(now < newEvents[j].date_and_time) {
                        newEventsArr.push(newEvents[j]);
                    }
                    j++;
                } else if (concertComparator(existingEvents[i], newEvents[j]) == -1) { // deleted event
                    i++;
                } else {
                    i++;
                    j++;
                }
            }
            return addConcerts(newEventsArr).then(res => {
                return {new_events: newEventsArr, deleted_events: deletedEvents[1], all_events: newEvents};
            })
            .catch(err => {
                return Promise.reject(new Error('Could not add new concerts to DB'));
            }) 
        }).catch(function(err) {
            console.log(err.stack);
            return Promise.reject(new Error('Could not get concert diff'));
        });
    });
};

function testConcerts() {
    return scraper.scrape();
}

const Concert = {
    removeOutdatedConcerts,
    getConcertDiff,
    testConcerts
};

module.exports = Concert;