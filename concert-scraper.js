const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
moment.tz.setDefault('Etc/UTC');

function scrapeFillmore() {

    const url = 'https://thefillmore.com/calendar';
    
    // regular expressions for fillmore date, time, and price scraping
    let event_date_re = /\w{3,9}?\s\d{1,2}?,\s\d{4}?/;
    let event_time_re = /\d:\d\d\sp.m./;
    let event_price_re = /\$\d\d.\d\d/;

    return axios(url)
    .then(response => {
        const html = response.data;
        const $ = cheerio.load(html);
        const allEvents = $('.faq_main');
        const events = [];
        allEvents.each(function () {
            const title = $(this).find('.title').find('a').text();
            const url = $(this).find('.title').find('a').attr('href');
            const venue = 'Fillmore';
            const otherContent = $(this).find('.content').find('p').text();

            const event_date_raw_arr = otherContent.match(event_date_re);
            if(event_date_raw_arr == null) { // check that a date was matched
                return;
            }
            const event_date_raw = event_date_raw_arr[0];
    
            const event_time_raw_arr = otherContent.match(event_time_re);
            if(event_time_raw_arr == null) {
                return;
            }
            const event_time_raw = event_time_raw_arr[0].replace('.','');

            const event_price_raw = otherContent.match(event_price_re)[0];

            // convert date and time into datetime format
            const event_datetime = moment.tz(event_date_raw + ' ' + event_time_raw, 'MMMM D YYYY h:mm a', 'America/Los_Angeles').utc().toDate();
            events.push({title, venue, url, date_and_time: event_datetime, price: event_price_raw});
        });
        //console.log(events);
        return events;
    })
    .catch(console.error);
}

function scrapeFoopee() {
    const url = 'http://www.foopee.com/punk/the-list/by-club.0.html';
    let events = axios(url)
    .then(response => {
        const venues = ['1015_Folsom__S_F_','August_Hall__S_F_'];
        const html = response.data;
        const $ = cheerio.load(html);
        const allEvents = $('li');
        //console.log(allEvents);
        venues.forEach(venue => {
            const venueDOM = $(`a[name="${venue}"]`);
            console.log(venueDOM)
            console.log(`a[name="${venue}"]`);
            //const venueName = venueDOM.find('br').text();
            //console.log(venueName);
        });
    })
    .catch(console.error);
}

module.exports.scrapeFillmore = scrapeFillmore;
module.exports.scrapeFoopee = scrapeFoopee;

/*
scrapeFillmore().then(data => {
    console.log(data);
});
*/
