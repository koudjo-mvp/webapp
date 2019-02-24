/**
 * Created by P.K.V.M. on 2/7/18.
 */
var express = require('express');
var jwt = require('jsonwebtoken');
var hogan_engine = require('hogan.js');
var fs = require('fs');
var configuration = require('../config');
var toolbox = require('../controllers/toolbox');
var sec_policies = require('../controllers/security_policies');
var crypto = require('crypto');
var mongoose = require('mongoose');
var uuid_generator = require('uuid/v4');
var resizer = require('gm');//.subClass({ imageMagick: true });

toolbox.logging('debug',null,"env vars: "+JSON.stringify(process.env));
//process.env["DYLD_LIBRARY_PATH"] = process.env.MAGICK_HOME + "/lib/";

"use strict";
var Users = mongoose.model('Users');
var ApiKeys = mongoose.model('ApiKeys');
var middleware = {};
function execute_api(req, res, next, funcToRun){
    try {
        if (typeof funcToRun === "function") {
            // Call it, since we have confirmed it is callable​
            return funcToRun(req, res, next);
        }
    }
    catch(err) {
        toolbox.logging('error',req,err,'KO');
        var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
        genresponse.developerErrorMessage = "# "+err;
        genresponse.userErrorMessage = "An internal server exception occured";
        genresponse.status = 500;
        //return genresponse;
        return res.status(genresponse.status).json(genresponse);
    }
}
middleware.handle_api = execute_api;

function execute_api_werr(req, res, next, error, params, funcToRun){
    try {
        if (typeof funcToRun === "function") {
            // Call it, since we have confirmed it is callable​
            return funcToRun(req, res, next, error, params);
        }
    }
    catch(err) {
        toolbox.logging('error',req,err,'KO');
        var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
        genresponse.developerErrorMessage = "# "+err;
        genresponse.userErrorMessage = "An internal server exception occured";
        genresponse.status = 500;
        //return genresponse;
        return res.status(genresponse.status).json(genresponse);
    }
}
middleware.handle_api_werr = execute_api_werr;

function execute_view(options, funcToRun){
    try {
        if (typeof funcToRun === "function") {
            // Call it, since we have confirmed it is callable​
            return funcToRun(options);
        }
    }
    catch(err) {
        toolbox.logging('debug',null,err,'KO');
        options[2](); //.status(500).render('index', { title: 'webapp', message: ""});
    }
}
middleware.handle_view = execute_view;
// Middleware
function view_session_authorization(req, res, next){
    var mainpagetemplate, output;

    // check header or url parameters or post parameters for token
    var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
    var token = req.get('x-access-token'); //req.body.token || req.query.token || req.get('x-access-token') || req.cookies.sessionid;
    //console.log('checking token: '+token);
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, configuration.general_parameters.secret, function(err, decoded) {
            if (err) {
                toolbox.logging('error',req,'verifying the user token failed');
                if (err.toString().indexOf("TokenExpiredError: jwt expired") !== -1){
                    var default_results = {};
                    var expiredtokeninfos = jwt.decode(token, {complete: true})["payload"];
                    Users.restapidbrequest(req, res, next, default_results, "findOne", {
                            condition: {username:expiredtokeninfos["userid"]},
                            projection: {},
                            options: {}
                        }, function(req, res, next, default_results, dbresults){
                            if (dbresults){
                                var sessions = dbresults["login_sessionid"];
                                sessions.splice(dbresults["login_sessionid"].indexOf(token),1);
                                Users.restapidbrequest(req, res, next, default_results, "updateOne",
                                    {
                                        condition: {username: dbresults["username"]},
                                        doc: {login_sessionid: sessions}
                                    },
                                    function(req, res, next, default_results, dresults1){
                                        mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/index.hjs', 'utf8'), {delimiters: '<% %>'});
                                        output = mainpagetemplate.render({title: 'webapp - Log in', message: "Welcome to webapp"});
                                        return res.status(401).send(output);
                                    });
                            } else {
                                mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/index.hjs', 'utf8'), {delimiters: '<% %>'});
                                output = mainpagetemplate.render({title: 'webapp - Log in', message: "Welcome to webapp"});
                                return res.status(401).send(output);
                            }
                        }
                    );
                } else{
                    mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/index.hjs', 'utf8'), {delimiters: '<% %>'});
                    output = mainpagetemplate.render({title: 'webapp - Log in', message: "Welcome to webapp"});
                    return res.status(401).send(output);
                }
            } else {
                // if everything is good, save to request for use in other routes
                if (!req.decoded){
                    req.decoded = {};
                }
                for (var key in decoded) {
                    req.decoded[key] = decoded[key];
                }
                mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/app.hjs', 'utf8'), {delimiters: '<% %>'});
                output = mainpagetemplate.render({
                    title: 'webapp app',
                    message: "Enjoy the best webapp platform"
                });
                return res.status(200).send(output);
            }
        });
    } else {
        // if there is no token
        mainpagetemplate = hogan_engine.compile(fs.readFileSync(__dirname + '/../views/index.hjs', 'utf8'), {delimiters: '<% %>'});
        output = mainpagetemplate.render({title: 'webapp - Log in', message: "Welcome to webapp"});
        return res.status(401).send(output);
    }
}
middleware.authorizeview = view_session_authorization;

middleware.hashPW = function hashPW(pwd){
    return crypto.createHash('sha256').update(pwd).digest('base64').toString();
};
function checkKeyInDB(table, opargs, req, res, next, apikey_type,genresponse){
    var token;
    if (opargs["login_sessionid"]){
        token = opargs["login_sessionid"];
        opargs = {username: opargs["username"]};
    }

    table.restapidbrequest(req, res, next, genresponse, "findOne",
        {
            condition: opargs,
            projection:{},
            options: {}
        },
        function(req, res, next, default_results, dbresults){
            if (dbresults){
                if (dbresults["username"]) {
                    if (dbresults["login_sessionid"].indexOf(token) >= 0){
                        toolbox.logging('info',req,"webapp clientapp authentication know this user token: grant access to the user");
                        next();
                    } else {
                        toolbox.logging('info',req,'webapp doesnt know this '+apikey_type+': refuse access to this incoming request.', 'KO');
                        genresponse.developerErrorMessage = "your request has a wrong or expired "+apikey_type;
                        genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
                        genresponse.status = 401;
                        return res.status(401).json(genresponse);
                    }
                } else {
                    if (dbresults["apikey"]){
                        toolbox.logging('info',req,"webapp clientapp authentication know this client app key: grant access to the client app");
                        next();
                    } else {
                        toolbox.logging('info',req,'webapp doesnt know this '+apikey_type+': refuse access to this incoming request.', 'KO');
                        genresponse.developerErrorMessage = "your request has a wrong or expired "+apikey_type;
                        genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
                        genresponse.status = 401;
                        return res.status(401).json(genresponse);
                    }
                }

            } else {
                toolbox.logging('info',req,'webapp doesnt know this '+apikey_type+': refuse access to this incoming request.', 'KO');
                genresponse.developerErrorMessage = "your request has a wrong or expired "+apikey_type;
                genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
                genresponse.status = 401;
                return res.status(401).json(genresponse);
            }

        },function(req, res, next, default_results, dberr, dbresults){
            toolbox.logging('info',req,'webapp doesnt know this '+apikey_type+': refuse access to this incoming request.', 'KO');
            genresponse.developerErrorMessage = "your request has a wrong or expired "+apikey_type;
            genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
            genresponse.status = 401;
            return res.status(401).json(genresponse);
        });
}
function authorizeapp_toapi(req, res, next) {
    // check that the request comes from granted app/devices
    var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
    var token = req.get('Authorization');
    // decode token
    if (token) {
        // verifies secret and checks exp
        var apikey = token.split(" ")[1];
        jwt.verify(apikey, configuration.general_parameters.secret, function(err, decoded) {
            if (err) {
                if (err.toString().indexOf("TokenExpiredError: jwt expired") !== -1){
                    req.decoded = jwt.decode(apikey, {complete: true})["payload"];
                    //toolbox.logging('debug',req,"webapp dont know this client app: grant access to the client app");
                    checkKeyInDB(ApiKeys, {apikey: apikey},req,res,next,"client app key",genresponse);
                } else{
                    toolbox.logging('info',req,'webapp clientapp authentication doesnt know this client app key: refuse access to the client app. Complete error: '+err, 'KO');
                    genresponse.developerErrorMessage = "request is faking granted app";
                    genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
                    genresponse.status = 401;
                    return res.status(401).json(genresponse);
                }
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                checkKeyInDB(ApiKeys, {apikey: apikey},req,res,next,"client app key",genresponse);
            }
        });
    } else {
        genresponse.developerErrorMessage = "this endpoint don't accept requests without Authorization token";
        genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
        genresponse.status = 401;
        toolbox.logging('info',req,'webapp clientapp authentication doesnt know this client app key: refuse access to the client app. Complete error: '+genresponse.developerErrorMessage,'KO');
        return res.status(401).json(genresponse);
    }
}
middleware.check_apikeytoken = authorizeapp_toapi;

function authorizeuser_toapi(req, res, next) {
    // check header or url parameters or post parameters for token
    var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
    var token = req.get('x-access-token'); //req.body.token || req.query.token || req.get('x-access-token') || req.cookies.sessionid;
    //console.log('checking token: '+token);
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, configuration.general_parameters.secret, function(err, decoded) {
            if (err) {
                toolbox.logging('error',req,'verifying the user token failed');
                if (err.toString().indexOf("TokenExpiredError: jwt expired") !== -1){
                    //res.redirect("/");
                    var default_results = {};
                    var expiredtokeninfos = jwt.decode(token, {complete: true})["payload"];
                    var new_sessionid = jwt.sign({userid:expiredtokeninfos["username"],uid:expiredtokeninfos["userid"],
                        roles:expiredtokeninfos["roles"],type:expiredtokeninfos["type"]},
                        configuration.general_parameters.secret, {
                        expiresIn: configuration.general_parameters.login_timeout // expires in 24 hours * 31 days
                    });
                    Users.restapidbrequest(req, res, next, default_results, "findOne", {
                            condition: {username:expiredtokeninfos["userid"]},
                            projection: {},
                            options: {}
                        }, function(req, res, next, default_results, dbresults){
                            if (dbresults){
                                var sessions = dbresults["login_sessionid"];
                                sessions.splice(dbresults["login_sessionid"].indexOf(token),1);
                                sessions.push(new_sessionid);
                                Users.restapidbrequest(req, res, next, default_results, "updateOne",
                                    {
                                        condition: {username: dbresults["username"]},
                                        doc: {login_sessionid: sessions}
                                    },
                                    function(req, res, next, default_results, dresults1){
                                        var apiResponse = new configuration.jsonResponse(401,
                                            "TokenExpiredError: session jwt expired","Please, login again","",{"sessionid":new_sessionid});
                                        toolbox.logging('info',req,'webapp user authentication detected an expired user token.' +
                                            ' Refuse access to the expired user token','KO');
                                        return res.status(apiResponse.status).json(apiResponse);
                                    });
                            } else {
                                var apiResponse = new configuration.jsonResponse(401,
                                    "TokenExpiredError: jwt expired","Please, login again","",default_results);
                                toolbox.logging('info',req,'webapp user authentication detected an expired user token: ' +
                                    'refuse access to the expired user token','KO');
                                return res.status(apiResponse.status).json(apiResponse);
                            }

                        }
                    );
                } else{
                    genresponse.developerErrorMessage = "request is faking granted user";
                    genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
                    toolbox.logging('info',req,'webapp user authentication doesnt know this fraudulent user: refuse access to the fraudulent user token. the token validation errored out for the following reason: '+err,'KO');
                    genresponse.status = 401;
                    res.status(401).json(genresponse);
                }
            } else {
                // if everything is good, save to request for use in other routes
                if (!req.decoded){
                    req.decoded = {};
                }
                for (var key in decoded) {
                    req.decoded[key] = decoded[key];
                }
                //console.log('decoded token is: '+ JSON.stringify(decoded));
                toolbox.logging('info',req,'webapp user authentication know this user: grant access to the user: '+req.decoded.userid+' of roles '+req.decoded.roles);
                checkKeyInDB(Users, {username: req.decoded.userid, login_sessionid: token},req,res,next,"user session token",genresponse);
            }
        });
    } else {
        // if there is no token
        // return an error
        genresponse.developerErrorMessage = "this endpoint doesnt accept requests without access token";
        genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
        genresponse.status = 401;
        toolbox.logging('info',req,'webapp user authentication doesnt know this fraudulent user: refuse access to the fraudulent user token: '+token+'. the token validation errored out for the following reason: '+genresponse.developerErrorMessage,'KO');
        res.status(401).json(genresponse);
    }
}
middleware.check_userjwttoken = authorizeuser_toapi;

function authorizeuser_toendpoint(req, res, next) {
    // check header or url parameters or post parameters for token
    var genresponse = JSON.parse(JSON.stringify(configuration.json_response));
    var roles = req.decoded.roles.split(",");
    var check = false;
    var actionruleskey = req.method + " /" + req.url.split("/")[1];
    if (actionruleskey.indexOf("?")>=0) {
        actionruleskey = actionruleskey.split("?")[0]
    }
    toolbox.logging('debug',req,"actionruleskey: "+actionruleskey+" roles: "+roles);

    if (sec_policies.actionrules.hasOwnProperty(actionruleskey)) {
        toolbox.logging('debug',req,"endpoint rule found: "+sec_policies.actionrules[actionruleskey]);
        for (var idx in roles){
            toolbox.logging('debug',req,"checking role: "+roles[idx]);
            if (sec_policies.actionrules[actionruleskey].indexOf(roles[idx])>=0){
                check = true;
                break;
            }
        }
        toolbox.logging('debug',req,"endpoint access granted?: "+check);
        if (check){
            toolbox.logging('info',req,'webapp user roles validation: user '+req.decoded.userid+' of roles '+req.decoded.roles+' is known and have enough privileges to access the endpoint resources.');
            next();
        } else {
            genresponse.developerErrorMessage = "Your user roles dont allow you to access this endpoint";
            genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
            genresponse.status = 403;
            toolbox.logging('info',req,'webapp user roles validation: user '+req.decoded.userid+' of roles '+req.decoded.roles+' is known but doesnt have enough privileges to access this resources.','KO');
            res.status(403).json(genresponse);
        }
    } else {
        // if there is no token
        // return an error
        genresponse.developerErrorMessage = "Your user roles dont allow you to access this endpoint";
        genresponse.userErrorMessage = "(\\ _ /) NO NO NO (\\ _ /)";
        genresponse.status = 401;
        toolbox.logging('info',req,'webapp user roles validation: user '+req.decoded.userid+' of roles '+req.decoded.roles+' is known but doesnt have enough privileges to access this resources.','KO');
        res.status(401).json(genresponse);
    }
}
middleware.check_userroles = authorizeuser_toendpoint;

module.exports = middleware;
