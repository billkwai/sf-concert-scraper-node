const axios = require('axios');

const url = 'http://thefillmore.com/calendar';

axios(url)
  .then(response => {
    const html = response.data;
    console.log(html);
  })
  .catch(console.error);