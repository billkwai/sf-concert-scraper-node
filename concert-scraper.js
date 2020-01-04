const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');

const url = 'https://thefillmore.com/calendar';

let event_date_re = /\w{3,9}?\s\d{1,2}?,\s\d{4}?/;
let event_time_re = /\d:\d\d\sp.m./;
let event_price_re = /\$\d\d.\d\d/;

axios(url)
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
        const event_date_raw = otherContent.match(event_date_re)[0];
        const event_time_raw = otherContent.match(event_time_re)[0].replace('.', '');
        const event_price_raw = otherContent.match(event_price_re)[0].replace('$', '');

        // convert date and time into datetime format
        const event_datetime = new moment(event_date_raw + ' ' + event_time_raw, 'MMMM D YYYY h:mm a');
        events.push({title, venue, url, date_and_time: event_datetime, price: event_price_raw});
    });
    console.log(events);
  })
  .catch(console.error);