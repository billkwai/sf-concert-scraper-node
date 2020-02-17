var Concert = require('../models/concert');
var User = require('../models/user');
const {transport} = require('../config');
const nodemailer = require('nodemailer');

exports.update_concerts = function(req, res) {
    Concert.removeOutdatedConcerts()
    .then(() => {
        return Concert.getConcertDiff();
    }).then((value) => {
        //console.log(value);
        sendEmail(value);
    }).catch(err => console.log(err.stack));
    if(res) {
        return res.status(200).json({status: 'success', message: 'getConcert endpoint hit'});
    }
}

async function sendEmail(data) {
    try {
        let users = await User.getUsers();
        let emails = [];
        users.rows.forEach(function(user) {
            emails.push(user.email);
        })
        console.log(emails);

        const message = {
            from: 'concert.digest@gmail.com', // Sender address
            to: 'concert.digest@gmail.com',
            bcc: emails,         // List of recipients
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
            transport.close();
        });
    } catch(error) {
        console.log(error);
    }
}

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
};