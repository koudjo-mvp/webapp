var cors = require('cors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require('fs');

//logging configuration//
var logDirectory = path.join(__dirname, 'logs');
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

var winston = require('winston');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var elasticsearch = require('elasticsearch');
var mongoose = require('mongoose');
var websocket = 0;
var configuration = require('./config');
var toolbox = require('./controllers/toolbox');
global.passport = require('passport');

/*
* auth: directly through own app. Join SN accounts, email registration+email verification, mobile app protection
* custom feature:  public chat, with google ads placement
* user profile: upload image, thumbnails, activity notifications in SN, mobile app notif
* */

/*connect to mongoose DB and elasticsearch and redis*/
mongoose.connect(configuration.general_parameters.database, { useNewUrlParser: true });

//var appsearch_conn = new elasticsearch.Client({
// host: configuration.general_parameters.edeliver_indexurl,
// log: configuration.general_parameters.edeliver_indexlogl
// });
/*var rdsearch_conn = redis.createClient();*/

/*importing mongoose DB models schemas js modules*/
require('./models/apikeys');
require('./models/users');
require('./models/jobs');
require('./models/tasks');
require('./models/crontab');

var view_access = require('./routes/view_access');
var api_access = require('./routes/api_access');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
var corsOptions = {
    origin: 'https://localhost',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['X-Requested-With','Content-Type','Cookie','Set-Cookie','*'],
    credentials: true,
    preflightContinue: false
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
/*app.use(function (req, res, next) {
 // Website you wish to allow to connect
 res.setHeader('Access-Control-Allow-Origin', 'https://www.localhost');
 // Request methods you wish to allow
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
 // Request headers you wish to allow
 res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
 // Set to true if you need the website to include cookies in the requests sent
 // to the API (e.g. in case you use sessions)
 res.setHeader('Access-Control-Allow-Credentials', true);
 // Pass to next layer of middleware
 next();
 });*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//logging requests
//app.use(logger('combined', {stream: accessLogStream}));

//passport to link social media accounts
app.use(session({ secret: configuration.general_parameters.secret }));
app.use(global.passport.initialize());
app.use(passport.session());

// Setting HTTP routes entry points
app.use('/', view_access);
app.use('/api', api_access);

// catch 404 and forward to error handler
var ERROR_TEXT = "Page not found. Click the link below to return to the main page.";
app.use(function(req, res, next) {
    var err = new Error(ERROR_TEXT);//('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = ERROR_TEXT;
    res.locals.error = req.app.get('env') === 'DEV' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
