var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const Http = new XMLHttpRequest();
const url='https://concert-scraper.herokuapp.com/concerts/update';
Http.open("GET", url, false);
Http.send();

Http.onreadystatechange = (e) => {
  console.log(Http.responseText)
}