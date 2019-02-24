var express = require('express');
var jwt = require('jsonwebtoken');
var uuid_generator = require('uuid/v4');
var hogan_engine = require('hogan.js');
var fs = require('fs');
var authsApi = require('../controllers/auths');
var usrsApi = require('../controllers/users');
var tasksApi = require('../controllers/tasks');
var jobsApi = require('../controllers/jobs');
var uploadApi = require('../controllers/upload');
var router = express.Router();
if(!global.passport){
    global.passport = require('passport');
}
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var crypto = require('crypto');
var middleware = require('./middleware');

/* Protected routes */

//Accept-version: v1
router.post('/login', [middleware.check_apikeytoken], function (req, res, next){
    middleware.handle_api(req, res, next, authsApi.login);
});
if (configuration.general_parameters.users_creation_mode === "b2c") {
    router.post('/signup', [middleware.check_apikeytoken], function (req, res, next) {
        middleware.handle_api(req, res, next, authsApi.handle_signup);
    });
}


// facebook -------------------------------
// send to facebook to do the authentication
router.get('/auth/facebook', [middleware.check_userjwttoken], global.passport.authorize('facebook', {
    scope : ['public_profile', 'email', 'publish_actions']
}));

// handle the callback after facebook has authorized the user
router.get('/auth/facebook/callback', [middleware.check_userjwttoken,
    global.passport.authorize('facebook', {
        failureRedirect : '/'
    })], function(req, res) {
        res.redirect('/#!/settings');
    });//successRedirect : '/#!settings',

// facebook -------------------------------
router.post('/auth/facebook/unlink', [middleware.check_userjwttoken], function (req, res, next){
    middleware.handle_api(req, res, next, authsApi.unlink_user);
    
});

// twitter --------------------------------
// send to twitter to do the authentication
router.get('/auth/twitter', [middleware.check_userjwttoken], global.passport.authorize('twitter', { scope : 'email' }));//{ session: false }

// handle the callback after twitter has authorized the user
router.get('/auth/twitter/callback', [middleware.check_userjwttoken,
    global.passport.authorize('twitter', {
        failureRedirect : '/'
    })], function(req, res) {
        res.redirect('/#!/settings');
    });//successRedirect : '/#!settings',

// twitter --------------------------------
router.post('/auth/twitter/unlink', [middleware.check_userjwttoken], function (req, res, next){
    middleware.handle_api(req, res, next, authsApi.unlink_user);
});


// log out
router.post('/logout', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, authsApi.logout);
});

// users infos
router.get('/users', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, usrsApi.search_all_users);
});
router.get('/users/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, usrsApi.get_user);
});
router.get('/users/:resid/:info', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, usrsApi.get_user_info);
});
if (configuration.general_parameters.users_creation_mode === "b2b") {
    router.post('/users', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next) {
        middleware.handle_api(req, res, next, usrsApi.create_user);
    });
}
router.put('/users/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, usrsApi.update_user);
});
router.delete('/users/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, usrsApi.delete_user);
});

// settings infos
router.get('/tasks', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, tasksApi.search_all_tasks);
});
router.get('/tasks/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, tasksApi.get_task);
});
router.post('/tasks', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, tasksApi.create_task);
});
router.put('/tasks/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, tasksApi.update_task);
});
router.delete('/tasks/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, tasksApi.delete_task);
});

// jobs infos
router.get('/jobs', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, jobsApi.search_all_jobs);
});
router.get('/jobs/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, jobsApi.get_job);
});
router.post('/jobs', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, jobsApi.create_job);
});
router.put('/jobs/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, jobsApi.update_job);
});
router.delete('/jobs/:resid', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, jobsApi.cancel_job);
});

//upload images
router.post('/uploads', [middleware.check_apikeytoken, middleware.check_userjwttoken, middleware.check_userroles], function (req, res, next){
    middleware.handle_api(req, res, next, uploadApi.upload_file);
});

router.all('/*', function (req, res, next) {
    /*if (req.app.get('env') === 'DEV'){
        toolbox.logging('debug',req,'Accessing a backend api endpoint that does not exist');
    }*/
    var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
    genresponse.developerErrorMessage = "api route does not exist";
    genresponse.userErrorMessage = "bad request";
    genresponse.status = 400;
    //return genresponse;
    toolbox.logging('error',req,'Accessing a backend api endpoint that does not exist','KO');
    return res.status(genresponse.status).json(genresponse);
});

module.exports = router;