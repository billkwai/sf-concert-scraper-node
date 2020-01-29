const express = require('express');
const app = express();
const bodyParser = require('body-parser');
var http = require('http');
var path = require('path');

// Handles post requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// adds routers
var indexRouter = require('./routes/index');
app.use('/', indexRouter);

// start server
app.listen(process.env.PORT || 8080, () => {
    console.log(`Server listening`);
});

