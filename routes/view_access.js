var express = require('express');
var jwt = require('jsonwebtoken');
var uuid_generator = require('uuid/v4');
var hogan_engine = require('hogan.js');
var fs = require('fs');
var workersApi = require('../controllers/workers');
var restApi = require('../controllers/auths');
var jobsApi = require('../controllers/jobs');
var router = express.Router();
if(!global.passport){
    global.passport = require('passport');
}
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var crypto = require('crypto');
var middleware = require('./middleware');
function hashPW(pwd){
    return crypto.createHash('sha256').update(pwd).digest('base64').toString();
}
//console.log('iosdevice token:'+hashPW(configuration.iosdevices_token));
//console.log('node starter token:'+hashPW(configuration.wsnodes_secret));

/* main public routes */

router.get('/robots.txt', function(req, res, next) {
    middleware.handle_view(arguments, function(ccaller_args){
        var options = {
            root: __dirname + '/../'
        };
        var filename = "robots.txt";
        ccaller_args[1].sendFile(filename, options, function (err) {
            if (err) {
                next(err);
            }
        });
    });
});


router.get('/#login', function(req, res, next) {
    middleware.handle_view(arguments, function(ccaller_args){
        var mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/login.hjs', 'utf8'),{delimiters: '<% %>'});
        var output = mainpagetemplate.render({title: "webapp - Log in", message: "Welcome to webapp"});
        ccaller_args[1].status(200).send(output);
    });
});

if (configuration.general_parameters.users_creation_mode === "b2c"){
    router.get('/#signup', function(req, res, next) {
        middleware.handle_view(arguments, function(ccaller_args){
            var mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/signup.hjs', 'utf8'),{delimiters: '<% %>'});
            var output = mainpagetemplate.render({title: "webapp - Sign up", message: "Sign up to webapp"});
            ccaller_args[1].status(200).send(output);
        });
    });
}

router.post('/apikeys', middleware.check_apikeytoken, function (req, res, next){
    middleware.handle_api(req, res, next, restApi.handle_apikeys);
});
router.delete('/apikeys/:apikeyid', middleware.check_apikeytoken, function (req, res, next){
    middleware.handle_api(req, res, next, restApi.handle_delete_apikey);
});

/* GET home page. */
router.get('/', function(req, res, next) {
    middleware.handle_view(arguments, function(ccaller_args){
        middleware.authorizeview(ccaller_args[0],ccaller_args[1],ccaller_args[2]);
    });
});

if (configuration.general_parameters.users_creation_mode === "b2c") {
    // GET username check request
    router.get('/usercheck', middleware.check_apikeytoken, function (req, res, next) {
        middleware.handle_api(req, res, next, restApi.usernamecheck);
    });

    // GET Signup Completion page
    router.get('/signup', function(req, res, next) {
        middleware.handle_view(arguments, function(ccaller_args){
            var mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/signupcompleted.hjs', 'utf8'),{delimiters: '<% %>'});
            var output = mainpagetemplate.render({title: "webapp - Sign up completed", message: ""});
            ccaller_args[1].status(200).send(output);
        });
    });
    // POST signup completion request
    router.post('/signup', middleware.check_apikeytoken, function (req, res, next) {
        middleware.handle_api(req, res, next, restApi.handle_completesignup);
    });

    // GET lost password page
    router.get('/lostpass', middleware.check_apikeytoken, function (req, res, next) {
        middleware.handle_view(arguments, function (ccaller_args) {
            var mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/renew_password.hjs', 'utf8'), {delimiters: '<% %>'});
            var output = mainpagetemplate.render({title: "webapp - Password Renewal", message: ""});
            ccaller_args[1].status(200).send(output);
        });
    });
    // POST lost password renewal request
    router.post('/lostpass', middleware.check_apikeytoken, function (req, res, next) {
        middleware.handle_api(req, res, next, restApi.generate_newpassword);
    });
}

router.get('/resize/:image', function(req, res, next) {
    middleware.handle_view(arguments, function(ccaller_args){
        middleware.resizeimage(ccaller_args[0],ccaller_args[1],ccaller_args[2]);
    });
});

module.exports = router;
